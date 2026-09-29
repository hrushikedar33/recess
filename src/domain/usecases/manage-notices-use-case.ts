import {
  INoticesRepository,
  NoticeState,
} from '../../data/repositories/i-notices-repository';

/** Which one-time notices the user has dismissed, and dismissing them. */
export class ManageNoticesUseCase {
  constructor(private readonly noticesRepository: INoticesRepository) {}

  getState(): Promise<NoticeState> {
    return this.noticesRepository.getState();
  }

  acknowledgeStopReason(reason: string): Promise<void> {
    return this.noticesRepository.acknowledgeStopReason(reason);
  }

  dismissOemGuidance(): Promise<void> {
    return this.noticesRepository.dismissOemGuidance();
  }
}
