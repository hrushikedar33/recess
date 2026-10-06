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
import { Pill } from '../../../shared/ui/pill';
import { PressableScale } from '../../../shared/ui/pressable-scale';
import { Toggle } from '../../../shared/ui/toggle';
import { limitChips } from '../limit-summary';

interface AppCardProps {
  app: BlockedApp;
  /** Position in the list, for the staggered entrance. */
  index: number;
  onToggle: () => void;
  onRemove: () => void;
}

/** One limited app: icon, name, its three limits as tags, a switch and a remove button. */
export function AppCard({ app, index, onToggle, onRemove }: AppCardProps) {
  const entrance = useEntrance(staggerDelay(index), 16);

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
        <Text style={styles.name} numberOfLines={1}>
          {app.appName}
        </Text>
        <View style={styles.chips}>
          {limitChips(app).map((chip) => (
            <Pill
              key={chip.label}
              label={chip.label}
              accessibilityLabel={chip.spoken}
            />
          ))}
        </View>
      </View>
      <View style={styles.controls}>
        <Toggle
          value={app.isActive}
          onValueChange={onToggle}
          accessibilityLabel={copy.home.appSwitch(app.appName)}
        />
        <PressableScale
          accessibilityLabel={copy.home.remove(app.appName)}
          onPress={onRemove}
          style={styles.remove}
        >
          <Text style={styles.removeGlyph}>✕</Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    marginBottom: space.md,
  },
  cardOff: { opacity: 0.6 },
  icon: { width: 48, height: 48, borderRadius: radius.sm },
  iconFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.raised,
  },
  iconLetter: { ...typography.title, color: palette.primary },
  info: { flex: 1, gap: space.sm },
  name: { ...typography.heading, color: palette.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  controls: { alignItems: 'center', gap: space.sm },
  remove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeGlyph: { color: palette.textSecondary, fontSize: 16 },
});
