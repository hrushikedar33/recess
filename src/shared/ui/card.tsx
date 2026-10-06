import React, { ReactNode } from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { palette, radius, space } from '../theme/tokens';

export type CardTone = 'default' | 'primary' | 'blocked' | 'warning';

const TONES: Record<CardTone, ViewStyle> = {
  default: { backgroundColor: palette.surface, borderColor: palette.border },
  primary: {
    backgroundColor: palette.primaryMuted,
    borderColor: palette.primary,
  },
  blocked: {
    backgroundColor: palette.blockedMuted,
    borderColor: palette.blocked,
  },
  warning: {
    backgroundColor: palette.warningMuted,
    borderColor: palette.warning,
  },
};

interface CardProps extends ViewProps {
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** A soft rounded panel. The tone says what kind of thing it holds; it is never the only signal. */
export function Card({
  tone = 'default',
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <View {...rest} style={[styles.card, TONES[tone], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.lg,
  },
});
