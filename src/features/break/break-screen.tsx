import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Goal } from '../../core/types/domain.types';
import { Colors } from '../../shared/theme/colors';
import { useBreakViewModel } from './use-break-view-model';

export default function BreakScreen() {
  const {
    status,
    event,
    goals,
    headline,
    detail,
    countdownText,
    handleToggleGoal,
    handleDone,
  } = useBreakViewModel();

  const renderGoal = (goal: Goal) => (
    <TouchableOpacity
      key={goal.id}
      style={styles.goalRow}
      onPress={() => handleToggleGoal(goal.id)}
      accessibilityRole="checkbox"
      accessibilityLabel={goal.title}
      accessibilityState={{ checked: goal.done }}
    >
      <View style={[styles.checkbox, goal.done && styles.checkboxDone]}>
        {goal.done && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.goalTitle, goal.done && styles.goalTitleDone]}>
        {goal.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline} accessibilityRole="header">
          {headline}
        </Text>
        <Text style={styles.detail}>{detail}</Text>

        {countdownText !== '' && (
          <View
            style={styles.timer}
            accessible
            accessibilityLabel={`Time left: ${countdownText}`}
          >
            <Text style={styles.timerValue}>{countdownText}</Text>
            <Text style={styles.timerLabel}>until it opens</Text>
          </View>
        )}

        {event && (
          <View style={styles.card}>
            <Text style={styles.quote}>{`“${event.quote.text}”`}</Text>
            <Text style={styles.author}>{`— ${event.quote.author}`}</Text>
          </View>
        )}

        {event && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Your goals</Text>
            {goals.length === 0 ? (
              <Text style={styles.emptyGoals}>
                Nothing here yet. Add goals from the home screen so they are
                waiting for you next time.
              </Text>
            ) : (
              goals.map(renderGoal)
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
          accessibilityRole="button"
          accessibilityLabel={status === 'none' ? 'Close' : 'Done for now'}
        >
          <Text style={styles.doneText}>
            {status === 'none' ? 'Close' : "I'm done for now"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const MIN_TOUCH = 48;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 16,
  },
  headline: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  detail: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  timer: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 3,
    borderColor: Colors.accentBorder,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  timerValue: {
    color: Colors.accent,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  timerLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  quote: {
    color: Colors.textPrimary,
    fontSize: 18,
    lineHeight: 26,
    fontStyle: 'italic',
  },
  author: { color: Colors.textSecondary, fontSize: 14 },
  cardLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.textDisabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: { color: Colors.background, fontWeight: '800', fontSize: 14 },
  goalTitle: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
  goalTitleDone: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  emptyGoals: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  footer: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8 },
  doneButton: {
    minHeight: MIN_TOUCH,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  doneText: { color: Colors.textPrimary, fontWeight: '700', fontSize: 16 },
});
