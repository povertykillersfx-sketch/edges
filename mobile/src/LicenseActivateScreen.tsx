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

/**
 * After Lumo Edge Pro $35 access — require a mentor-issued license key
 * before opening EA control. Activating syncs that EA's name / picture / symbols.
 */
export function LicenseActivateScreen() {
  const { eaAccess, activateLicenseKey, licenseKeys } = useAppState();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onActivate = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await activateLicenseKey(key);
      if (!result.ok) setError(result.error);
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
            resizeMode="cover"
          />
          <Text style={styles.brand}>EDGES</Text>
          <Text style={styles.product}>Activate your EA</Text>
          <Text style={styles.tagline}>
            {eaAccess
              ? `Hi ${eaAccess.name} — enter the license key your mentor generated for your robot.`
              : 'Enter the license key your mentor generated for your robot.'}
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>LICENSE KEY</Text>
            <TextInput
              style={styles.input}
              value={key}
              onChangeText={setKey}
              placeholder="EDGES-XXXX-XXXX-XXXX-XXXX"
              placeholderTextColor="#6B7280"
              autoCapitalize="characters"
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
              onPress={onActivate}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Activate license key"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>Activate EA</Text>
              )}
            </Pressable>
            <Text style={styles.fine}>
              Mentors create keys under Mentors Portal → Manage EAs → License
              Keys. No demo unlock — a real key is required.
              {licenseKeys.length === 0
                ? ' No keys issued on this device yet.'
                : ` ${licenseKeys.length} key(s) available on this device.`}
            </Text>
          </View>
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
    fontSize: 22,
    fontWeight: '800',
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
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  error: { color: '#FF6B6B', fontSize: 13, marginTop: 4 },
  cta: {
    marginTop: 18,
    backgroundColor: RED,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
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
});
