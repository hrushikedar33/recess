import {
  ACKED_STOP_REASON_STORAGE_KEY,
  OEM_GUIDANCE_DISMISSED_STORAGE_KEY,
} from '../../core/constants/storage.keys';
import { AsyncStorageAdapter } from '../local/storage/async-storage-adapter';

export interface NoticeState {
  /** The last stop reason the user has already seen and dismissed. */
  ackedStopReason: string | null;
  oemGuidanceDismissed: boolean;
}

/** Remembers which one-time notices the user has already dismissed. Unreadable storage means "none". */
export class NoticesRepository {
  async getState(): Promise<NoticeState> {
    try {
      const [ackedStopReason, dismissed] = await Promise.all([
        AsyncStorageAdapter.getItem(ACKED_STOP_REASON_STORAGE_KEY),
        AsyncStorageAdapter.getItem(OEM_GUIDANCE_DISMISSED_STORAGE_KEY),
      ]);
      return { ackedStopReason, oemGuidanceDismissed: dismissed === 'true' };
    } catch {
      return { ackedStopReason: null, oemGuidanceDismissed: false };
    }
  }

  acknowledgeStopReason(reason: string): Promise<void> {
    return AsyncStorageAdapter.setItem(ACKED_STOP_REASON_STORAGE_KEY, reason);
  }

  dismissOemGuidance(): Promise<void> {
    return AsyncStorageAdapter.setItem(
      OEM_GUIDANCE_DISMISSED_STORAGE_KEY,
      'true',
    );
  }
}
