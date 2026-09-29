import { LimitEvent } from '../../core/types/native.types';

export interface ILimitEventRepository {
  getLastLimitEvent(): Promise<LimitEvent | null>;
}
