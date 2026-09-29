import { GOALS_STORAGE_KEY } from '../../../core/constants/storage.keys';
import { Goal } from '../../../core/types/domain.types';
import { AsyncStorageAdapter } from './async-storage-adapter';

const isGoal = (value: unknown): value is Goal => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.done === 'boolean' &&
    typeof candidate.createdAt === 'number'
  );
};

export const GoalsStorage = {
  /**
   * The stored goals (entries that are not goals are dropped), an empty list when nothing was ever
   * stored, or null when what is stored cannot be read at all.
   */
  readGoals: async (): Promise<Goal[] | null> => {
    try {
      const raw = await AsyncStorageAdapter.getItem(GOALS_STORAGE_KEY);
      if (raw === null) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isGoal) : null;
    } catch {
      return null;
    }
  },

  /** For display and editing: unreadable storage shows as no goals. */
  getGoals: async (): Promise<Goal[]> => (await GoalsStorage.readGoals()) ?? [],

  saveGoals: async (goals: Goal[]): Promise<void> => {
    await AsyncStorageAdapter.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  },
};
