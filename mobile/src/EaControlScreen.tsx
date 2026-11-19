import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AccessGateScreen } from './AccessGateScreen';
import { LicenseActivateScreen } from './LicenseActivateScreen';
import { useAppState, ACCENTS, SYMBOLS, type BotStatus } from './AppState';

type Sheet =
  | 'none'
  | 'quotes'
  | 'settings'
  | 'scanner'
  | 'calendar'
  | 'broker';

type BottomTab = 'home' | 'scanner' | 'broker';

const BASE = {
  black: '#000000',
  white: '#FFFFFF',
  green: '#00FF00',
  muted: '#9A9A9A',
  glass: 'rgba(8, 8, 8, 0.78)',
};

const EVENTS = [
  { day: 3, title: 'NFP week preview', time: 'all day' },
  { day: 7, title: 'ECB speakers', time: '09:00' },
  { day: 12, title: 'CPI release', time: '13:30' },
  { day: 18, title: 'FOMC minutes', time: '19:00' },
  { day: 24, title: 'Gold volatility watch', time: 'open' },
  { day: 28, title: 'Month-end flows', time: '16:00' },
];

const PHONE_W = 390;
const PHONE_H = 844;

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function EaControlRoot() {
  const { width, height } = useWindowDimensions();
  const { eaAccess, activeEa, accessReady } = useAppState();
  const isWebDesktop = Platform.OS === 'web' && width > 500;

  // 1) $35 access → 2) license key → 3) control UI (no demo skip)
  const phone = !accessReady ? (
    <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ color: '#9A9A9A' }}>Loading…</Text>
    </View>
  ) : !eaAccess ? (
    <AccessGateScreen />
  ) : !activeEa ? (
    <LicenseActivateScreen />
  ) : (
    <EaControlScreen />
  );

  if (!isWebDesktop) return phone;

  // Fit without CSS transform — scale() breaks web click hit-testing.
  const fit = Math.min((height - 48) / PHONE_H, (width - 48) / PHONE_W, 1);
  const frameW = Math.round(PHONE_W * fit);
  const frameH = Math.round(PHONE_H * fit);
  return (
    <View style={styles.webStage}>
      <View style={[styles.phoneChrome, { width: frameW, height: frameH }]}>
        <View style={styles.notch} />
        {phone}
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

export function EaControlScreen() {
  const router = useRouter();
  const {
    status,
    setStatus,
    selected,
    setSelected,
    accent,
    setAccent,
    activeEa,
    clearActiveEa,
  } = useAppState();
  const eaTitle = activeEa?.name?.trim() || 'edges ea control';
  const eaPicture =
    activeEa?.pictureUri &&
    (activeEa.pictureUri.startsWith('data:') ||
      activeEa.pictureUri.startsWith('blob:') ||
      activeEa.pictureUri.startsWith('http') ||
      activeEa.pictureUri.startsWith('file:') ||
      activeEa.pictureUri.startsWith('/'))
      ? { uri: activeEa.pictureUri }
      : require('../assets/mascot.jpg');
  const [sheet, setSheet] = useState<Sheet>('none');
  const [bottomTab, setBottomTab] = useState<BottomTab>('home');
  const [query, setQuery] = useState('');
  const [scanSymbol, setScanSymbol] = useState('XAUUSD');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [calMonth] = useState(() => new Date());
  const [pickedDay, setPickedDay] = useState<number | null>(12);
  const [brokerConnected, setBrokerConnected] = useState(false);
  /** Triple-tap the logo (hero image) → Mentors Portal — not Settings. */
  const logoTaps = useRef<{ count: number; at: number }>({
    count: 0,
    at: 0,
  });

  const isActive = status === 'running';
  const statusLabel =
    status === 'running' ? 'running' : status === 'stopped' ? 'stopped' : 'removed';
  const statusColor =
    status === 'running'
      ? BASE.green
      : status === 'stopped'
        ? accent
        : BASE.muted;

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return [...SYMBOLS];
    return SYMBOLS.filter((s) => s.includes(q));
  }, [query]);

  const monthLabel = calMonth.toLocaleString('en', {
    month: 'long',
    year: 'numeric',
  });
  const daysInMonth = new Date(
    calMonth.getFullYear(),
    calMonth.getMonth() + 1,
    0,
  ).getDate();
  const startPad = new Date(
    calMonth.getFullYear(),
    calMonth.getMonth(),
    1,
  ).getDay();
  const dayEvents = EVENTS.filter((e) => e.day === pickedDay);

  const sheetTitle =
    sheet === 'quotes'
      ? 'quotes'
      : sheet === 'scanner'
        ? 'chart scanner'
        : sheet === 'calendar'
          ? 'events calendar'
          : sheet === 'broker'
            ? 'connect your broker'
            : 'settings';

  const closeSheet = () => {
    setSheet('none');
    setBottomTab('home');
  };
  const backToSettings = () => setSheet('settings');

  const onBottomTab = (tab: BottomTab) => {
    setBottomTab(tab);
    if (tab === 'home') {
      setSheet('none');
      return;
    }
    if (tab === 'scanner') {
      setScanResult(null);
      setSheet('scanner');
      return;
    }
    setSheet('broker');
  };

  const onSettingsPress = () => setSheet('settings');

  /** Triple-tap logo within 900ms → Mentors Portal (mobile Safari–friendly) */
  const onLogoPress = () => {
    const now = Date.now();
    if (now - logoTaps.current.at > 900) {
      logoTaps.current = { count: 1, at: now };
    } else {
      logoTaps.current = {
        count: logoTaps.current.count + 1,
        at: now,
      };
    }
    if (logoTaps.current.count >= 3) {
      logoTaps.current = { count: 0, at: 0 };
      router.push('/portal');
    }
  };

  const toggleSymbol = (sym: string) => {
    setSelected(
      selected.includes(sym)
        ? selected.filter((s) => s !== sym)
        : [...selected, sym],
    );
  };

  const onToggleRun = () => {
    if (status === 'removed') {
      setStatus('running');
      return;
    }
    setStatus(status === 'running' ? 'stopped' : 'running');
  };

  const onRemove = () => {
    Alert.alert(
      'Remove bot',
      'Clear this licensed EA session? You will need the license key again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setStatus('removed');
            void clearActiveEa();
          },
        },
      ],
    );
  };

  const runScan = () => {
    const bias = ['buy', 'sell', 'range'][Math.floor(Math.random() * 3)];
    const conf = 62 + Math.floor(Math.random() * 33);
    setScanResult(`${scanSymbol} · ${bias} bias · ${conf}% confidence (mock)`);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={[styles.hero, { backgroundColor: accent }]} pointerEvents="box-none">
        <View
          style={[styles.heroFill, { backgroundColor: accent }]}
          pointerEvents="none"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edges logo — triple tap for Mentors Portal"
          onPress={onLogoPress}
          hitSlop={20}
          style={({ pressed }) => [
            styles.logoHit,
            Platform.OS === 'web'
              ? ({ cursor: 'pointer', touchAction: 'manipulation' } as object)
              : null,
            pressed && { opacity: 0.92 },
          ]}
        >
          <Image
            source={eaPicture}
            style={styles.mascot}
            resizeMode={
              activeEa?.pictureUri ? 'cover' : 'contain'
            }
          />
        </Pressable>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)', BASE.black]}
          locations={[0.55, 0.82, 1]}
          style={styles.heroFade}
          pointerEvents="none"
        />
        <Text style={styles.title} pointerEvents="none">
          {eaTitle}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="settings"
        onPress={onSettingsPress}
        style={({ pressed }) => [
          styles.settingsBtn,
          { borderColor: accent },
          Platform.OS === 'web'
            ? ({ boxShadow: `0 0 12px ${hexToRgba(accent, 0.55)}` } as object)
            : null,
          pressed && { opacity: 0.75 },
        ]}
        hitSlop={12}
      >
        <Ionicons name="settings-outline" size={20} color={BASE.white} />
      </Pressable>

      <View style={styles.lower}>
        <Glass accent={accent} style={styles.controlGlass} contentStyle={styles.controlRow}>
          <Control
            accent={accent}
            label="quotes"
            onPress={() => {
              setQuery('');
              setSheet('quotes');
            }}
            icon={
              <MaterialCommunityIcons name="chart-line" size={22} color={accent} />
            }
          />
          <Control
            accent={accent}
            label={isActive ? 'stop' : 'start'}
            onPress={onToggleRun}
            large
            lit={isActive}
            icon={
              <Ionicons
                name={isActive ? 'stop' : 'play'}
                size={28}
                color={accent}
              />
            }
          />
          <Control
            accent={accent}
            label="remove"
            onPress={onRemove}
            icon={<Ionicons name="trash-outline" size={22} color={accent} />}
          />
        </Glass>

        <Text style={styles.powered}>
          powered by{' '}
          <Text style={[styles.poweredBrand, { color: accent }]}>
            lumo edge pro
          </Text>
        </Text>

        {selected.length > 0 ? (
          <Text style={styles.symbolHint} numberOfLines={1}>
            {selected.join(' · ')}
          </Text>
        ) : (
          <Text style={styles.symbolHint}>no symbols selected</Text>
        )}

        <Glass accent={accent} style={styles.statusGlass} contentStyle={styles.statusRow}>
          <Pressable
            onPress={onLogoPress}
            accessibilityRole="button"
            accessibilityLabel="Edges logo — triple tap for Mentors Portal"
            hitSlop={8}
          >
            <Image
              source={eaPicture}
              style={[styles.statusThumb, { borderColor: accent }]}
            />
          </Pressable>
          <View style={styles.statusText}>
            <Text style={styles.statusTitle} numberOfLines={1}>
              {eaTitle}
            </Text>
            <Text style={[styles.statusState, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </Glass>

        <View
          style={[
            styles.bottomBar,
            { borderColor: hexToRgba(accent, 0.55) },
            Platform.OS === 'web'
              ? ({ boxShadow: `0 0 14px ${hexToRgba(accent, 0.25)}` } as object)
              : null,
          ]}
        >
          <BottomNavItem
            accent={accent}
            active={bottomTab === 'home'}
            label="Home"
            icon="home-outline"
            onPress={() => onBottomTab('home')}
          />
          <BottomNavItem
            accent={accent}
            active={bottomTab === 'scanner'}
            label="Chart scanner"
            icon="scan-outline"
            onPress={() => onBottomTab('scanner')}
          />
          <BottomNavItem
            accent={accent}
            active={bottomTab === 'broker'}
            label="Connect your broker"
            icon="link-outline"
            onPress={() => onBottomTab('broker')}
          />
        </View>
      </View>

      <Modal
        visible={sheet !== 'none'}
        animationType="slide"
        transparent
        onRequestClose={closeSheet}
      >
        <View style={styles.modalBackdrop}>
          <Glass accent={accent} style={styles.sheet} contentStyle={styles.sheetBody}>

              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderLeft}>
                  {sheet === 'scanner' ||
                  sheet === 'calendar' ||
                  sheet === 'broker' ? (
                    <Pressable
                      accessibilityLabel="back"
                      onPress={() => {
                        if (sheet === 'scanner' || sheet === 'broker') {
                          closeSheet();
                        } else {
                          backToSettings();
                        }
                      }}
                      hitSlop={10}
                      style={styles.backBtn}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={22}
                        color={BASE.white}
                      />
                    </Pressable>
                  ) : null}
                  <Text style={styles.sheetTitle}>{sheetTitle}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="close"
                  onPress={closeSheet}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={22} color={BASE.white} />
                </Pressable>
              </View>

            {sheet === 'quotes' ? (
              <QuotesPanel
                accent={accent}
                query={query}
                setQuery={setQuery}
                filtered={filtered}
                selected={selected}
                toggleSymbol={toggleSymbol}
                onDone={closeSheet}
              />
            ) : null}

            {sheet === 'settings' ? (
              <ScrollView
                style={styles.settingsScroll}
                contentContainerStyle={styles.settingsBody}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.sectionLabel}>app colour</Text>
                <View style={styles.swatchRow}>
                  {ACCENTS.map((c) => {
                    const on = accent === c.value;
                    return (
                      <Pressable
                        key={c.id}
                        accessibilityLabel={c.label}
                        onPress={() => setAccent(c.value)}
                        style={[
                          styles.swatch,
                          {
                            backgroundColor: c.value,
                            borderColor: on ? BASE.white : 'transparent',
                          },
                        ]}
                      />
                    );
                  })}
                </View>
                <Text style={styles.settingsHint}>
                  accent updates borders, controls, and powered-by highlight
                </Text>

                <Text style={[styles.sectionLabel, { marginTop: 8 }]}>
                  tools
                </Text>
                <SettingsLink
                  accent={accent}
                  icon="scan-outline"
                  title="chart scanner"
                  subtitle="mock bias scan for a symbol"
                  onPress={() => {
                    setScanResult(null);
                    setSheet('scanner');
                  }}
                />
                <SettingsLink
                  accent={accent}
                  icon="calendar-outline"
                  title="events calendar"
                  subtitle="economic / session events"
                  onPress={() => setSheet('calendar')}
                />

                <Text style={styles.settingsLine}>
                  symbols: {selected.length ? selected.join(', ') : 'none'}
                </Text>
                <Text style={styles.settingsLine}>session: {statusLabel}</Text>

                <Pressable
                  style={[
                    styles.doneBtn,
                    {
                      borderColor: accent,
                      backgroundColor: hexToRgba(accent, 0.18),
                    },
                  ]}
                  onPress={closeSheet}
                >
                  <Text style={styles.doneText}>close</Text>
                </Pressable>
              </ScrollView>
            ) : null}

            {sheet === 'scanner' ? (
              <View style={styles.toolBody}>
                <Text style={styles.settingsHint}>
                  mock scanner — no live chart feed
                </Text>
                <View
                  style={[styles.searchBox, { borderColor: accent }]}
                >
                  <Ionicons name="search" size={16} color={BASE.muted} />
                  <TextInput
                    value={scanSymbol}
                    onChangeText={(t) => setScanSymbol(t.toUpperCase())}
                    placeholder="symbol"
                    placeholderTextColor={BASE.muted}
                    autoCapitalize="characters"
                    style={styles.searchInput}
                  />
                </View>
                <View style={styles.chipRow}>
                  {['XAUUSD', 'EURUSD', 'BTCUSD', 'NAS100'].map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setScanSymbol(s)}
                      style={[
                        styles.chip,
                        {
                          borderColor: accent,
                          backgroundColor:
                            scanSymbol === s
                              ? hexToRgba(accent, 0.22)
                              : 'transparent',
                        },
                      ]}
                    >
                      <Text style={styles.chipText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  style={[
                    styles.doneBtn,
                    {
                      borderColor: accent,
                      backgroundColor: hexToRgba(accent, 0.18),
                    },
                  ]}
                  onPress={runScan}
                >
                  <Text style={styles.doneText}>run scan</Text>
                </Pressable>
                {scanResult ? (
                  <View
                    style={[
                      styles.scanCard,
                      {
                        borderColor: accent,
                        backgroundColor: hexToRgba(accent, 0.12),
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="chart-bell-curve-cumulative"
                      size={22}
                      color={accent}
                    />
                    <Text style={styles.scanResult}>{scanResult}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {sheet === 'broker' ? (
              <View style={styles.toolBody}>
                <Text style={styles.settingsHint}>
                  Link a broker account so Edges can sync sessions (demo
                  connect — no live credentials stored).
                </Text>
                <View
                  style={[
                    styles.scanCard,
                    {
                      borderColor: accent,
                      backgroundColor: hexToRgba(accent, 0.12),
                      marginTop: 8,
                    },
                  ]}
                >
                  <Ionicons
                    name={brokerConnected ? 'checkmark-circle' : 'business-outline'}
                    size={22}
                    color={accent}
                  />
                  <Text style={styles.scanResult}>
                    {brokerConnected
                      ? 'Broker linked · demo MT5 · Edges session ready'
                      : 'No broker linked yet'}
                  </Text>
                </View>
                {['MetaTrader 5', 'MetaTrader 4', 'cTrader'].map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => setBrokerConnected(true)}
                    style={[
                      styles.brokerRow,
                      { borderColor: hexToRgba(accent, 0.45) },
                    ]}
                  >
                    <Text style={styles.brokerName}>{b}</Text>
                    <Text style={[styles.brokerAction, { color: accent }]}>
                      {brokerConnected ? 'linked' : 'connect'}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[
                    styles.doneBtn,
                    {
                      borderColor: accent,
                      backgroundColor: hexToRgba(accent, 0.18),
                      marginTop: 8,
                    },
                  ]}
                  onPress={closeSheet}
                >
                  <Text style={styles.doneText}>done</Text>
                </Pressable>
              </View>
            ) : null}

            {sheet === 'calendar' ? (
              <ScrollView contentContainerStyle={styles.toolBody}>
                <Text style={styles.monthLabel}>{monthLabel}</Text>
                <View style={styles.weekHeader}>
                  {['s', 'm', 't', 'w', 't', 'f', 's'].map((d, i) => (
                    <Text key={`${d}-${i}`} style={styles.weekDay}>
                      {d}
                    </Text>
                  ))}
                </View>
                <View style={styles.calGrid}>
                  {Array.from({ length: startPad }).map((_, i) => (
                    <View key={`pad-${i}`} style={styles.calCell} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                    (day) => {
                      const has = EVENTS.some((e) => e.day === day);
                      const on = pickedDay === day;
                      return (
                        <Pressable
                          key={day}
                          onPress={() => setPickedDay(day)}
                          style={[
                            styles.calCell,
                            styles.calDay,
                            on && {
                              borderColor: accent,
                              backgroundColor: hexToRgba(accent, 0.25),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.calDayText,
                              on && { color: BASE.white, fontWeight: '700' },
                            ]}
                          >
                            {day}
                          </Text>
                          {has ? (
                            <View
                              style={[
                                styles.calDot,
                                { backgroundColor: accent },
                              ]}
                            />
                          ) : null}
                        </Pressable>
                      );
                    },
                  )}
                </View>
                <Text style={styles.sectionLabel}>
                  {pickedDay ? `day ${pickedDay}` : 'pick a day'}
                </Text>
                {dayEvents.length ? (
                  dayEvents.map((e) => (
                    <View
                      key={`${e.day}-${e.title}`}
                      style={[styles.eventRow, { borderColor: accent }]}
                    >
                      <Text style={styles.eventTitle}>{e.title}</Text>
                      <Text style={styles.eventTime}>{e.time}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.settingsHint}>no events this day</Text>
                )}
              </ScrollView>
            ) : null}
          </Glass>
        </View>
      </Modal>
    </View>
  );
}

function QuotesPanel({
  accent,
  query,
  setQuery,
  filtered,
  selected,
  toggleSymbol,
  onDone,
}: {
  accent: string;
  query: string;
  setQuery: (v: string) => void;
  filtered: string[];
  selected: string[];
  toggleSymbol: (s: string) => void;
  onDone: () => void;
}) {
  return (
    <>
      <View style={[styles.searchBox, { borderColor: accent }]}>
        <Ionicons name="search" size={16} color={BASE.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="search symbols"
          placeholderTextColor={BASE.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          style={styles.searchInput}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        style={styles.symbolList}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>no symbols match</Text>
        }
        renderItem={({ item }) => {
          const on = selected.includes(item);
          return (
            <Pressable
              onPress={() => toggleSymbol(item)}
              style={({ pressed }) => [
                styles.symbolRow,
                on && { backgroundColor: hexToRgba(accent, 0.12) },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.symbolCode}>{item}</Text>
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={on ? BASE.green : BASE.muted}
              />
            </Pressable>
          );
        }}
      />
      <Pressable
        style={[
          styles.doneBtn,
          {
            borderColor: accent,
            backgroundColor: hexToRgba(accent, 0.18),
          },
        ]}
        onPress={onDone}
      >
        <Text style={styles.doneText}>
          done · {selected.length} selected
        </Text>
      </Pressable>
    </>
  );
}

function BottomNavItem({
  accent,
  active,
  label,
  icon,
  onPress,
}: {
  accent: string;
  active: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.bottomItem,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={active ? accent : BASE.muted}
      />
      <Text
        style={[
          styles.bottomLabel,
          { color: active ? accent : BASE.muted },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SettingsLink({
  accent,
  icon,
  title,
  subtitle,
  onPress,
}: {
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkRow,
        { borderColor: accent },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.linkIcon, { backgroundColor: hexToRgba(accent, 0.2) }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={BASE.muted} />
    </Pressable>
  );
}

function Glass({
  children,
  style,
  contentStyle,
  accent,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accent: string;
}) {
  return (
    <View
      style={[
        styles.glassOuter,
        { borderColor: accent },
        Platform.OS === 'web'
          ? ({
              boxShadow: `0 0 14px ${hexToRgba(accent, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.06)`,
            } as object)
          : null,
        style,
      ]}
    >
      <BlurView
        intensity={Platform.OS === 'web' ? 22 : 48}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glassFill} />
      <View style={[styles.glassInner, contentStyle]}>{children}</View>
    </View>
  );
}

function Control({
  label,
  icon,
  onPress,
  large = false,
  lit = false,
  accent,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  large?: boolean;
  lit?: boolean;
  accent: string;
}) {
  const size = large ? 72 : 54;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.control, pressed && { opacity: 0.75 }]}
    >
      <View
        style={[
          styles.ring,
          {
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            borderColor: accent,
            backgroundColor: hexToRgba(accent, lit ? 0.22 : 0.1),
          },
          Platform.OS === 'web'
            ? ({
                boxShadow: lit
                  ? `0 0 16px ${hexToRgba(accent, 0.85)}`
                  : `0 0 10px ${hexToRgba(accent, 0.55)}`,
              } as object)
            : null,
        ]}
      >
        <LinearGradient
          colors={[
            hexToRgba(accent, 0.45),
            'rgba(20,0,0,0.92)',
            'rgba(0,0,0,1)',
          ]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: hexToRgba(accent, 0.55),
            overflow: 'hidden',
          }}
        >
          <View style={styles.sheen} />
          {icon}
        </LinearGradient>
      </View>
      <Text style={[styles.controlLabel, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  webStage: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneChrome: {
    backgroundColor: BASE.black,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 10,
    borderColor: '#0a0a0a',
    ...Platform.select({
      web: { boxShadow: '0 24px 80px rgba(0,0,0,0.65)' } as object,
      default: {},
    }),
  },
  notch: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -60,
    width: 120,
    height: 28,
    borderRadius: 18,
    backgroundColor: '#0a0a0a',
    zIndex: 20,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -60,
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    zIndex: 20,
  },
  root: { flex: 1, backgroundColor: BASE.black },
  hero: {
    height: '54%',
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  heroFill: { ...StyleSheet.absoluteFill },
  logoHit: {
    ...StyleSheet.absoluteFill,
    zIndex: 25,
    elevation: 25,
  },
  mascot: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
    backgroundColor: '#0A0A0A',
  },
  heroFade: { ...StyleSheet.absoluteFill },
  title: {
    position: 'absolute',
    bottom: 14,
    color: BASE.white,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'lowercase',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  settingsBtn: {
    position: 'absolute',
    top: 48,
    right: 14,
    zIndex: 30,
    elevation: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1.5,
  },
  lower: {
    flex: 1,
    backgroundColor: BASE.black,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  bottomBar: {
    width: '100%',
    maxWidth: 420,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: 'rgba(8, 8, 8, 0.92)',
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
    minHeight: 56,
  },
  bottomLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  brokerRow: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  brokerName: {
    color: BASE.white,
    fontSize: 15,
    fontWeight: '700',
  },
  brokerAction: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  glassOuter: {
    width: '100%',
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: BASE.glass,
  },
  glassFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  glassInner: { zIndex: 1 },
  controlGlass: { borderRadius: 999, maxWidth: 420 },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  control: { alignItems: 'center', minWidth: 70 },
  ring: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: '40%',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  controlLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  powered: { marginTop: 2, color: BASE.muted, fontSize: 12 },
  poweredBrand: { fontWeight: '700' },
  symbolHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    letterSpacing: 0.3,
    maxWidth: 340,
    textAlign: 'center',
  },
  statusGlass: {
    marginTop: 'auto',
    marginBottom: 2,
    borderRadius: 999,
    maxWidth: 420,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  statusThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  statusText: { flex: 1 },
  statusTitle: {
    color: BASE.white,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  statusState: {
    marginTop: 1,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  sheet: { borderRadius: 28, maxHeight: '82%' },
  sheetBody: { padding: 16, gap: 12 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  backBtn: { marginRight: 2 },
  sheetTitle: {
    color: BASE.white,
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  searchInput: {
    flex: 1,
    color: BASE.white,
    fontSize: 15,
    paddingVertical: 4,
    minHeight: 28,
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none', outlineWidth: 0 } as object)
      : null),
  },
  symbolList: { maxHeight: 300 },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  symbolCode: {
    color: BASE.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  empty: {
    color: BASE.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  doneBtn: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneText: {
    color: BASE.white,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  settingsScroll: { maxHeight: 480 },
  settingsBody: { gap: 10, paddingBottom: 8 },
  settingsLine: { color: BASE.muted, fontSize: 13 },
  settingsHint: { color: BASE.muted, fontSize: 12, lineHeight: 16 },
  sectionLabel: {
    color: BASE.white,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'lowercase',
    letterSpacing: 0.4,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: {
    color: BASE.white,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  linkSub: { color: BASE.muted, fontSize: 12, marginTop: 2 },
  toolBody: { gap: 12, paddingBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: BASE.white, fontSize: 12, fontWeight: '600' },
  scanCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanResult: { color: BASE.white, flex: 1, fontSize: 14, fontWeight: '600' },
  monthLabel: {
    color: BASE.white,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  weekHeader: { flexDirection: 'row' },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: BASE.muted,
    fontSize: 11,
    textTransform: 'lowercase',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDay: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  calDayText: { color: BASE.muted, fontSize: 13 },
  calDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  eventRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  eventTitle: { color: BASE.white, fontWeight: '700', fontSize: 14 },
  eventTime: { color: BASE.muted, marginTop: 4, fontSize: 12 },
});
