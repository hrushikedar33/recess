import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MAX_GOAL_TITLE_LENGTH } from '../../core/constants/app.constants';
import { Goal } from '../../core/types/domain.types';
import { Colors } from '../../shared/theme/colors';
import { useGoalsViewModel } from './use-goals-view-model';

export default function GoalsScreen() {
  const {
    goals,
    draft,
    error,
    summary,
    canAdd,
    handleChangeDraft,
    handleAdd,
    handleToggle,
    handleRemove,
  } = useGoalsViewModel();

  const renderGoal = ({ item }: { item: Goal }) => (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowMain}
        onPress={() => handleToggle(item.id)}
        accessibilityRole="checkbox"
        accessibilityLabel={item.title}
        accessibilityState={{ checked: item.done }}
      >
        <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
          {item.done && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={[styles.rowTitle, item.done && styles.rowTitleDone]}>
          {item.title}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemove(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Remove goal ${item.title}`}
      >
        <Text style={styles.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          Your goals and to-dos appear when a limit is reached.
        </Text>
        <Text style={styles.summary}>{summary.label}</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={handleChangeDraft}
          onSubmitEditing={handleAdd}
          placeholder="Add a goal or to-do"
          placeholderTextColor={Colors.textDisabled}
          maxLength={MAX_GOAL_TITLE_LENGTH}
          returnKeyType="done"
          accessibilityLabel="New goal"
        />
        <TouchableOpacity
          style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={!canAdd}
          accessibilityRole="button"
          accessibilityLabel="Add goal"
          accessibilityState={{ disabled: !canAdd }}
        >
          <Text style={[styles.addText, !canAdd && styles.addTextDisabled]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {error !== null && (
        <Text
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}

      {goals.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptyBody}>
            Add what you would rather be doing. They show up, with a quote, when
            it is time to put the phone down.
          </Text>
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          renderItem={renderGoal}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const MIN_TOUCH = 48;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 6 },
  subtitle: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  summary: { color: Colors.textPrimary, fontSize: 16, fontWeight: '700' },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  addButton: {
    minHeight: MIN_TOUCH,
    minWidth: 64,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  addButtonDisabled: {
    backgroundColor: Colors.surfaceRaised,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  addText: { color: Colors.textPrimary, fontWeight: '700', fontSize: 15 },
  addTextDisabled: { color: Colors.textDisabled },
  error: {
    color: Colors.error,
    fontSize: 13,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  list: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 8,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH,
    paddingLeft: 14,
    paddingVertical: 10,
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
  rowTitle: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
  rowTitleDone: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  removeButton: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: Colors.textSecondary, fontSize: 16 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
