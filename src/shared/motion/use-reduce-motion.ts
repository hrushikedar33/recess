import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * True when the user asked the system to cut down on motion. Everything that animates in Recess
 * checks this: with it on, things appear in their final state and nothing loops.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled())
      .then((enabled) => {
        if (active) {
          setReduce(Boolean(enabled));
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => {
        if (active) {
          setReduce(enabled);
        }
      },
    );
    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  return reduce;
}
