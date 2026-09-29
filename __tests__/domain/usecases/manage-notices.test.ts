import { ManageNoticesUseCase } from '@domain/usecases/manage-notices-use-case';
import {
  INoticesRepository,
  NoticeState,
} from '@data/repositories/i-notices-repository';

class FakeNotices implements INoticesRepository {
  state: NoticeState = { ackedStopReason: null, oemGuidanceDismissed: false };

  async getState() {
    return this.state;
  }

  async acknowledgeStopReason(reason: string) {
    this.state = { ...this.state, ackedStopReason: reason };
  }

  async dismissOemGuidance() {
    this.state = { ...this.state, oemGuidanceDismissed: true };
  }
}

describe('ManageNoticesUseCase', () => {
  it('starts with nothing dismissed', async () => {
    const notices = new ManageNoticesUseCase(new FakeNotices());

    await expect(notices.getState()).resolves.toEqual({
      ackedStopReason: null,
      oemGuidanceDismissed: false,
    });
  });

  it('remembers the stop reason the user has seen', async () => {
    const notices = new ManageNoticesUseCase(new FakeNotices());

    await notices.acknowledgeStopReason('oom@100');

    await expect(notices.getState()).resolves.toMatchObject({
      ackedStopReason: 'oom@100',
    });
  });

  it('remembers that the battery guidance was dismissed', async () => {
    const notices = new ManageNoticesUseCase(new FakeNotices());

    await notices.dismissOemGuidance();

    await expect(notices.getState()).resolves.toMatchObject({
      oemGuidanceDismissed: true,
    });
  });
});
