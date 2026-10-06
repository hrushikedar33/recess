import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { palette, radius, space, typography } from '../theme/tokens';

export type PillTone = 'neutral' | 'primary' | 'blocked' | 'warning';

const TONES: Record<PillTone, { box: ViewStyle; text: string }> = {
  neutral: {
    box: { backgroundColor: palette.raised, borderColor: palette.border },
    text: palette.textSecondary,
  },
  primary: {
    box: {
      backgroundColor: palette.primaryMuted,
      borderColor: palette.primary,
    },
    text: palette.primary,
  },
  blocked: {
    box: {
      backgroundColor: palette.blockedMuted,
      borderColor: palette.blocked,
    },
    text: palette.blocked,
  },
  warning: {
    box: {
      backgroundColor: palette.warningMuted,
      borderColor: palette.warning,
    },
    text: palette.warning,
  },
};

interface PillProps {
  label: string;
  tone?: PillTone;
  /** Only needed when the short visible text is not enough for a screen reader. */
  accessibilityLabel?: string;
}

/** A small read-only tag, such as one limit of an app. Not tappable. */
export function Pill({
  label,
  tone = 'neutral',
  accessibilityLabel,
}: PillProps) {
  const { box, text } = TONES[tone];
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.pill, box]}
    >
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  text: { ...typography.caption, fontWeight: '700' },
});
