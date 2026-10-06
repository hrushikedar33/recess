import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { success, tick } from '../motion/haptics';
import { staggerDelay } from '../motion/stagger';
import { useEntrance } from '../motion/use-entrance';
import { useReduceMotion } from '../motion/use-reduce-motion';
import { palette, radius, space, typography } from '../theme/tokens';
import { ConfettiBurst } from './confetti-burst';
import { PressableScale } from './pressable-scale';

interface GoalRowProps {
  title: string;
  done: boolean;
  onToggle: () => void;
  /** Leave out where removing makes no sense (the break screen). */
  onRemove?: () => void;
  /** Position in the list, for the staggered entrance. */
  index?: number;
}

const BOX = 28;

/**
 * One goal: a big tappable row with a checkbox that pops, a strike-through and a little confetti
 * when you tick it off. The celebration comes from the tap, never from the data changing, so a
 * list that merely loads as "done" stays quiet.
 */
export function GoalRow({
  title,
  done,
  onToggle,
  onRemove,
  index = 0,
}: GoalRowProps) {
  const reduce = useReduceMotion();
  const entrance = useEntrance(staggerDelay(index), 12);
  const [fill] = useState(() => new Animated.Value(done ? 1 : 0));
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (reduce) {
      fill.setValue(done ? 1 : 0);
      return;
    }
    Animated.spring(fill, {
      toValue: done ? 1 : 0,
      speed: 28,
      bounciness: 14,
      useNativeDriver: true,
    }).start();
  }, [done, reduce, fill]);

  const handlePress = () => {
    if (done) {
      tick();
    } else {
      success();
      setBurst(true);
    }
    onToggle();
  };

  return (
    <Animated.View style={[styles.row, entrance]}>
      <PressableScale
        accessibilityRole="checkbox"
        accessibilityLabel={title}
        accessibilityState={{ checked: done }}
        onPress={handlePress}
        style={styles.main}
      >
        <View style={styles.box}>
          <Animated.View
            style={[
              styles.fill,
              { opacity: fill, transform: [{ scale: fill }] },
            ]}
          />
          <Animated.Text style={[styles.check, { opacity: fill }]}>
            ✓
          </Animated.Text>
          {burst && (
            <ConfettiBurst
              testID="goal-confetti"
              onDone={() => setBurst(false)}
            />
          )}
        </View>
        <Text style={[styles.title, done && styles.titleDone]}>{title}</Text>
      </PressableScale>
      {onRemove && (
        <PressableScale
          accessibilityLabel={`Remove goal ${title}`}
          onPress={onRemove}
          style={styles.remove}
        >
          <Text style={styles.removeText}>✕</Text>
        </PressableScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginBottom: space.sm,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: BOX / 2,
    borderWidth: 2,
    borderColor: palette.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    margin: -2,
    borderRadius: BOX / 2,
    backgroundColor: palette.primary,
  },
  check: {
    color: palette.onPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  title: {
    ...typography.body,
    flex: 1,
    fontSize: 16,
    color: palette.textPrimary,
  },
  titleDone: {
    color: palette.textSecondary,
    textDecorationLine: 'line-through',
  },
  remove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: space.sm,
  },
  removeText: {
    color: palette.textSecondary,
    fontSize: 16,
  },
});
