import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type BotStatus = 'running' | 'stopped' | 'removed';

const COLORS = {
  bg: '#050505',
  hero: '#C01018',
  panel: '#0A0A0A',
  border: '#E10600',
  borderDim: '#7A0A0A',
  text: '#F5F5F5',
  accent: '#FF1E1E',
  accentSoft: '#B81212',
  running: '#22C55E',
  stopped: '#EF4444',
  muted: '#9A9A9A',
};

export default function App() {
  const [status, setStatus] = useState<BotStatus>('running');

  const isActive = status === 'running';
  const statusLabel =
    status === 'running' ? 'running' : status === 'stopped' ? 'stopped' : 'removed';
  const statusColor =
    status === 'running'
      ? COLORS.running
      : status === 'stopped'
        ? COLORS.stopped
        : COLORS.muted;

  const onQuotes = () => {
    Alert.alert('Quotes', 'Mock quotes panel — no live market data wired yet.');
  };

  const onToggleRun = () => {
    if (status === 'removed') {
      setStatus('running');
      return;
    }
    setStatus((prev) => (prev === 'running' ? 'stopped' : 'running'));
  };

  const onRemove = () => {
    Alert.alert('Remove bot', 'Clear this control session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setStatus('removed'),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        <View style={styles.hero}>
          <Image
            source={require('./assets/mascot.jpg')}
            style={styles.mascot}
            resizeMode="cover"
          />
          <Text style={styles.title}>edges ea control</Text>
        </View>

        <View style={styles.panel}>
          <ControlButton
            label="quotes"
            onPress={onQuotes}
            icon={
              <MaterialCommunityIcons
                name="chart-line"
                size={28}
                color={COLORS.accent}
              />
            }
          />
          <ControlButton
            label={isActive ? 'stop' : 'start'}
            onPress={onToggleRun}
            large
            icon={
              <Ionicons
                name={isActive ? 'stop' : 'play'}
                size={32}
                color={COLORS.accent}
              />
            }
          />
          <ControlButton
            label="remove"
            onPress={onRemove}
            icon={
              <Ionicons name="trash-outline" size={26} color={COLORS.accent} />
            }
          />
        </View>

        <Text style={styles.powered}>
          powered by <Text style={styles.poweredBold}>edges hosting</Text>
        </Text>

        <View style={styles.statusPill}>
          <Image
            source={require('./assets/mascot.jpg')}
            style={styles.statusThumb}
          />
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>edges ea control</Text>
            <Text style={[styles.statusState, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ControlButton({
  label,
  icon,
  onPress,
  large = false,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  large?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlBtn,
        large && styles.controlBtnLarge,
        pressed && styles.controlBtnPressed,
      ]}
    >
      <View style={[styles.controlIcon, large && styles.controlIconLarge]}>
        {icon}
      </View>
      <Text style={styles.controlLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  hero: {
    width: '100%',
    backgroundColor: COLORS.hero,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  mascot: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  title: {
    marginTop: 10,
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'lowercase',
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1.5,
    borderRadius: 36,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  controlBtnLarge: {
    minWidth: 88,
  },
  controlBtnPressed: {
    opacity: 0.7,
  },
  controlIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIconLarge: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  controlLabel: {
    marginTop: 10,
    color: COLORS.accentSoft,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  powered: {
    marginTop: 16,
    color: COLORS.muted,
    fontSize: 13,
  },
  poweredBold: {
    color: COLORS.accentSoft,
    fontWeight: '700',
  },
  statusPill: {
    marginTop: 28,
    width: '100%',
    maxWidth: 420,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.borderDim,
    backgroundColor: '#0D0D0D',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusThumb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  statusState: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
});
