import React from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { BlockedApp } from '../../../core/types/domain.types';
import { copy } from '../../../shared/copy';
import { staggerDelay } from '../../../shared/motion/stagger';
import { useEntrance } from '../../../shared/motion/use-entrance';
import {
  palette,
  radius,
  space,
  typography,
} from '../../../shared/theme/tokens';
import { PressableScale } from '../../../shared/ui/pressable-scale';
import { Toggle } from '../../../shared/ui/toggle';
import { limitsLine } from '../limit-summary';

interface AppCardProps {
  app: BlockedApp;
  /** Position in the list, for the staggered entrance. */
  index: number;
  onToggle: () => void;
  onRemove: () => void;
}

/**
 * One limited app on a single compact row: icon, the name with a remove button beside it, the three
 * limits as one small line, and the switch at the right.
 */
export function AppCard({ app, index, onToggle, onRemove }: AppCardProps) {
  const entrance = useEntrance(staggerDelay(index), 16);
  const limits = limitsLine(app);

  return (
    <Animated.View
      style={[styles.card, !app.isActive && styles.cardOff, entrance]}
    >
      {app.iconBase64 ? (
        <Image source={{ uri: app.iconBase64 }} style={styles.icon} />
      ) : (
        <View style={[styles.icon, styles.iconFallback]}>
          <Text style={styles.iconLetter}>
            {app.appName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {app.appName}
          </Text>
          <PressableScale
            accessibilityLabel={copy.home.remove(app.appName)}
            onPress={onRemove}
            style={styles.remove}
          >
            <Text style={styles.removeGlyph}>✕</Text>
          </PressableScale>
        </View>
        <Text style={styles.limits} accessibilityLabel={limits.spoken}>
          {limits.label}
        </Text>
      </View>
      <Toggle
        value={app.isActive}
        onValueChange={onToggle}
        accessibilityLabel={copy.home.appSwitch(app.appName)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    marginBottom: space.sm,
  },
  cardOff: { opacity: 0.6 },
  icon: { width: 40, height: 40, borderRadius: radius.sm },
  iconFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.raised,
  },
  iconLetter: { ...typography.heading, color: palette.primary },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { ...typography.heading, flex: 1, color: palette.textPrimary },
  // 32 dp tall plus the hit slop is a 48 dp target; the negative margin keeps the row itself compact.
  remove: {
    width: 32,
    height: 32,
    marginVertical: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeGlyph: { color: palette.textSecondary, fontSize: 13 },
  limits: { ...typography.caption, color: palette.textSecondary },
});
