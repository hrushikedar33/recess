import { Goal } from '../../core/types/domain.types';

export interface IGoalsRepository {
  getGoals(): Promise<Goal[]>;
  saveGoals(goals: Goal[]): Promise<void>;
}
