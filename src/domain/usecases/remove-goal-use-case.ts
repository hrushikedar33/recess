import { Goal } from '../../core/types/domain.types';
import { IGoalsRepository } from '../../data/repositories/i-goals-repository';

export class RemoveGoalUseCase {
  constructor(private readonly goalsRepository: IGoalsRepository) {}

  async execute(id: string): Promise<Goal[]> {
    const goals = await this.goalsRepository.getGoals();
    if (!goals.some((goal) => goal.id === id)) {
      return goals;
    }

    const updated = goals.filter((goal) => goal.id !== id);
    await this.goalsRepository.saveGoals(updated);
    return updated;
  }
}
