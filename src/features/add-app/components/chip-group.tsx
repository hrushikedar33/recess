import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, space, typography } from '../../../shared/theme/tokens';
import { Chip } from '../../../shared/ui/chip';

export interface ChipOption<T> {
  value: T;
  /** Drawn on the chip. */
  label: string;
  /** Said by a screen reader. */
  spoken: string;
}

interface ChipGroupProps<T> {
  title: string;
  options: ChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  /** One sentence saying what the current choice means. */
  description: string;
}

/** A titled row of single-choice chips with a line explaining the current choice. */
export function ChipGroup<T extends number | null>({
  title,
  options,
  selected,
  onSelect,
  description,
}: ChipGroupProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={title}
      style={styles.group}
    >
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chips}>
        {options.map((option) => (
          <Chip
            key={option.spoken}
            label={option.label}
            accessibilityLabel={option.spoken}
            selected={option.value === selected}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.md },
  title: { ...typography.heading, color: palette.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  description: {
    ...typography.body,
    lineHeight: 21,
    color: palette.textSecondary,
  },
});
