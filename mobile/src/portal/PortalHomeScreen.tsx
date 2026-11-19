import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ACCENTS, SYMBOLS, useAppState } from '../AppState';

const BG = '#0B0E14';
const SIDE = '#11151D';
const ACCENT = '#7C5CFF';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'mentors', label: 'Mentors' },
  { id: 'top-mentors', label: 'Top Mentors' },
  { id: 'manage-eas', label: 'Manage EAs' },
  { id: 'license-keys', label: 'License Keys' },
  { id: 'profile', label: 'Profile' },
  { id: 'settings', label: 'Settings' },
  { id: 'mentor-commission', label: 'Mentor Commission' },
  { id: 'self-hosting', label: 'Self Hosting' },
  { id: 'add-signal-direction', label: 'Add Signal Direction' },
] as const;

type NavId = (typeof NAV)[number]['id'];

export function PortalHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const {
    mentor,
    setMentor,
    status,
    setStatus,
    selected,
    setSelected,
    accent,
    setAccent,
  } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [section, setSection] = useState<NavId>('dashboard');

  useEffect(() => {
    if (!mentor) {
      router.replace('/portal');
    }
  }, [mentor, router]);

  useEffect(() => {
    const s = String(params.section || '');
    if (NAV.some((n) => n.id === s)) setSection(s as NavId);
  }, [params.section]);

  if (!mentor) {
    return <View style={styles.root} />;
  }

  const logout = () => {
    setMentor(null);
    router.replace('/portal');
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={styles.iconBtn}
          accessibilityLabel="open menu"
        >
          <Ionicons name="menu" size={22} color="#E5E7EB" />
        </Pressable>
        <Text style={styles.topTitle}>Mentors Portal</Text>
        <Pressable
          onPress={() => router.replace('/')}
          style={styles.iconBtn}
          accessibilityLabel="back to ea"
        >
          <Ionicons name="phone-portrait-outline" size={20} color="#E5E7EB" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>{NAV.find((n) => n.id === section)?.label}</Text>
        <Text style={styles.meta}>
          Signed in as {mentor.mentorName} · {mentor.email}
        </Text>

        {section === 'dashboard' || section === 'manage-eas' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>EA session control</Text>
            <Text style={styles.meta}>status: {status}</Text>
            <View style={styles.row}>
              <Action label="Start" onPress={() => setStatus('running')} />
              <Action label="Stop" onPress={() => setStatus('stopped')} />
              <Action label="Remove" onPress={() => setStatus('removed')} />
            </View>
            <Text style={[styles.cardTitle, { marginTop: 14 }]}>Theme accent</Text>
            <View style={styles.swatches}>
              {ACCENTS.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setAccent(c.value)}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: c.value,
                      borderColor: accent === c.value ? '#fff' : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.cardTitle, { marginTop: 14 }]}>Symbols</Text>
            <View style={styles.chips}>
              {SYMBOLS.slice(0, 12).map((s) => {
                const on = selected.includes(s);
                return (
                  <Pressable
                    key={s}
                    onPress={() =>
                      setSelected(
                        on ? selected.filter((x) => x !== s) : [...selected, s],
                      )
                    }
                    style={[
                      styles.chip,
                      on && { backgroundColor: 'rgba(124,92,255,0.25)', borderColor: ACCENT },
                    ]}
                  >
                    <Text style={styles.chipText}>{s}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{NAV.find((n) => n.id === section)?.label}</Text>
            <Text style={styles.meta}>
              Mock {section.replace(/-/g, ' ')} screen — Edges / Lumo Edge Pro branding.
              Wire live data later.
            </Text>
          </View>
        )}
      </ScrollView>

      {menuOpen ? (
        <View style={styles.drawerScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={styles.drawer}>
            <View style={styles.drawerHead}>
              <Image
                source={require('../../assets/mascot.jpg')}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>
                  {mentor.mentorName}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {mentor.email}
                </Text>
              </View>
              <Pressable onPress={() => setMenuOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#E5E7EB" />
              </Pressable>
            </View>

            <ScrollView>
              {NAV.map((item) => {
                const on = section === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setSection(item.id);
                      setMenuOpen(false);
                      router.setParams({ section: item.id });
                    }}
                    style={[styles.navItem, on && styles.navItemOn]}
                  >
                    <Text style={[styles.navText, on && styles.navTextOn]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
              <View style={styles.sep} />
              <Pressable onPress={logout} style={styles.navItem}>
                <Text style={styles.logout}>Logout</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.action}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  topTitle: { color: '#F9FAFB', fontWeight: '800', fontSize: 16 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151A24',
  },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  h1: { color: '#fff', fontSize: 24, fontWeight: '800' },
  meta: { color: '#9CA3AF', fontSize: 13 },
  card: {
    marginTop: 8,
    backgroundColor: '#12151C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 14,
    gap: 10,
  },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(124,92,255,0.18)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '700' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: '#E5E7EB', fontSize: 11, fontWeight: '600' },
  drawerScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
  },
  drawer: {
    width: '82%',
    height: '100%',
    backgroundColor: SIDE,
    paddingTop: 48,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: '#1F2937',
  },
  drawerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  userName: { color: '#fff', fontWeight: '800', fontSize: 15 },
  userEmail: { color: '#9CA3AF', fontSize: 11 },
  navItem: {
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  navItemOn: {
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(124,92,255,0.18)',
  },
  navText: { color: '#E5E7EB', fontSize: 15, fontWeight: '600' },
  navTextOn: { color: '#fff' },
  sep: {
    height: 1,
    backgroundColor: '#1F2937',
    marginVertical: 10,
  },
  logout: { color: '#FF3B3B', fontSize: 15, fontWeight: '800' },
});
