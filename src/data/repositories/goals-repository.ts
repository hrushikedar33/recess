import { MAX_GOALS } from '../../core/constants/app.constants';
import { Goal } from '../../core/types/domain.types';
import { logger } from '../../core/utils/logger';
import { MonitorAdapter } from '../local/native/monitor-adapter';
import { GoalsStorage } from '../local/storage/goals-storage';
import { IGoalsRepository } from './i-goals-repository';

export class GoalsRepository implements IGoalsRepository {
  async getGoals(): Promise<Goal[]> {
    return GoalsStorage.getGoals();
  }

  async saveGoals(goals: Goal[]): Promise<void> {
    await GoalsStorage.saveGoals(goals);
    await this.pushToNative(goals);
  }

  async syncToNative(): Promise<void> {
    const goals = await GoalsStorage.readGoals();
    if (goals === null) {
      // Unreadable is not "no goals": leave the ones native already has.
      logger.warn(
        '[GoalsRepository] Stored goals are unreadable; leaving native as it is',
      );
      return;
    }
    await this.pushToNative(goals);
  }

  /**
   * Native holds a mirror so it can show the goals when JS is not running. A failed push must not
   * fail the user's change: it is logged, and the next app start re-syncs.
   */
  private async pushToNative(goals: Goal[]): Promise<void> {
    try {
      await MonitorAdapter.syncGoals(goals.slice(0, MAX_GOALS));
    } catch (error) {
      logger.warn('[GoalsRepository] Could not sync goals to native', error);
    }
  }
}
