import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

interface EmojiProps {
  children: string;
  size?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Decoration only. Hidden from screen readers so they do not announce "melting face" in the middle
 * of a headline; anything that matters is said in plain words next to it.
 */
export function Emoji({ children, size = 28, style }: EmojiProps) {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ fontSize: size }, style]}
    >
      {children}
    </Text>
  );
}
