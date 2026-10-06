import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReduceMotion } from '../motion/use-reduce-motion';

const PARTICLES = ['✨', '🎉', '💚', '⭐', '🔥', '💫', '🎊', '✨'];
const REACH = 64;

interface ConfettiBurstProps {
  /** Called once the burst has played (or at once when motion is reduced), so the caller can remove it. */
  onDone: () => void;
  testID?: string;
}

/** A short burst of emoji flying out from the centre of its parent. Purely decorative. */
export function ConfettiBurst({ onDone, testID }: ConfettiBurstProps) {
  const reduce = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (reduce) {
      done.current();
      return undefined;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) {
        done.current();
      }
    });
    return () => animation.stop();
  }, [reduce, progress]);

  if (reduce) {
    return null;
  }

  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.layer}
    >
      {PARTICLES.map((emoji, index) => {
        const angle = (index / PARTICLES.length) * Math.PI * 2;
        return (
          <Animated.Text
            // The list never changes, so the index is a stable key.
            key={index}
            style={[
              styles.particle,
              {
                opacity: progress.interpolate({
                  inputRange: [0, 0.15, 1],
                  outputRange: [0, 1, 0],
                }),
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.cos(angle) * REACH],
                    }),
                  },
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.sin(angle) * REACH - 8],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [0.4, 1.2, 0.8],
                    }),
                  },
                ],
              },
            ]}
          >
            {emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    fontSize: 16,
  },
});
