import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface GlowProps {
  /** A very faint colour (low alpha): the rings add up towards the centre. */
  color: string;
  size?: number;
  rings?: number;
  style?: StyleProp<ViewStyle>;
}

/** A soft round glow made of stacked translucent discs, standing in for a blurred gradient. */
export function Glow({ color, size = 320, rings = 8, style }: GlowProps) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, { width: size, height: size }, style]}
    >
      {Array.from({ length: rings }, (_, index) => {
        const diameter = size * (1 - index / rings);
        return (
          <View
            // The rings never reorder.
            key={index}
            style={[
              styles.ring,
              {
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                backgroundColor: color,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
});
