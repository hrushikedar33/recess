import { IGoalsRepository } from '../../data/repositories/i-goals-repository';

export class SyncGoalsUseCase {
  constructor(private readonly goalsRepository: IGoalsRepository) {}

  execute(): Promise<void> {
    return this.goalsRepository.syncToNative();
  }
}
