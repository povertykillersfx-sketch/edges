import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type BotStatus = 'running' | 'stopped' | 'removed';

const COLORS = {
  bg: '#000000',
  hero: '#FF0000',
  glass: 'rgba(12, 12, 12, 0.55)',
  glassSolid: 'rgba(18, 18, 18, 0.82)',
  border: '#FF0000',
  text: '#FFFFFF',
  accent: '#FF0000',
  running: '#00FF55',
  stopped: '#FF0000',
  muted: '#B0B0B0',
  glossTop: 'rgba(255, 80, 80, 0.35)',
  glossMid: 'rgba(20, 0, 0, 0.85)',
  glossBot: 'rgba(0, 0, 0, 0.95)',
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
      <LinearGradient
        colors={['#1A0000', '#000000', '#000000']}
        style={styles.screen}
      >
        <View style={styles.hero}>
          <LinearGradient
            colors={['#FF1A1A', '#FF0000', '#CC0000']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.mascotGlow}>
            <Image
              source={require('./assets/mascot.jpg')}
              style={styles.mascot}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>edges ea control</Text>
        </View>

        <GlassPanel style={styles.panelShell} contentStyle={styles.panelContent}>
          <ControlButton
            label="quotes"
            onPress={onQuotes}
            icon={
              <MaterialCommunityIcons
                name="chart-line"
                size={26}
                color={COLORS.accent}
              />
            }
          />
          <ControlButton
            label={isActive ? 'stop' : 'start'}
            onPress={onToggleRun}
            large
            active={isActive}
            icon={
              <Ionicons
                name={isActive ? 'stop' : 'play'}
                size={30}
                color={COLORS.accent}
              />
            }
          />
          <ControlButton
            label="remove"
            onPress={onRemove}
            icon={
              <Ionicons name="trash-outline" size={24} color={COLORS.accent} />
            }
          />
        </GlassPanel>

        <Text style={styles.powered}>
          powered by <Text style={styles.poweredBold}>edges hosting</Text>
        </Text>

        <GlassPanel
          style={styles.statusShell}
          contentStyle={styles.statusContent}
        >
          <View style={styles.statusThumbWrap}>
            <Image
              source={require('./assets/mascot.jpg')}
              style={styles.statusThumb}
            />
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>edges ea control</Text>
            <Text style={[styles.statusState, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </GlassPanel>
      </LinearGradient>
    </SafeAreaView>
  );
}

function GlassPanel({
  children,
  style,
  contentStyle,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.glassOuter, style]}>
      <BlurView
        intensity={Platform.OS === 'web' ? 28 : 40}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glassTint} />
      <View style={[styles.glassContent, contentStyle]}>{children}</View>
    </View>
  );
}

function ControlButton({
  label,
  icon,
  onPress,
  large = false,
  active = false,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  large?: boolean;
  active?: boolean;
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
      <View
        style={[
          styles.controlRing,
          large && styles.controlRingLarge,
          active && styles.controlRingActive,
        ]}
      >
        <LinearGradient
          colors={[COLORS.glossTop, COLORS.glossMid, COLORS.glossBot]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.controlIcon, large && styles.controlIconLarge]}
        >
          <View style={styles.controlSheen} />
          {icon}
        </LinearGradient>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  hero: {
    width: '100%',
    backgroundColor: COLORS.hero,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 18,
    marginBottom: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,0,0,0.65)',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.border,
        shadowOpacity: 0.55,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  mascotGlow: {
    borderRadius: 92,
    padding: 3,
    backgroundColor: 'rgba(255,0,0,0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#FF0000',
        shadowOpacity: 0.9,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  mascot: {
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  title: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  glassOuter: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: COLORS.glassSolid,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.border,
        shadowOpacity: 0.65,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 8 },
      web: {
        boxShadow:
          '0 0 18px rgba(255,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
      } as object,
      default: {},
    }),
  },
  glassTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.glass,
  },
  glassContent: {
    position: 'relative',
    zIndex: 1,
  },
  panelShell: {
    borderRadius: 40,
  },
  panelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  controlBtnLarge: {
    minWidth: 92,
  },
  controlBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  controlRing: {
    borderRadius: 999,
    padding: 2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,0,0,0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#FF0000',
        shadowOpacity: 0.7,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
      },
      web: {
        boxShadow: '0 0 12px rgba(255,0,0,0.55)',
      } as object,
      default: {},
    }),
  },
  controlRingLarge: {
    padding: 3,
  },
  controlRingActive: {
    borderColor: '#FF4444',
    backgroundColor: 'rgba(255,0,0,0.22)',
    ...Platform.select({
      web: {
        boxShadow: '0 0 18px rgba(255,0,0,0.8)',
      } as object,
      default: {},
    }),
  },
  controlIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.45)',
  },
  controlIconLarge: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  controlSheen: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: '42%',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  controlLabel: {
    marginTop: 10,
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'lowercase',
    textShadowColor: 'rgba(255,0,0,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  powered: {
    marginTop: 16,
    color: COLORS.muted,
    fontSize: 13,
  },
  poweredBold: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  statusShell: {
    marginTop: 26,
    borderRadius: 999,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statusThumbWrap: {
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 0 10px rgba(255,0,0,0.5)',
      } as object,
      default: {},
    }),
  },
  statusThumb: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
    textShadowColor: 'rgba(0,255,85,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});
