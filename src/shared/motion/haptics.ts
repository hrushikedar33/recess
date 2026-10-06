import { Platform, Vibration } from 'react-native';

const safely = (pattern: number | number[]) => {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    Vibration.vibrate(pattern);
  } catch {
    // No vibrator, or the system refused: feedback is a nicety, never a reason to fail.
  }
};

/** A very short tap for toggles and selections. */
export const tick = () => safely(10);

/** Two quick beats for something that worked (a goal ticked off). */
export const success = () => safely([0, 12, 50, 18]);
