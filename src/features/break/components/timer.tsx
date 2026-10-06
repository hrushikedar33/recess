import React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { copy } from '../../../shared/copy';
import { usePulse } from '../../../shared/motion/use-pulse';
import {
  palette,
  radius,
  space,
  typography,
} from '../../../shared/theme/tokens';

/** The time left, big, with a gentle breathing pulse. Digits have fixed width so nothing jiggles as they change. */
export function Timer({ text }: { text: string }) {
  const pulse = usePulse(true, 1.035);

  return (
    <Animated.View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={copy.break.countdownA11y(text)}
      style={[styles.wrap, { transform: [{ scale: pulse }] }]}
    >
      <Text style={styles.digits}>{text}</Text>
      <Text style={styles.label}>{copy.break.countdownLabel}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: space.lg,
    paddingHorizontal: space.xxl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.blocked,
    backgroundColor: palette.blockedMuted,
  },
  digits: {
    ...typography.display,
    fontSize: 56,
    color: palette.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  label: {
    ...typography.caption,
    color: palette.blocked,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
