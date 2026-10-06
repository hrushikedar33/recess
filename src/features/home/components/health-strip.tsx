import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { copy } from '../../../shared/copy';
import {
  palette,
  radius,
  space,
  typography,
} from '../../../shared/theme/tokens';
import { Card } from '../../../shared/ui/card';
import { PressableScale } from '../../../shared/ui/pressable-scale';
import { MonitorHealthView } from '../monitor-health';

interface HealthStripProps {
  health: MonitorHealthView;
  onOpenSettings: () => void;
}

/** A quiet "all good" line, or a warning card listing what needs fixing. Nothing while monitoring is off. */
export function HealthStrip({ health, onOpenSettings }: HealthStripProps) {
  if (health.tone === 'off') {
    return null;
  }

  if (health.tone === 'ok') {
    return (
      <View
        accessible
        accessibilityLabel={[health.headline, ...health.details].join('. ')}
        style={styles.ok}
      >
        <View style={styles.okDot} />
        <Text style={styles.okText}>{health.headline}</Text>
        {health.details.map((detail) => (
          <Text key={detail} style={styles.okDetail}>
            {`· ${detail}`}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <Card tone="warning" style={styles.warning}>
      <Text style={styles.warningTitle}>{health.headline}</Text>
      {health.details.map((detail) => (
        <Text key={detail} style={styles.warningBody}>
          {detail}
        </Text>
      ))}
      {health.opensSettings && (
        <PressableScale
          accessibilityLabel={copy.home.settingsA11y}
          onPress={onOpenSettings}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{copy.home.settings}</Text>
        </PressableScale>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  ok: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
  },
  okDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary,
  },
  okText: { ...typography.label, color: palette.textPrimary },
  okDetail: { ...typography.caption, color: palette.textSecondary },
  warning: { gap: space.sm },
  warningTitle: { ...typography.heading, color: palette.warning },
  warningBody: {
    ...typography.body,
    lineHeight: 21,
    color: palette.textPrimary,
  },
  button: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.warning,
    marginTop: space.xs,
  },
  buttonText: { ...typography.label, color: palette.warning },
});
