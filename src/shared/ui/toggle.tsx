import React from 'react';
import { tick } from '../motion/haptics';
import { PressableScale } from './pressable-scale';
import { ToggleTrack } from './toggle-track';

interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

/** A switch with a sliding thumb. Reports the opposite of its value, once per press. */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
}: ToggleProps) {
  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        tick();
        onValueChange(!value);
      }}
    >
      <ToggleTrack value={value} dim={disabled} />
    </PressableScale>
  );
}
