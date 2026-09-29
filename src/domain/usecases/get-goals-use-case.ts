import { Goal } from '../../core/types/domain.types';
import { IGoalsRepository } from '../../data/repositories/i-goals-repository';

export class GetGoalsUseCase {
  constructor(private readonly goalsRepository: IGoalsRepository) {}

  execute(): Promise<Goal[]> {
    return this.goalsRepository.getGoals();
  }
}
