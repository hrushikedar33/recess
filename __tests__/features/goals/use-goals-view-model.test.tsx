import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { NativeModules } from 'react-native';
import { useCases } from '@app/di';
import { ErrorMessages } from '@core/errors/error-messages';
import { GOALS_STORAGE_KEY } from '@core/constants/storage.keys';
import { useGoalsViewModel } from '@features/goals/use-goals-view-model';

// Run the "on focus" effect once on mount, without needing a navigation container.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    // Mimics "run when the screen gains focus" as "run once on mount".
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useFocusEffect: (effect: () => void) => useEffect(() => effect(), []),
  };
});

const native = NativeModules.MonitorConfigModule;

const storedGoal = (id: string, done = false) => ({
  id,
  title: `Goal ${id}`,
  done,
  createdAt: 1,
});

const seed = (goals: unknown[]) =>
  AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));

const type = (
  result: { current: ReturnType<typeof useGoalsViewModel> },
  text: string,
) => act(() => result.current.handleChangeDraft(text));

const add = (result: { current: ReturnType<typeof useGoalsViewModel> }) =>
  act(async () => {
    await result.current.handleAdd();
  });

describe('useGoalsViewModel', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('loads the stored goals when the screen is focused', async () => {
    await seed([storedGoal('a'), storedGoal('b', true)]);

    const { result } = renderHook(() => useGoalsViewModel());

    await waitFor(() => expect(result.current.goals).toHaveLength(2));
    expect(result.current.summary.label).toBe('1 of 2 done');
  });

  it('starts with no goals and nothing to add', async () => {
    const { result } = renderHook(() => useGoalsViewModel());

    await waitFor(() => expect(native.syncGoals).not.toHaveBeenCalled());
    expect(result.current.goals).toEqual([]);
    expect(result.current.canAdd).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('does not offer to add a goal that is only whitespace', () => {
    const { result } = renderHook(() => useGoalsViewModel());

    type(result, '    ');

    expect(result.current.canAdd).toBe(false);
  });

  it('adds the typed goal, clears the input and stores it', async () => {
    const { result } = renderHook(() => useGoalsViewModel());

    type(result, '  Finish the report ');
    expect(result.current.canAdd).toBe(true);
    await add(result);

    expect(result.current.goals.map((g) => g.title)).toEqual([
      'Finish the report',
    ]);
    expect(result.current.draft).toBe('');
    expect(result.current.error).toBeNull();
    expect(await AsyncStorage.getItem(GOALS_STORAGE_KEY)).toContain(
      'Finish the report',
    );
  });

  it('shows a message and keeps the input when the goal is blank', async () => {
    const { result } = renderHook(() => useGoalsViewModel());

    type(result, '   ');
    await add(result);

    expect(result.current.error).toBe(ErrorMessages.goalEmpty);
    expect(result.current.draft).toBe('   ');
    expect(result.current.goals).toEqual([]);
  });

  it('shows the limit message on the 21st goal', async () => {
    await seed(Array.from({ length: 20 }, (_, i) => storedGoal(`g${i}`)));
    const { result } = renderHook(() => useGoalsViewModel());
    await waitFor(() => expect(result.current.goals).toHaveLength(20));

    type(result, 'One too many');
    await add(result);

    expect(result.current.error).toBe(ErrorMessages.goalLimitReached);
    expect(result.current.goals).toHaveLength(20);
  });

  it('clears the message as soon as the user edits the input', async () => {
    const { result } = renderHook(() => useGoalsViewModel());
    type(result, ' ');
    await add(result);
    expect(result.current.error).not.toBeNull();

    type(result, 'A');

    expect(result.current.error).toBeNull();
  });

  it('ticks and unticks a goal and updates the summary', async () => {
    await seed([storedGoal('a'), storedGoal('b')]);
    const { result } = renderHook(() => useGoalsViewModel());
    await waitFor(() => expect(result.current.goals).toHaveLength(2));

    await act(async () => {
      await result.current.handleToggle('a');
    });
    expect(result.current.summary.label).toBe('1 of 2 done');

    await act(async () => {
      await result.current.handleToggle('a');
    });
    expect(result.current.summary.label).toBe('0 of 2 done');
  });

  it('removes a goal', async () => {
    await seed([storedGoal('a'), storedGoal('b')]);
    const { result } = renderHook(() => useGoalsViewModel());
    await waitFor(() => expect(result.current.goals).toHaveLength(2));

    await act(async () => {
      await result.current.handleRemove('a');
    });

    expect(result.current.goals.map((g) => g.id)).toEqual(['b']);
  });

  it('shows a generic message when something unexpected fails', async () => {
    const warn = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const addGoal = jest
      .spyOn(useCases.addGoal, 'execute')
      .mockRejectedValueOnce(new Error('disk exploded'));
    const { result } = renderHook(() => useGoalsViewModel());

    type(result, 'Anything');
    await add(result);

    expect(result.current.error).toBe(ErrorMessages.generic);
    addGoal.mockRestore();
    warn.mockRestore();
  });
});
