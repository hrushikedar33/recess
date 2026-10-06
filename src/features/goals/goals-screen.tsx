import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { copy } from '../../shared/copy';
import { palette, space, typography } from '../../shared/theme/tokens';
import { Emoji } from '../../shared/ui/emoji';
import { Glow } from '../../shared/ui/glow';
import { GoalRow } from '../../shared/ui/goal-row';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { ScreenHeader } from '../../shared/ui/screen-header';
import { AddGoalRow } from './components/add-goal-row';
import { QuotesCard } from './components/quotes-card';
import { useGoalsViewModel } from './use-goals-view-model';

export default function GoalsScreen() {
  const {
    goals,
    draft,
    error,
    summary,
    canAdd,
    onlineQuotes,
    onlineQuotesLoaded,
    handleToggleOnlineQuotes,
    handleOpenAttribution,
    handleBack,
    handleChangeDraft,
    handleAdd,
    handleToggle,
    handleRemove,
  } = useGoalsViewModel();

  const progressText =
    summary.total > 0 && summary.done === summary.total
      ? copy.goals.allDone
      : copy.goals.progress(summary.done, summary.total);

  const header = (
    <View style={styles.header}>
      <Text style={styles.intro}>{copy.goals.intro}</Text>
      {summary.total > 0 && (
        <View style={styles.progress}>
          <Text style={styles.progressText}>{progressText}</Text>
          <ProgressBar
            progress={summary.done / summary.total}
            label={copy.goals.progress(summary.done, summary.total)}
          />
        </View>
      )}
      <AddGoalRow
        draft={draft}
        canAdd={canAdd}
        onChange={handleChangeDraft}
        onSubmit={handleAdd}
      />
      {error !== null && (
        <Text
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Glow color={palette.glowPrimary} size={380} style={styles.glow} />
      <ScreenHeader title={copy.goals.title} onBack={handleBack} />
      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <GoalRow
            index={index}
            title={item.title}
            done={item.done}
            onToggle={() => handleToggle(item.id)}
            onRemove={() => handleRemove(item.id)}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Emoji size={56}>🎯</Emoji>
            <Text style={styles.emptyTitle}>{copy.goals.empty.title}</Text>
            <Text style={styles.emptyBody}>{copy.goals.empty.body}</Text>
          </View>
        }
        ListFooterComponent={
          <QuotesCard
            enabled={onlineQuotes}
            loaded={onlineQuotesLoaded}
            onToggle={handleToggleOnlineQuotes}
            onOpenAttribution={handleOpenAttribution}
          />
        }
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.canvas, overflow: 'hidden' },
  glow: { position: 'absolute', top: -160, right: -160 },
  list: { paddingHorizontal: space.xl, paddingBottom: space.huge },
  header: { gap: space.lg, paddingBottom: space.lg },
  intro: { ...typography.body, color: palette.textSecondary, lineHeight: 22 },
  progress: { gap: space.sm },
  progressText: { ...typography.heading, color: palette.primary },
  error: { ...typography.body, color: palette.danger },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  emptyTitle: {
    ...typography.title,
    color: palette.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.body,
    lineHeight: 22,
    color: palette.textSecondary,
    textAlign: 'center',
  },
});
