import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, Text } from 'react-native';
import * as haptics from '@shared/motion/haptics';
import { Card } from '@shared/ui/card';
import { Chip } from '@shared/ui/chip';
import { ConfettiBurst } from '@shared/ui/confetti-burst';
import { GoalRow } from '@shared/ui/goal-row';
import { PressableScale } from '@shared/ui/pressable-scale';
import { Toggle } from '@shared/ui/toggle';
import { palette } from '@shared/theme/tokens';

// The confetti is hidden from screen readers on purpose, and Testing Library honours that, so it
// has to be asked for explicitly (otherwise "is it absent?" checks would pass for the wrong reason).
const HIDDEN = { includeHiddenElements: true };

const info = AccessibilityInfo as unknown as {
  isReduceMotionEnabled: jest.Mock;
  addEventListener: jest.Mock;
};

beforeEach(() => {
  info.isReduceMotionEnabled.mockResolvedValue(false);
  info.addEventListener.mockReturnValue({ remove: jest.fn() });
  jest.spyOn(haptics, 'tick').mockImplementation(() => undefined);
  jest.spyOn(haptics, 'success').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('PressableScale', () => {
  it('is a labelled button that can be pressed', () => {
    const onPress = jest.fn();
    render(
      <PressableScale accessibilityLabel="Add app" onPress={onPress}>
        <Text>+</Text>
      </PressableScale>,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Add app' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('cannot be pressed while disabled, and says so to a screen reader', () => {
    const onPress = jest.fn();
    render(
      <PressableScale accessibilityLabel="Save" onPress={onPress} disabled>
        <Text>Save</Text>
      </PressableScale>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('has a touch target of at least 48dp even when it looks small', () => {
    render(
      <PressableScale accessibilityLabel="Tiny" onPress={() => undefined}>
        <Text>x</Text>
      </PressableScale>,
    );

    const { hitSlop } = screen.getByRole('button', { name: 'Tiny' }).props;

    expect(hitSlop).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
  });

  it('can carry another role, such as a link', () => {
    render(
      <PressableScale
        accessibilityLabel="ZenQuotes"
        accessibilityRole="link"
        onPress={() => undefined}
      >
        <Text>ZenQuotes</Text>
      </PressableScale>,
    );

    expect(screen.getByRole('link', { name: 'ZenQuotes' })).toBeTruthy();
  });
});

describe('Card', () => {
  it('shows its content', () => {
    render(
      <Card>
        <Text>inside</Text>
      </Card>,
    );

    expect(screen.getByText('inside')).toBeTruthy();
  });

  it('draws a blocked card with the blocked colour, not the default border', () => {
    render(
      <Card tone="blocked" testID="card">
        <Text>x</Text>
      </Card>,
    );

    const style = screen.getByTestId('card').props.style;
    expect(JSON.stringify(style)).toContain(palette.blocked);
  });
});

describe('Chip', () => {
  it('is a radio option that reports whether it is selected', () => {
    render(<Chip label="10 min" selected onPress={() => undefined} />);

    expect(
      screen.getByRole('radio', { name: '10 min' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('does not rely on colour alone: a selected chip carries a check mark', () => {
    render(<Chip label="10 min" selected onPress={() => undefined} />);

    expect(screen.getByText('✓ 10 min')).toBeTruthy();
  });

  it('shows no check mark when not selected, and still selects on press', () => {
    const onPress = jest.fn();
    render(<Chip label="10 min" selected={false} onPress={onPress} />);

    fireEvent.press(screen.getByRole('radio', { name: '10 min' }));

    expect(screen.queryByText('✓ 10 min')).toBeNull();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('gives a light tick when chosen', () => {
    render(<Chip label="5 min" selected={false} onPress={() => undefined} />);

    fireEvent.press(screen.getByRole('radio', { name: '5 min' }));

    expect(haptics.tick).toHaveBeenCalledTimes(1);
  });
});

describe('Toggle', () => {
  it('is a switch that exposes its state', () => {
    render(
      <Toggle
        value
        accessibilityLabel="Monitoring"
        onValueChange={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('switch', { name: 'Monitoring' }).props
        .accessibilityState,
    ).toMatchObject({ checked: true });
  });

  it('asks for the opposite value, once per press', () => {
    const onValueChange = jest.fn();
    render(
      <Toggle
        value={false}
        accessibilityLabel="Monitoring"
        onValueChange={onValueChange}
      />,
    );

    fireEvent.press(screen.getByRole('switch', { name: 'Monitoring' }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('ticks when pressed', () => {
    render(
      <Toggle
        value={false}
        accessibilityLabel="Monitoring"
        onValueChange={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByRole('switch', { name: 'Monitoring' }));

    expect(haptics.tick).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while disabled', () => {
    const onValueChange = jest.fn();
    render(
      <Toggle
        value
        disabled
        accessibilityLabel="Monitoring"
        onValueChange={onValueChange}
      />,
    );

    fireEvent.press(screen.getByRole('switch', { name: 'Monitoring' }));

    expect(onValueChange).not.toHaveBeenCalled();
    expect(haptics.tick).not.toHaveBeenCalled();
  });
});

describe('ConfettiBurst', () => {
  it('draws decorative particles that a screen reader skips', () => {
    render(<ConfettiBurst onDone={() => undefined} testID="burst" />);

    const burst = screen.getByTestId('burst', HIDDEN);
    expect(burst.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(burst.props.accessibilityElementsHidden).toBe(true);
  });

  it('reports that it is finished once the animation has played', async () => {
    jest.useFakeTimers();
    const onDone = jest.fn();
    render(<ConfettiBurst onDone={onDone} testID="burst" />);

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('draws nothing, but still finishes, when reduce-motion is on', async () => {
    info.isReduceMotionEnabled.mockResolvedValue(true);
    const onDone = jest.fn();
    render(<ConfettiBurst onDone={onDone} testID="burst" />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByTestId('burst', HIDDEN)).toBeNull();
    expect(onDone).toHaveBeenCalled();
  });
});

describe('GoalRow', () => {
  const renderRow = (
    props: Partial<React.ComponentProps<typeof GoalRow>> = {},
  ) =>
    render(
      <GoalRow
        title="Finish the report"
        done={false}
        onToggle={jest.fn()}
        onRemove={jest.fn()}
        {...props}
      />,
    );

  it('is a checkbox named after the goal, with its state', () => {
    renderRow({ done: true });

    expect(
      screen.getByRole('checkbox', { name: 'Finish the report' }).props
        .accessibilityState,
    ).toMatchObject({ checked: true });
  });

  it('ticking a goal off toggles it and celebrates', () => {
    const onToggle = jest.fn();
    renderRow({ onToggle });

    fireEvent.press(
      screen.getByRole('checkbox', { name: 'Finish the report' }),
    );

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(haptics.success).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('goal-confetti', HIDDEN)).toBeTruthy();
  });

  it('unticking a goal only gives a light tick, with no confetti', () => {
    renderRow({ done: true });

    fireEvent.press(
      screen.getByRole('checkbox', { name: 'Finish the report' }),
    );

    expect(haptics.tick).toHaveBeenCalledTimes(1);
    expect(haptics.success).not.toHaveBeenCalled();
    expect(screen.queryByTestId('goal-confetti', HIDDEN)).toBeNull();
  });

  it('does not celebrate just because it was drawn as done', () => {
    renderRow({ done: true });

    expect(haptics.success).not.toHaveBeenCalled();
    expect(screen.queryByTestId('goal-confetti', HIDDEN)).toBeNull();
  });

  it('has a labelled remove button when removal is offered', () => {
    const onRemove = jest.fn();
    renderRow({ onRemove });

    fireEvent.press(
      screen.getByRole('button', { name: 'Remove goal Finish the report' }),
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('has no remove button when removal is not offered (the break screen)', () => {
    renderRow({ onRemove: undefined });

    expect(screen.queryByRole('button')).toBeNull();
  });
});
