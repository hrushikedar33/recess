import {
  MAX_GOALS,
  MAX_GOAL_TITLE_LENGTH,
} from '../../core/constants/app.constants';
import { AppError } from '../../core/errors/app-error';
import { ErrorMessages } from '../../core/errors/error-messages';
import { Goal } from '../../core/types/domain.types';
import { IGoalsRepository } from '../../data/repositories/i-goals-repository';

const defaultIdFactory = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export class AddGoalUseCase {
  constructor(
    private readonly goalsRepository: IGoalsRepository,
    private readonly idFactory: () => string = defaultIdFactory,
    private readonly clock: () => number = Date.now,
  ) {}

  async execute(rawTitle: string): Promise<Goal[]> {
    const title = rawTitle.trim();
    if (title.length === 0) {
      throw new AppError('GOAL_EMPTY', ErrorMessages.goalEmpty);
    }
    if (title.length > MAX_GOAL_TITLE_LENGTH) {
      throw new AppError('GOAL_TOO_LONG', ErrorMessages.goalTooLong);
    }

    const goals = await this.goalsRepository.getGoals();
    if (goals.length >= MAX_GOALS) {
      throw new AppError('GOAL_LIMIT_REACHED', ErrorMessages.goalLimitReached);
    }

    const updated = [
      ...goals,
      { id: this.idFactory(), title, done: false, createdAt: this.clock() },
    ];
    await this.goalsRepository.saveGoals(updated);
    return updated;
  }
}
