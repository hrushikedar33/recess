import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { tick } from '../motion/haptics';
import { palette, radius, space, typography } from '../theme/tokens';
import { PressableScale } from './pressable-scale';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * One option of a single-choice group. Selection is shown by fill, weight AND a check mark, so it
 * never depends on colour alone.
 */
export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: ChipProps) {
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={() => {
        tick();
        onPress();
      }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {selected ? `✓ ${label}` : label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.raised,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  label: {
    ...typography.label,
    color: palette.textPrimary,
  },
  labelSelected: {
    color: palette.onPrimary,
  },
});
