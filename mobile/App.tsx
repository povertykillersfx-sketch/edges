import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type BotStatus = 'running' | 'stopped' | 'removed';

/** Ferrari red / glass reference palette */
const C = {
  black: '#000000',
  red: '#FF0000',
  redDeep: '#C40000',
  white: '#FFFFFF',
  green: '#00FF00',
  muted: '#9A9A9A',
  glass: 'rgba(8, 8, 8, 0.72)',
  glassEdge: 'rgba(255, 0, 0, 0.95)',
};

const PHONE_W = 390;
const PHONE_H = 844;

export default function App() {
  const { width, height } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width > 500;

  const phone = (
    <PhoneScreen />
  );

  if (!isWebDesktop) {
    return phone;
  }

  // Desktop web: show a phone-framed composition so preview matches device proportions
  const scale = Math.min((height - 48) / PHONE_H, (width - 48) / PHONE_W, 1);
  return (
    <View style={styles.webStage}>
      <View
        style={[
          styles.phoneChrome,
          {
            width: PHONE_W,
            height: PHONE_H,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.notch} />
        {phone}
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

function PhoneScreen() {
  const [status, setStatus] = useState<BotStatus>('running');
  const isActive = status === 'running';
  const statusLabel =
    status === 'running' ? 'running' : status === 'stopped' ? 'stopped' : 'removed';
  const statusColor =
    status === 'running' ? C.green : status === 'stopped' ? C.red : C.muted;

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
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Full-bleed Ferrari red hero — matches reference top half */}
      <View style={styles.hero}>
        <View style={styles.heroRed} />
        <Image
          source={require('./assets/mascot.jpg')}
          style={styles.mascot}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)', C.black]}
          locations={[0.55, 0.82, 1]}
          style={styles.heroFade}
        />
        <Text style={styles.title}>edges ea control</Text>
      </View>

      <View style={styles.lower}>
        <Glass style={styles.controlGlass} contentStyle={styles.controlRow}>
          <Control
            label="quotes"
            onPress={onQuotes}
            icon={<MaterialCommunityIcons name="chart-line" size={22} color={C.red} />}
          />
          <Control
            label={isActive ? 'stop' : 'start'}
            onPress={onToggleRun}
            large
            lit={isActive}
            icon={
              <Ionicons
                name={isActive ? 'stop' : 'play'}
                size={28}
                color={C.red}
              />
            }
          />
          <Control
            label="remove"
            onPress={onRemove}
            icon={<Ionicons name="trash-outline" size={22} color={C.red} />}
          />
        </Glass>

        <Text style={styles.powered}>
          powered by <Text style={styles.poweredBrand}>edges hosting</Text>
        </Text>

        <Glass style={styles.statusGlass} contentStyle={styles.statusRow}>
          <Image
            source={require('./assets/mascot.jpg')}
            style={styles.statusThumb}
          />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>edges ea control</Text>
            <Text style={[styles.statusState, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </Glass>
      </View>
    </View>
  );
}

function Glass({
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
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  large?: boolean;
  lit?: boolean;
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
          },
          lit && styles.ringLit,
          Platform.OS === 'web'
            ? ({
                boxShadow: lit
                  ? '0 0 16px rgba(255,0,0,0.85), 0 0 4px #FF0000'
                  : '0 0 10px rgba(255,0,0,0.55)',
              } as object)
            : null,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255,70,70,0.45)',
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
            borderColor: 'rgba(255,40,40,0.55)',
            overflow: 'hidden',
          }}
        >
          <View style={styles.sheen} />
          {icon}
        </LinearGradient>
      </View>
      <Text style={styles.controlLabel}>{label}</Text>
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
    backgroundColor: C.black,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 10,
    borderColor: '#0a0a0a',
    ...Platform.select({
      web: {
        boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
      } as object,
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
  root: {
    flex: 1,
    backgroundColor: C.black,
  },
  hero: {
    height: '54%',
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: C.red,
  },
  heroRed: {
    ...StyleSheet.absoluteFill,
    backgroundColor: C.red,
  },
  mascot: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: '100%',
    alignSelf: 'center',
  },
  heroFade: {
    ...StyleSheet.absoluteFill,
  },
  title: {
    position: 'absolute',
    bottom: 14,
    color: C.white,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'lowercase',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  lower: {
    flex: 1,
    backgroundColor: C.black,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 22,
    justifyContent: 'flex-start',
    gap: 12,
  },
  glassOuter: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: C.glassEdge,
    overflow: 'hidden',
    backgroundColor: C.glass,
    ...Platform.select({
      ios: {
        shadowColor: C.red,
        shadowOpacity: 0.75,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
      },
      android: { elevation: 10 },
      web: {
        boxShadow:
          '0 0 14px rgba(255,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
      } as object,
      default: {},
    }),
  },
  glassFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  glassInner: {
    zIndex: 1,
  },
  controlGlass: {
    borderRadius: 999,
    maxWidth: 420,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  control: {
    alignItems: 'center',
    minWidth: 70,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.red,
    backgroundColor: 'rgba(255,0,0,0.1)',
  },
  ringLit: {
    borderColor: '#FF3B3B',
    backgroundColor: 'rgba(255,0,0,0.22)',
  },
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
    color: C.red,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  powered: {
    marginTop: 2,
    color: C.muted,
    fontSize: 12,
  },
  poweredBrand: {
    color: C.red,
    fontWeight: '700',
  },
  statusGlass: {
    marginTop: 'auto',
    marginBottom: 8,
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
    borderColor: C.red,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    color: C.white,
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
});
