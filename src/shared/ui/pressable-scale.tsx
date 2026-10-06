import React, { ReactNode } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { usePressScale } from '../motion/use-press-scale';

/** Looks small, touches big: 8 dp of invisible padding on every side keeps targets at 48 dp. */
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export interface PressableScaleProps
  extends Omit<PressableProps, 'style' | 'children' | 'accessibilityLabel'> {
  /** Required: an icon or emoji is never the only name a screen reader gets. */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** The base for every tappable thing: a button with a springy squish and a proper accessible name. */
export function PressableScale({
  style,
  children,
  disabled,
  accessibilityRole = 'button',
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const press = usePressScale();

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole={accessibilityRole}
      onPressIn={(event: GestureResponderEvent) => {
        press.onPressIn();
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        press.onPressOut();
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale: press.scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
