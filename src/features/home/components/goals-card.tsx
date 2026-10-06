import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { copy } from '../../../shared/copy';
import {
  palette,
  radius,
  space,
  typography,
} from '../../../shared/theme/tokens';
import { PressableScale } from '../../../shared/ui/pressable-scale';
import { ProgressBar } from '../../../shared/ui/progress-bar';

interface GoalsCardProps {
  done: number;
  total: number;
  onPress: () => void;
}

/** The to-do list at a glance: how far along you are, and a way in. */
export function GoalsCard({ done, total, onPress }: GoalsCardProps) {
  const progress = total === 0 ? 0 : done / total;
  const summary =
    total === 0
      ? copy.home.goals.empty
      : done === total
      ? copy.home.goals.allDone
      : copy.home.goals.progress(done, total);

  return (
    <PressableScale
      accessibilityLabel={copy.home.goals.a11y(summary)}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text style={styles.title}>{copy.home.goals.title}</Text>
          <Text style={styles.summary}>{summary}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
      {total > 0 && (
        <ProgressBar
          progress={progress}
          label={copy.home.goals.progress(done, total)}
        />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  texts: { flex: 1, gap: 2 },
  title: { ...typography.heading, color: palette.textPrimary },
  summary: { ...typography.body, color: palette.textSecondary },
  chevron: { fontSize: 28, color: palette.textSecondary, marginLeft: space.md },
});
