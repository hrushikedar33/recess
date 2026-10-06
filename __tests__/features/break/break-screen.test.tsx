import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import BreakScreen from '@features/break/break-screen';
import { useBreakViewModel } from '@features/break/use-break-view-model';
import { copy } from '@shared/copy';

jest.mock('@features/break/use-break-view-model');
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

const mockUseBreakViewModel = useBreakViewModel as jest.Mock;

const goal = (id: string, done = false) => ({
  id,
  title: `Goal ${id}`,
  done,
  createdAt: 1,
});

const vm = (overrides: Record<string, unknown> = {}) => ({
  status: 'active',
  event: {
    packageName: 'com.instagram.android',
    appName: 'Instagram',
    reason: 'SESSION_COOLDOWN',
    blockedUntilMs: 1,
    createdAtMs: 1,
    quote: {
      text: 'Confine yourself to the present.',
      author: 'Marcus Aurelius',
    },
  },
  goals: [goal('a'), goal('b', true), goal('c')],
  isDaily: false,
  headline: copy.break.session.headline,
  detail: copy.break.session.detail('Instagram'),
  countdownText: '1:30',
  handleToggleGoal: jest.fn(),
  handleDone: jest.fn(),
  ...overrides,
});

const info = AccessibilityInfo as unknown as {
  isReduceMotionEnabled: jest.Mock;
  addEventListener: jest.Mock;
};

beforeEach(() => {
  info.isReduceMotionEnabled.mockResolvedValue(true); // keep the tests free of animation timers
  info.addEventListener.mockReturnValue({ remove: jest.fn() });
  mockUseBreakViewModel.mockReturnValue(vm());
});

describe('BreakScreen while a break is on', () => {
  it('has the headline as a real heading, free of decoration in its name', () => {
    render(<BreakScreen />);

    expect(
      screen.getByRole('header', { name: copy.break.session.headline }),
    ).toBeTruthy();
    expect(
      screen.getByText(copy.break.session.detail('Instagram')),
    ).toBeTruthy();
  });

  it('shows the time left in a way a screen reader can say', () => {
    render(<BreakScreen />);

    expect(screen.getByText('1:30')).toBeTruthy();
    expect(
      screen.getByLabelText(copy.break.countdownA11y('1:30')),
    ).toBeTruthy();
  });

  it('shows the quote and who said it', () => {
    render(<BreakScreen />);

    expect(screen.getByText('“Confine yourself to the present.”')).toBeTruthy();
    expect(
      screen.getByText(copy.break.quoteAuthor('Marcus Aurelius')),
    ).toBeTruthy();
  });

  it('lists every goal as a checkbox you can tick right here', () => {
    const handleToggleGoal = vm().handleToggleGoal;
    mockUseBreakViewModel.mockReturnValue(vm({ handleToggleGoal }));
    render(<BreakScreen />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(
      screen.getByRole('checkbox', { name: 'Goal b' }).props.accessibilityState,
    ).toMatchObject({ checked: true });

    fireEvent.press(screen.getByRole('checkbox', { name: 'Goal a' }));

    expect(handleToggleGoal).toHaveBeenCalledWith('a');
  });

  it('shows how far along you are', () => {
    render(<BreakScreen />);

    expect(screen.getByText(copy.break.progress(1, 3))).toBeTruthy();
  });

  it('celebrates when every goal is done, and still offers the way out', () => {
    mockUseBreakViewModel.mockReturnValue(
      vm({ goals: [goal('a', true), goal('b', true)] }),
    );
    render(<BreakScreen />);

    expect(screen.getByText(copy.break.allDone)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: copy.break.leaveA11y }),
    ).toBeTruthy();
  });

  it('says what to do when there are no goals yet', () => {
    mockUseBreakViewModel.mockReturnValue(vm({ goals: [] }));
    render(<BreakScreen />);

    expect(screen.getByText(copy.break.goalsEmpty)).toBeTruthy();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('has one clear way out that goes home', () => {
    const handleDone = jest.fn();
    mockUseBreakViewModel.mockReturnValue(vm({ handleDone }));
    render(<BreakScreen />);

    fireEvent.press(screen.getByRole('button', { name: copy.break.leaveA11y }));

    expect(handleDone).toHaveBeenCalledTimes(1);
  });
});

describe('BreakScreen in its other states', () => {
  it('shows no countdown for a daily limit, only the wrap-up', () => {
    mockUseBreakViewModel.mockReturnValue(
      vm({
        isDaily: true,
        countdownText: '',
        headline: copy.break.daily.headline,
        detail: copy.break.daily.detail('Instagram'),
      }),
    );
    render(<BreakScreen />);

    expect(
      screen.getByRole('header', { name: copy.break.daily.headline }),
    ).toBeTruthy();
    expect(screen.queryByLabelText(/Time left/)).toBeNull();
  });

  it('says the break is over once it is', () => {
    mockUseBreakViewModel.mockReturnValue(
      vm({
        status: 'over',
        countdownText: '',
        headline: copy.break.over.headline,
        detail: copy.break.over.detail('Instagram'),
      }),
    );
    render(<BreakScreen />);

    expect(
      screen.getByRole('header', { name: copy.break.over.headline }),
    ).toBeTruthy();
    expect(screen.queryByLabelText(/Time left/)).toBeNull();
  });

  it('shows a plain empty state with a close button when there is no break', () => {
    const handleDone = jest.fn();
    mockUseBreakViewModel.mockReturnValue(
      vm({
        status: 'none',
        event: null,
        goals: [],
        countdownText: '',
        headline: copy.break.none.headline,
        detail: copy.break.none.detail,
        handleDone,
      }),
    );
    render(<BreakScreen />);

    expect(screen.getByText(copy.break.none.detail)).toBeTruthy();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    fireEvent.press(screen.getByRole('button', { name: copy.break.closeA11y }));

    expect(handleDone).toHaveBeenCalledTimes(1);
  });
});
