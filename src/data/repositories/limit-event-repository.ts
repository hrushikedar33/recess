import { LimitEvent } from '../../core/types/native.types';
import { MonitorAdapter } from '../local/native/monitor-adapter';
import { ILimitEventRepository } from './i-limit-event-repository';

export class LimitEventRepository implements ILimitEventRepository {
  getLastLimitEvent(): Promise<LimitEvent | null> {
    return MonitorAdapter.getLimitEvent();
  }
}
