import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, space, typography } from '../theme/tokens';
import { PressableScale } from './pressable-scale';

interface ScreenHeaderProps {
  title: string;
  /** Leave out on a screen that cannot go back. */
  onBack?: () => void;
  right?: ReactNode;
}

/** The top of an inner screen, in the app's own style (replaces the default navigation bar). */
export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  return (
    <View style={styles.bar}>
      {onBack && (
        <PressableScale
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.back}
        >
          <Text style={styles.backGlyph}>←</Text>
        </PressableScale>
      )}
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.raised,
  },
  backGlyph: { color: palette.textPrimary, fontSize: 20, fontWeight: '700' },
  title: { ...typography.title, flex: 1, color: palette.textPrimary },
});
