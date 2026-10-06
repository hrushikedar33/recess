import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppInfo } from '../../../core/types/domain.types';
import { copy } from '../../../shared/copy';
import {
  palette,
  radius,
  space,
  typography,
} from '../../../shared/theme/tokens';
import { Card } from '../../../shared/ui/card';
import { PressableScale } from '../../../shared/ui/pressable-scale';
import { ScreenHeader } from '../../../shared/ui/screen-header';
import { ChipGroup, ChipOption } from './chip-group';

interface AppConfigProps {
  app: AppInfo;
  limitMinutes: number;
  cooldownMinutes: number;
  dailyLimitMinutes: number | null;
  error: string | null;
  canSave: boolean;
  saving: boolean;
  presetLimits: number[];
  presetCooldowns: number[];
  presetDailyLimits: number[];
  onLimit: (minutes: number) => void;
  onCooldown: (minutes: number) => void;
  onDaily: (minutes: number | null) => void;
  onSave: () => void;
  onBack: () => void;
}

const minuteOptions = (values: number[]): ChipOption<number>[] =>
  values.map((value) => ({
    value,
    label: `${value}m`,
    spoken: copy.addApp.minutesA11y(value),
  }));

/** Step two: set the three numbers, see them summed up, lock it in. */
export function AppConfig(props: AppConfigProps) {
  const {
    app,
    limitMinutes,
    cooldownMinutes,
    dailyLimitMinutes,
    error,
    canSave,
    saving,
  } = props;
  const dailyOptions: ChipOption<number | null>[] = [
    ...minuteOptions(props.presetDailyLimits),
    {
      value: null,
      label: copy.addApp.daily.noCap,
      spoken: copy.addApp.daily.noCapA11y,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={copy.addApp.configTitle} onBack={props.onBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          {app.iconBase64 ? (
            <Image source={{ uri: app.iconBase64 }} style={styles.icon} />
          ) : (
            <View style={[styles.icon, styles.iconFallback]}>
              <Text style={styles.iconLetter}>
                {app.appName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.appName}>{app.appName}</Text>
        </View>

        <ChipGroup
          title={copy.addApp.session.title}
          options={minuteOptions(props.presetLimits)}
          selected={limitMinutes}
          onSelect={props.onLimit}
          description={copy.addApp.session.desc(limitMinutes)}
        />
        <ChipGroup
          title={copy.addApp.cooldown.title}
          options={minuteOptions(props.presetCooldowns)}
          selected={cooldownMinutes}
          onSelect={props.onCooldown}
          description={copy.addApp.cooldown.desc(cooldownMinutes)}
        />
        <ChipGroup
          title={copy.addApp.daily.title}
          options={dailyOptions}
          selected={dailyLimitMinutes}
          onSelect={props.onDaily}
          description={
            dailyLimitMinutes === null
              ? copy.addApp.daily.descNoCap
              : copy.addApp.daily.desc(dailyLimitMinutes)
          }
        />

        <Card tone="primary" style={styles.summary}>
          <Text style={styles.summaryText}>
            {copy.addApp.summary(
              limitMinutes,
              cooldownMinutes,
              dailyLimitMinutes,
            )}
          </Text>
        </Card>
        {error !== null && (
          <Text
            style={styles.error}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PressableScale
          accessibilityLabel={copy.addApp.saveA11y}
          disabled={!canSave}
          onPress={props.onSave}
          style={[styles.save, !canSave && styles.saveOff]}
        >
          <Text style={[styles.saveText, !canSave && styles.saveTextOff]}>
            {saving ? copy.addApp.saving : copy.addApp.save}
          </Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.canvas },
  content: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
    gap: space.xl,
  },
  hero: { alignItems: 'center', gap: space.md, paddingVertical: space.md },
  icon: { width: 72, height: 72, borderRadius: radius.md },
  iconFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.raised,
  },
  iconLetter: { ...typography.display, fontSize: 32, color: palette.primary },
  appName: { ...typography.title, color: palette.textPrimary },
  summary: { alignItems: 'center' },
  summaryText: {
    ...typography.heading,
    color: palette.primary,
    textAlign: 'center',
  },
  error: { ...typography.body, color: palette.danger },
  footer: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
    paddingTop: space.md,
  },
  save: {
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOff: { backgroundColor: palette.raised },
  saveText: { ...typography.heading, color: palette.onPrimary },
  saveTextOff: { color: palette.textDisabled },
});
