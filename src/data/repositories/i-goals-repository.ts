import { Goal } from '../../core/types/domain.types';

export interface IGoalsRepository {
  getGoals(): Promise<Goal[]>;
  saveGoals(goals: Goal[]): Promise<void>;
  /** Pushes the stored goals to the native monitor, whether or not anything changed. */
  syncToNative(): Promise<void>;
}
