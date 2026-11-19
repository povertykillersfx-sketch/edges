import { useRef } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';

const TAP_WINDOW_MS = 900;

type Props = {
  source?: ImageSourcePropType;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ViewStyle>;
  resizeMode?: 'contain' | 'cover';
  borderColor?: string;
};

/**
 * Edges logo with triple-tap → Mentors Portal (`/portal`).
 * Oversized hit target for reliable mobile Safari taps.
 */
export function TripleTapLogo({
  source = require('../assets/mascot.jpg'),
  size = 112,
  style,
  imageStyle,
  resizeMode = 'contain',
  borderColor = '#FF0000',
}: Props) {
  const router = useRouter();
  const taps = useRef<{ count: number; at: number }>({ count: 0, at: 0 });

  const onPress = () => {
    const now = Date.now();
    if (now - taps.current.at > TAP_WINDOW_MS) {
      taps.current = { count: 1, at: now };
    } else {
      taps.current = { count: taps.current.count + 1, at: now };
    }
    if (taps.current.count >= 3) {
      taps.current = { count: 0, at: 0 };
      router.push('/portal');
    }
  };

  const hit = Math.max(size + 48, 160);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Edges logo — triple tap for Mentors Portal"
      hitSlop={24}
      style={({ pressed }) => [
        styles.hit,
        { width: hit, height: hit },
        Platform.OS === 'web' ? ({ cursor: 'pointer', touchAction: 'manipulation' } as object) : null,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <Image
        source={source}
        resizeMode={resizeMode}
        style={[
          styles.img,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.25),
            borderColor,
          },
          imageStyle as object,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
    // Extra tap pad beyond the visible logo
    marginVertical: -8,
  },
  img: {
    borderWidth: 2,
    backgroundColor: '#000000',
  },
});
