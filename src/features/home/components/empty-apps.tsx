import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { copy } from '../../../shared/copy';
import { usePulse } from '../../../shared/motion/use-pulse';
import { palette, space, typography } from '../../../shared/theme/tokens';
import { Emoji } from '../../../shared/ui/emoji';

/** Shown when no app is limited yet: a nudge, not a blank screen. */
export function EmptyApps() {
  const float = usePulse(true, 1.1);

  return (
    <View style={styles.box}>
      <Animated.View style={{ transform: [{ scale: float }] }}>
        <Emoji size={64}>🌱</Emoji>
      </Animated.View>
      <Text style={styles.title}>{copy.home.empty.title}</Text>
      <Text style={styles.body}>{copy.home.empty.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.huge,
    paddingHorizontal: space.xl,
  },
  title: {
    ...typography.title,
    color: palette.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    lineHeight: 22,
    color: palette.textSecondary,
    textAlign: 'center',
  },
});
