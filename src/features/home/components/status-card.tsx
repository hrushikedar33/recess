import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { copy } from '../../../shared/copy';
import { tick } from '../../../shared/motion/haptics';
import { usePulse } from '../../../shared/motion/use-pulse';
import {
  palette,
  radius,
  space,
  typography,
} from '../../../shared/theme/tokens';
import { PressableScale } from '../../../shared/ui/pressable-scale';
import { ToggleTrack } from '../../../shared/ui/toggle-track';

interface StatusCardProps {
  enabled: boolean;
  busy: boolean;
  /** How many of the listed apps are switched on. */
  activeCount: number;
  onToggle: () => void;
}

/** The big ON/OFF card: the whole card is the switch for monitoring. */
export function StatusCard({
  enabled,
  busy,
  activeCount,
  onToggle,
}: StatusCardProps) {
  const pulse = usePulse(enabled && !busy, 1.7);
  const title = enabled ? copy.home.on.title : copy.home.off.title;
  const detail = busy
    ? copy.home.busy
    : enabled
    ? copy.home.on.detail(activeCount)
    : copy.home.off.detail;

  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel={copy.home.switchLabel}
      accessibilityState={{ checked: enabled, busy }}
      disabled={busy}
      onPress={() => {
        tick();
        onToggle();
      }}
      style={[styles.card, enabled && styles.cardOn]}
    >
      <View
        style={styles.dotBox}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          style={[
            styles.ring,
            enabled && styles.ringOn,
            { transform: [{ scale: pulse }] },
          ]}
        />
        <View style={[styles.dot, enabled && styles.dotOn]} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, enabled && styles.titleOn]}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <ToggleTrack value={enabled} dim={busy} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  cardOn: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryMuted,
  },
  dotBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'transparent',
  },
  ringOn: { backgroundColor: palette.primaryMuted },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.textDisabled,
  },
  dotOn: { backgroundColor: palette.primary },
  texts: { flex: 1, gap: 2 },
  title: { ...typography.title, color: palette.textPrimary },
  titleOn: { color: palette.primary },
  detail: { ...typography.body, color: palette.textSecondary },
});
