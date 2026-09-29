import { LimitEvent } from '../../core/types/native.types';
import { ILimitEventRepository } from '../../data/repositories/i-limit-event-repository';

export class GetLimitEventUseCase {
  constructor(private readonly limitEventRepository: ILimitEventRepository) {}

  execute(): Promise<LimitEvent | null> {
    return this.limitEventRepository.getLastLimitEvent();
  }
}
