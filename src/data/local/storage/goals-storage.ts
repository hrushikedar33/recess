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
  /** Unreadable data is treated as "no goals"; entries that are not goals are dropped. */
  getGoals: async (): Promise<Goal[]> => {
    try {
      const raw = await AsyncStorageAdapter.getItem(GOALS_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(isGoal) : [];
    } catch {
      return [];
    }
  },

  saveGoals: async (goals: Goal[]): Promise<void> => {
    await AsyncStorageAdapter.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  },
};
