import { useState, type ComponentProps } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DEMO_MENTOR_EMAIL,
  type MentorSession,
  type SignupRequest,
  validateSignup,
  verifyDemoMentor,
} from './auth/mentorAuth';

const ACCENTS = [
  '#FF0000',
  '#FFB020',
  '#3EE0FF',
  '#C8F54A',
  '#C084FC',
  '#FF7A90',
];

type Mode = 'login' | 'signup' | 'portal';

type Props = {
  accent: string;
  status: 'running' | 'stopped' | 'removed';
  selected: string[];
  onAccent: (c: string) => void;
  onStatus: (s: 'running' | 'stopped' | 'removed') => void;
  onSymbols: (s: string[]) => void;
  onClose: () => void;
  symbolsCatalog: readonly string[];
};

export function MentorsPortal({
  accent,
  status,
  selected,
  onAccent,
  onStatus,
  onSymbols,
  onClose,
  symbolsCatalog,
}: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [session, setSession] = useState<MentorSession | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<SignupRequest[]>([]);

  const [loginEmail, setLoginEmail] = useState(DEMO_MENTOR_EMAIL);
  const [loginPassword, setLoginPassword] = useState('');

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
      const ok = await verifyDemoMentor(loginEmail, loginPassword);
      if (!ok) {
        setError('invalid email or password');
        return;
      }
      setSession(ok);
      setMode('portal');
      setLoginPassword('');
    } finally {
      setBusy(false);
    }
  };

  const onSignup = () => {
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
    const req: SignupRequest = {
      email: suEmail.trim().toLowerCase(),
      mentorName: suMentor.trim(),
      name: suName.trim(),
      contact: suContact.trim(),
      createdAt: new Date().toISOString(),
    };
    setRequests((prev) => [req, ...prev]);
    setError('');
    setMode('login');
    setLoginEmail(req.email);
    setSuPassword('');
    setSuConfirm('');
    setError('signup request submitted — await approval (mock)');
  };

  const title =
    mode === 'login'
      ? 'mentors portal'
      : mode === 'signup'
        ? 'mentor signup'
        : 'mentor control';

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="close portal">
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {mode === 'login' ? (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field
            label="email"
            value={loginEmail}
            onChangeText={setLoginEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="password"
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry
          />
          <Pressable
            style={[styles.primary, { borderColor: accent, backgroundColor: rgba(accent, 0.2) }]}
            onPress={onLogin}
            disabled={busy}
          >
            <Text style={styles.primaryText}>{busy ? 'signing in…' : 'login'}</Text>
          </Pressable>
          <Pressable onPress={() => { setError(''); setMode('signup'); }}>
            <Text style={styles.link}>
              Don’t have account? <Text style={{ color: accent }}>Signup here</Text>
            </Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {mode === 'signup' ? (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field label="email" value={suEmail} onChangeText={setSuEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="mentor name" value={suMentor} onChangeText={setSuMentor} />
          <Field label="name" value={suName} onChangeText={setSuName} />
          <Field label="contact number" value={suContact} onChangeText={setSuContact} keyboardType="phone-pad" />
          <Field label="password" value={suPassword} onChangeText={setSuPassword} secureTextEntry />
          <Field label="confirm password" value={suConfirm} onChangeText={setSuConfirm} secureTextEntry />
          <Pressable
            style={[styles.primary, { borderColor: accent, backgroundColor: rgba(accent, 0.2) }]}
            onPress={onSignup}
          >
            <Text style={styles.primaryText}>submit</Text>
          </Pressable>
          <Pressable onPress={() => { setError(''); setMode('login'); }}>
            <Text style={styles.link}>back to login</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {mode === 'portal' && session ? (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.hello}>
            signed in as {session.mentorName} · {session.email}
          </Text>

          <Text style={styles.section}>session control</Text>
          <View style={styles.row}>
            <MiniBtn accent={accent} label="start" onPress={() => onStatus('running')} />
            <MiniBtn accent={accent} label="stop" onPress={() => onStatus('stopped')} />
            <MiniBtn accent={accent} label="remove" onPress={() => onStatus('removed')} />
          </View>
          <Text style={styles.meta}>status: {status}</Text>

          <Text style={styles.section}>theme accent</Text>
          <View style={styles.swatches}>
            {ACCENTS.map((c) => (
              <Pressable
                key={c}
                onPress={() => onAccent(c)}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: c,
                    borderColor: accent === c ? '#fff' : 'transparent',
                  },
                ]}
              />
            ))}
          </View>

          <Text style={styles.section}>symbols</Text>
          <View style={styles.chipWrap}>
            {symbolsCatalog.slice(0, 12).map((s) => {
              const on = selected.includes(s);
              return (
                <Pressable
                  key={s}
                  onPress={() =>
                    onSymbols(
                      on ? selected.filter((x) => x !== s) : [...selected, s],
                    )
                  }
                  style={[
                    styles.chip,
                    {
                      borderColor: accent,
                      backgroundColor: on ? rgba(accent, 0.25) : 'transparent',
                    },
                  ]}
                >
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              );
            })}
          </View>

          {requests.length ? (
            <>
              <Text style={styles.section}>pending signups (mock)</Text>
              {requests.map((r) => (
                <Text key={r.createdAt + r.email} style={styles.meta}>
                  {r.mentorName} · {r.email}
                </Text>
              ))}
            </>
          ) : null}

          <Pressable
            style={[styles.primary, { borderColor: accent, backgroundColor: rgba(accent, 0.2) }]}
            onPress={() => {
              setSession(null);
              setMode('login');
            }}
          >
            <Text style={styles.primaryText}>logout</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );
}

function Field({
  label,
  ...rest
}: {
  label: string;
} & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#777"
        style={styles.input}
        autoCorrect={false}
        {...rest}
      />
    </View>
  );
}

function MiniBtn({
  label,
  onPress,
  accent,
}: {
  label: string;
  onPress: () => void;
  accent: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.mini, { borderColor: accent, backgroundColor: rgba(accent, 0.18) }]}
    >
      <Text style={styles.miniText}>{label}</Text>
    </Pressable>
  );
}

function rgba(hex: string, a: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  error: { color: '#ff7a7a', fontSize: 13 },
  form: { gap: 10, paddingBottom: 12 },
  field: { gap: 4 },
  label: { color: '#aaa', fontSize: 12, textTransform: 'lowercase' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  primary: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: { color: '#fff', fontWeight: '700', textTransform: 'lowercase' },
  link: { color: '#bbb', textAlign: 'center', marginTop: 6, fontSize: 13 },
  hello: { color: '#ddd', fontSize: 13 },
  section: {
    color: '#fff',
    fontWeight: '700',
    textTransform: 'lowercase',
    marginTop: 6,
  },
  row: { flexDirection: 'row', gap: 8 },
  mini: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  miniText: { color: '#fff', fontWeight: '700', textTransform: 'lowercase' },
  meta: { color: '#999', fontSize: 12 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
