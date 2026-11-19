import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppState } from './AppState';

const RED = '#FF0000';
const BG = '#050505';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * Front door before EA control UI.
 * Collects Email + Name, then mock Access for Lumo Edge Pro — $35.
 */
export function AccessGateScreen() {
  const { unlockEaAccess } = useAppState();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'form' | 'paying'>('form');

  const onAccess = async () => {
    setError('');
    if (!name.trim()) {
      setError('Enter your name');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    setBusy(true);
    setPhase('paying');
    try {
      // Mock Stripe / checkout — demo unlock after a short delay.
      await new Promise((r) => setTimeout(r, 1100));
      await unlockEaAccess({ email: email.trim(), name: name.trim() });
    } catch {
      setError('Could not complete access — try again.');
      setPhase('form');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#2A0000', '#0A0A0A', BG]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require('../assets/mascot.jpg')}
            style={styles.mascot}
            resizeMode="contain"
          />
          <Text style={styles.brand}>EDGES</Text>
          <Text style={styles.product}>Lumo Edge Pro</Text>
          <Text style={styles.price}>$35</Text>
          <Text style={styles.tagline}>
            Step 1 of 2 — purchase Lumo Edge Pro access, then activate with your
            mentor license key.
          </Text>

          {phase === 'paying' ? (
            <View style={styles.paying}>
              <ActivityIndicator color={RED} size="large" />
              <Text style={styles.payingText}>Processing access…</Text>
              <Text style={styles.payingHint}>Mock checkout · Stripe not required</Text>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#6B7280"
                autoCapitalize="words"
                editable={!busy}
              />
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  pressed && { opacity: 0.85 },
                  busy && { opacity: 0.6 },
                ]}
                onPress={onAccess}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Access Lumo Edge Pro for 35 dollars"
              >
                <Text style={styles.ctaText}>Access · Lumo Edge Pro — $35</Text>
              </Pressable>
              <Text style={styles.fine}>
                Demo checkout — no real charge. Next you will enter a mentor
                license key to activate your EA (name, picture, symbols).
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
    alignItems: 'center',
  },
  mascot: {
    width: 112,
    height: 112,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: RED,
    marginBottom: 18,
    backgroundColor: '#000000',
  },
  brand: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 6,
  },
  product: {
    marginTop: 6,
    color: RED,
    fontSize: 20,
    fontWeight: '800',
  },
  price: {
    marginTop: 4,
    color: '#F9FAFB',
    fontSize: 42,
    fontWeight: '900',
  },
  tagline: {
    marginTop: 10,
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  form: {
    width: '100%',
    maxWidth: 360,
    marginTop: 28,
    gap: 8,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#12151C',
    borderWidth: 1,
    borderColor: '#2A2F3A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#fff',
    fontSize: 16,
  },
  error: { color: '#FF6B6B', fontSize: 13, marginTop: 4 },
  cta: {
    marginTop: 18,
    backgroundColor: RED,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  fine: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  paying: {
    marginTop: 48,
    alignItems: 'center',
    gap: 14,
  },
  payingText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  payingHint: { color: '#6B7280', fontSize: 12 },
});
