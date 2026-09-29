import { Goal } from '../../core/types/domain.types';
import { IGoalsRepository } from '../../data/repositories/i-goals-repository';

export class ToggleGoalUseCase {
  constructor(private readonly goalsRepository: IGoalsRepository) {}

  async execute(id: string): Promise<Goal[]> {
    const goals = await this.goalsRepository.getGoals();
    if (!goals.some((goal) => goal.id === id)) {
      return goals;
    }

    const updated = goals.map((goal) =>
      goal.id === id ? { ...goal, done: !goal.done } : goal,
    );
    await this.goalsRepository.saveGoals(updated);
    return updated;
  }
}
