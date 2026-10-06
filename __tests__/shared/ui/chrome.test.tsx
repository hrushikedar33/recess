import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, Text } from 'react-native';
import { Pill } from '@shared/ui/pill';
import { ProgressBar } from '@shared/ui/progress-bar';
import { ScreenHeader } from '@shared/ui/screen-header';

const info = AccessibilityInfo as unknown as {
  isReduceMotionEnabled: jest.Mock;
  addEventListener: jest.Mock;
};

beforeEach(() => {
  info.isReduceMotionEnabled.mockResolvedValue(true);
  info.addEventListener.mockReturnValue({ remove: jest.fn() });
});

describe('ScreenHeader', () => {
  it('shows the title as the screen heading', () => {
    render(<ScreenHeader title="Main quests" />);

    expect(screen.getByRole('header', { name: 'Main quests' })).toBeTruthy();
  });

  it('has a back button when it can go back, with a plain name', () => {
    const onBack = jest.fn();
    render(<ScreenHeader title="Main quests" onBack={onBack} />);

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('has no back button on a screen that cannot go back', () => {
    render(<ScreenHeader title="Main quests" />);

    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
  });

  it('shows what is put on the right', () => {
    render(<ScreenHeader title="Main quests" right={<Text>3 to go</Text>} />);

    expect(screen.getByText('3 to go')).toBeTruthy();
  });
});

describe('Pill', () => {
  it('shows its text', () => {
    render(<Pill label="10 min/sesh" />);

    expect(screen.getByText('10 min/sesh')).toBeTruthy();
  });

  it('can be named for a screen reader differently from what it shows', () => {
    render(<Pill label="60m/day" accessibilityLabel="60 minutes a day" />);

    expect(screen.getByLabelText('60 minutes a day')).toBeTruthy();
  });
});

describe('ProgressBar', () => {
  it('reports its progress as a percentage to a screen reader', () => {
    render(<ProgressBar progress={0.4} label="2 of 5 done" />);

    const bar = screen.getByRole('progressbar', { name: '2 of 5 done' });
    expect(bar.props.accessibilityValue).toMatchObject({
      min: 0,
      max: 100,
      now: 40,
    });
  });

  it('never goes below empty or above full', () => {
    const { rerender } = render(<ProgressBar progress={-1} label="x" />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(
      0,
    );

    rerender(<ProgressBar progress={3} label="x" />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(
      100,
    );
  });

  it('treats a bad number as empty', () => {
    render(<ProgressBar progress={Number.NaN} label="x" />);

    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(
      0,
    );
  });
});
