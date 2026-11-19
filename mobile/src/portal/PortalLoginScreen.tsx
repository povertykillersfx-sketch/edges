import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  DEMO_MENTOR_EMAIL,
  validateSignup,
  verifyDemoMentor,
} from '../auth/mentorAuth';
import { useAppState } from '../AppState';

const BLUE = '#3B82F6';
const BG = '#05070D';
const CARD = '#12151C';

type Tab = 'login' | 'register';

export function PortalLoginScreen() {
  const router = useRouter();
  const { setMentor } = useAppState();
  const [tab, setTab] = useState<Tab>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [email, setEmail] = useState(DEMO_MENTOR_EMAIL);
  const [password, setPassword] = useState('');

  const [suEmail, setSuEmail] = useState('');
  const [suMentor, setSuMentor] = useState('');
  const [suName, setSuName] = useState('');
  const [suContact, setSuContact] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirm, setSuConfirm] = useState('');

  const onLogin = async () => {
    setBusy(true);
    setError('');
    try {
      const ok = await verifyDemoMentor(email, password);
      if (!ok) {
        setError('Invalid email or password');
        return;
      }
      setMentor(ok);
      setPassword('');
      router.replace('/portal/dashboard');
    } finally {
      setBusy(false);
    }
  };

  const onRegister = () => {
    setError('');
    const invalid = validateSignup({
      email: suEmail,
      mentorName: suMentor,
      name: suName,
      contact: suContact,
      password: suPassword,
      confirm: suConfirm,
    });
    if (invalid) {
      setError(invalid);
      return;
    }
    setError('Signup submitted — sign in after Super Admin approves your mentor account.');
    setTab('login');
    setEmail(suEmail.trim().toLowerCase());
    setSuPassword('');
    setSuConfirm('');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/mascot.jpg')}
              style={styles.logo}
            />
          </View>
          <Text style={styles.title}>Mentors Portal</Text>
          <Text style={styles.subtitle}>
            Sign in after Super Admin has approved your mentor account.
          </Text>
          <Text style={styles.powered}>Edges · Lumo Edge Pro</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <Pressable
              onPress={() => { setTab('login'); setError(''); }}
              style={[styles.tab, tab === 'login' && styles.tabOn]}
            >
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextOn]}>
                Login
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setTab('register'); setError(''); }}
              style={[styles.tab, tab === 'register' && styles.tabOn]}
            >
              <Text
                style={[styles.tabText, tab === 'register' && styles.tabTextOn]}
              >
                Register
              </Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {tab === 'login' ? (
            <View style={styles.form}>
              <Field
                label="EMAIL *"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Field
                label="PASSWORD *"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPw}
                right={
                  <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                    <Ionicons
                      name={showPw ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#9CA3AF"
                    />
                  </Pressable>
                }
              />
              <Pressable onPress={() => setError('Password reset is mock-only.')}>
                <Text style={styles.forgot}>Forgot your password?</Text>
              </Pressable>
              <Pressable
                style={styles.primary}
                onPress={onLogin}
                disabled={busy}
              >
                <Text style={styles.primaryText}>
                  {busy ? 'Signing in…' : 'Login'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <Field label="EMAIL *" value={suEmail} onChangeText={setSuEmail} placeholder="Enter your email" autoCapitalize="none" keyboardType="email-address" />
              <Field label="MENTOR NAME *" value={suMentor} onChangeText={setSuMentor} placeholder="Mentor display name" />
              <Field label="NAME *" value={suName} onChangeText={setSuName} placeholder="Full name" />
              <Field label="CONTACT NUMBER *" value={suContact} onChangeText={setSuContact} placeholder="Phone" keyboardType="phone-pad" />
              <Field label="PASSWORD *" value={suPassword} onChangeText={setSuPassword} placeholder="Create password" secureTextEntry />
              <Field label="CONFIRM PASSWORD *" value={suConfirm} onChangeText={setSuConfirm} placeholder="Confirm password" secureTextEntry />
              <Pressable style={styles.primary} onPress={onRegister}>
                <Text style={styles.primaryText}>Submit</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  right,
  ...rest
}: {
  label: string;
  right?: ReactNode;
} & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor="#6B7280"
          style={styles.input}
          autoCorrect={false}
          {...rest}
        />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { padding: 20, paddingBottom: 40 },
  brand: { alignItems: 'center', marginTop: 28, marginBottom: 22 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BLUE,
    marginBottom: 14,
  },
  logo: { width: '100%', height: '100%' },
  title: {
    color: BLUE,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: '#E5E7EB',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  powered: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 11,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.35)',
    padding: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#0B0E14',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabOn: { backgroundColor: BLUE },
  tabText: { color: '#9CA3AF', fontWeight: '700' },
  tabTextOn: { color: '#041018' },
  error: { color: '#FCA5A5', marginBottom: 10, fontSize: 13 },
  form: { gap: 12 },
  field: { gap: 6 },
  label: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#0B0E14',
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    fontSize: 15,
  },
  forgot: {
    color: BLUE,
    textDecorationLine: 'underline',
    fontSize: 13,
    alignSelf: 'flex-start',
  },
  primary: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: {
    color: '#041018',
    fontWeight: '800',
    fontSize: 16,
  },
});
