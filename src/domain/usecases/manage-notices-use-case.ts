import {
  NoticeState,
  NoticesRepository,
} from '../../data/repositories/notices-repository';

/** Which one-time notices the user has dismissed, and dismissing them. */
export class ManageNoticesUseCase {
  constructor(private readonly noticesRepository: NoticesRepository) {}

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
