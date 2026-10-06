import React from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { copy } from '../../shared/copy';
import { useEntrance } from '../../shared/motion/use-entrance';
import { palette, radius, space, typography } from '../../shared/theme/tokens';
import { Emoji } from '../../shared/ui/emoji';
import { Glow } from '../../shared/ui/glow';
import { PressableScale } from '../../shared/ui/pressable-scale';
import { GoalsSection } from './components/goals-section';
import { QuoteCard } from './components/quote-card';
import { Timer } from './components/timer';
import { BreakStatus, useBreakViewModel } from './use-break-view-model';

const FACE: Record<BreakStatus, string> = {
  loading: '👀',
  none: '👀',
  active: '🙃',
  over: '🎉',
};

export default function BreakScreen() {
  const {
    status,
    event,
    goals,
    isDaily,
    headline,
    detail,
    countdownText,
    handleToggleGoal,
    handleDone,
  } = useBreakViewModel();
  const entrance = useEntrance(0, 24);
  const face = isDaily && status === 'active' ? '🌙' : FACE[status];
  const hasBreak = status === 'active' || status === 'over';

  return (
    <SafeAreaView style={styles.container}>
      <Glow color={palette.glowBlocked} size={420} style={styles.glowTop} />
      <Glow color={palette.glowPrimary} size={360} style={styles.glowBottom} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.hero, entrance]}>
          <Emoji size={56}>{face}</Emoji>
          <Text style={styles.headline} accessibilityRole="header">
            {headline}
          </Text>
          <Text style={styles.detail}>{detail}</Text>
        </Animated.View>

        {countdownText !== '' && <Timer text={countdownText} />}

        {event && hasBreak && (
          <QuoteCard text={event.quote.text} author={event.quote.author} />
        )}

        {event && hasBreak && (
          <GoalsSection goals={goals} onToggle={handleToggleGoal} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PressableScale
          accessibilityLabel={
            status === 'none' ? copy.break.closeA11y : copy.break.leaveA11y
          }
          onPress={handleDone}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>
            {status === 'none' ? copy.break.close : copy.break.leave}
          </Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.canvas, overflow: 'hidden' },
  glowTop: { position: 'absolute', top: -160, right: -160 },
  glowBottom: { position: 'absolute', bottom: -180, left: -180 },
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    paddingBottom: space.xl,
    gap: space.xl,
  },
  hero: { alignItems: 'center', gap: space.sm },
  headline: {
    ...typography.display,
    color: palette.textPrimary,
    textAlign: 'center',
  },
  detail: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 23,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.xl,
  },
  cta: {
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { ...typography.heading, color: palette.onPrimary },
});
