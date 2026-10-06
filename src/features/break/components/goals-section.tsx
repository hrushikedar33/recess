import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Goal } from '../../../core/types/domain.types';
import { copy } from '../../../shared/copy';
import {
  palette,
  radius,
  space,
  typography,
} from '../../../shared/theme/tokens';
import { Card } from '../../../shared/ui/card';
import { Emoji } from '../../../shared/ui/emoji';
import { GoalRow } from '../../../shared/ui/goal-row';
import { summarizeGoals } from '../../goals/goals-summary';

interface GoalsSectionProps {
  goals: Goal[];
  onToggle: (id: string) => void;
}

/** The to-do list, right on the takeover: tick things off as you decide what to do instead. */
export function GoalsSection({ goals, onToggle }: GoalsSectionProps) {
  const { done, total } = summarizeGoals(goals);
  const allDone = total > 0 && done === total;

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Text style={styles.title} accessibilityRole="header">
            {copy.break.goalsTitle}
          </Text>
          {total > 0 && <Text style={styles.hint}>{copy.break.goalsHint}</Text>}
        </View>
        {total > 0 && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {copy.break.progress(done, total)}
            </Text>
          </View>
        )}
      </View>

      {total === 0 ? (
        <Text style={styles.empty}>{copy.break.goalsEmpty}</Text>
      ) : (
        goals.map((goal, index) => (
          <GoalRow
            key={goal.id}
            index={index}
            title={goal.title}
            done={goal.done}
            onToggle={() => onToggle(goal.id)}
          />
        ))
      )}

      {allDone && (
        <Card tone="primary" style={styles.celebrate}>
          <Emoji size={26}>🎉</Emoji>
          <Text style={styles.celebrateText}>{copy.break.allDone}</Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { alignSelf: 'stretch', gap: space.xs },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  titles: { flex: 1 },
  title: { ...typography.title, fontSize: 22, color: palette.textPrimary },
  hint: { ...typography.caption, color: palette.textSecondary, marginTop: 2 },
  pill: {
    borderRadius: radius.pill,
    backgroundColor: palette.primaryMuted,
    borderWidth: 1,
    borderColor: palette.primary,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  pillText: { ...typography.label, color: palette.primary },
  empty: {
    ...typography.body,
    color: palette.textSecondary,
    lineHeight: 22,
  },
  celebrate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.sm,
  },
  celebrateText: {
    ...typography.heading,
    flex: 1,
    color: palette.primary,
  },
});
