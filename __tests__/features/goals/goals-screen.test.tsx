import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import GoalsScreen from '@features/goals/goals-screen';
import { useGoalsViewModel } from '@features/goals/use-goals-view-model';
import { copy } from '@shared/copy';

jest.mock('@features/goals/use-goals-view-model');
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

const mockUseGoalsViewModel = useGoalsViewModel as jest.Mock;

const goal = (id: string, done = false) => ({
  id,
  title: `Goal ${id}`,
  done,
  createdAt: 1,
});

const vm = (overrides: Record<string, unknown> = {}) => ({
  goals: [],
  draft: '',
  error: null,
  summary: { done: 0, total: 0, label: '' },
  canAdd: false,
  onlineQuotes: false,
  onlineQuotesLoaded: true,
  handleToggleOnlineQuotes: jest.fn(),
  handleOpenAttribution: jest.fn(),
  handleBack: jest.fn(),
  handleChangeDraft: jest.fn(),
  handleAdd: jest.fn(),
  handleToggle: jest.fn(),
  handleRemove: jest.fn(),
  ...overrides,
});

const info = AccessibilityInfo as unknown as {
  isReduceMotionEnabled: jest.Mock;
  addEventListener: jest.Mock;
};

beforeEach(() => {
  info.isReduceMotionEnabled.mockResolvedValue(true);
  info.addEventListener.mockReturnValue({ remove: jest.fn() });
  mockUseGoalsViewModel.mockReturnValue(vm());
});

describe('GoalsScreen', () => {
  it('has the title and a way back', () => {
    const handleBack = jest.fn();
    mockUseGoalsViewModel.mockReturnValue(vm({ handleBack }));
    render(<GoalsScreen />);

    expect(screen.getByRole('header', { name: copy.goals.title })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('invites you to add a first quest when there are none', () => {
    render(<GoalsScreen />);

    expect(screen.getByText(copy.goals.empty.title)).toBeTruthy();
    expect(screen.getByText(copy.goals.empty.body)).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('lists the quests as checkboxes and ticks one', () => {
    const handleToggle = jest.fn();
    mockUseGoalsViewModel.mockReturnValue(
      vm({
        goals: [goal('a'), goal('b', true)],
        summary: { done: 1, total: 2, label: '' },
        handleToggle,
      }),
    );
    render(<GoalsScreen />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(2);

    fireEvent.press(screen.getByRole('checkbox', { name: 'Goal a' }));

    expect(handleToggle).toHaveBeenCalledWith('a');
  });

  it('shows progress for the list', () => {
    mockUseGoalsViewModel.mockReturnValue(
      vm({
        goals: [goal('a'), goal('b', true)],
        summary: { done: 1, total: 2, label: '' },
      }),
    );
    render(<GoalsScreen />);

    expect(screen.getByText(copy.goals.progress(1, 2))).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(
      50,
    );
  });

  it('celebrates when every quest is done', () => {
    mockUseGoalsViewModel.mockReturnValue(
      vm({
        goals: [goal('a', true), goal('b', true)],
        summary: { done: 2, total: 2, label: '' },
      }),
    );
    render(<GoalsScreen />);

    expect(screen.getByText(copy.goals.allDone)).toBeTruthy();
  });

  it('removes a quest', () => {
    const handleRemove = jest.fn();
    mockUseGoalsViewModel.mockReturnValue(
      vm({
        goals: [goal('a')],
        summary: { done: 0, total: 1, label: '' },
        handleRemove,
      }),
    );
    render(<GoalsScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Remove goal Goal a' }));

    expect(handleRemove).toHaveBeenCalledWith('a');
  });

  it('types into the box and adds with the button', () => {
    const handleChangeDraft = jest.fn();
    const handleAdd = jest.fn();
    mockUseGoalsViewModel.mockReturnValue(
      vm({ draft: 'Read', canAdd: true, handleChangeDraft, handleAdd }),
    );
    render(<GoalsScreen />);

    fireEvent.changeText(
      screen.getByLabelText(copy.goals.inputA11y),
      'Read more',
    );
    fireEvent.press(screen.getByRole('button', { name: copy.goals.addA11y }));

    expect(handleChangeDraft).toHaveBeenCalledWith('Read more');
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('adds from the keyboard too', () => {
    const handleAdd = jest.fn();
    mockUseGoalsViewModel.mockReturnValue(
      vm({ draft: 'Read', canAdd: true, handleAdd }),
    );
    render(<GoalsScreen />);

    fireEvent(screen.getByLabelText(copy.goals.inputA11y), 'submitEditing');

    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('cannot add an empty quest', () => {
    const handleAdd = jest.fn();
    mockUseGoalsViewModel.mockReturnValue(vm({ canAdd: false, handleAdd }));
    render(<GoalsScreen />);

    const add = screen.getByRole('button', { name: copy.goals.addA11y });
    fireEvent.press(add);

    expect(handleAdd).not.toHaveBeenCalled();
    expect(add.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('shows a problem as an alert', () => {
    mockUseGoalsViewModel.mockReturnValue(
      vm({ error: 'You can keep up to 20 goals.' }),
    );
    render(<GoalsScreen />);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('You can keep up to 20 goals.')).toBeTruthy();
  });
});

describe('GoalsScreen: online quotes', () => {
  it('explains the setting in plain words and shows it off by default', () => {
    render(<GoalsScreen />);

    expect(screen.getByText(copy.goals.quotes.plain.body)).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: copy.goals.quotes.switchLabel }).props
        .accessibilityState,
    ).toMatchObject({ checked: false });
  });

  it('turns on when flipped', () => {
    const handleToggleOnlineQuotes = jest.fn();
    mockUseGoalsViewModel.mockReturnValue(vm({ handleToggleOnlineQuotes }));
    render(<GoalsScreen />);

    fireEvent.press(
      screen.getByRole('switch', { name: copy.goals.quotes.switchLabel }),
    );

    expect(handleToggleOnlineQuotes).toHaveBeenCalledWith(true);
  });

  it('cannot be flipped until the saved setting has been read', () => {
    const handleToggleOnlineQuotes = jest.fn();
    mockUseGoalsViewModel.mockReturnValue(
      vm({ onlineQuotesLoaded: false, handleToggleOnlineQuotes }),
    );
    render(<GoalsScreen />);

    fireEvent.press(
      screen.getByRole('switch', { name: copy.goals.quotes.switchLabel }),
    );

    expect(handleToggleOnlineQuotes).not.toHaveBeenCalled();
  });

  it('shows the attribution link only while it is on', () => {
    const handleOpenAttribution = jest.fn();
    mockUseGoalsViewModel.mockReturnValue(vm({ onlineQuotes: false }));
    const { rerender } = render(<GoalsScreen />);
    expect(screen.queryByRole('link')).toBeNull();

    mockUseGoalsViewModel.mockReturnValue(
      vm({ onlineQuotes: true, handleOpenAttribution }),
    );
    rerender(<GoalsScreen />);

    fireEvent.press(
      screen.getByRole('link', { name: copy.goals.quotes.attribution }),
    );

    expect(handleOpenAttribution).toHaveBeenCalledTimes(1);
  });
});
