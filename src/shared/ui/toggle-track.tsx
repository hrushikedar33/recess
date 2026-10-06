import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useReduceMotion } from '../motion/use-reduce-motion';
import { palette, radius } from '../theme/tokens';

const TRACK_WIDTH = 56;
const TRACK_HEIGHT = 32;
const THUMB = 24;
const INSET = 4;

/**
 * The look of a switch: a track and a thumb that slides. Not tappable and invisible to screen
 * readers; whatever wraps it is the control and carries the role and state.
 */
export function ToggleTrack({
  value,
  dim = false,
}: {
  value: boolean;
  dim?: boolean;
}) {
  const reduce = useReduceMotion();
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    if (reduce) {
      position.setValue(value ? 1 : 0);
      return;
    }
    Animated.spring(position, {
      toValue: value ? 1 : 0,
      speed: 30,
      bounciness: 10,
      useNativeDriver: true,
    }).start();
  }, [value, reduce, position]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.track, value && styles.trackOn, dim && styles.dim]}
    >
      <Animated.View
        style={[
          styles.thumb,
          value && styles.thumbOn,
          {
            transform: [
              {
                translateX: position.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, TRACK_WIDTH - THUMB - INSET * 2],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    padding: INSET,
    backgroundColor: palette.raised,
    borderWidth: 1,
    borderColor: palette.border,
  },
  trackOn: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: palette.textSecondary,
  },
  thumbOn: { backgroundColor: palette.onPrimary },
  dim: { opacity: 0.5 },
});
