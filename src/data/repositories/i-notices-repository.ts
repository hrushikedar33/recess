export interface NoticeState {
  /** The last stop reason the user has already seen and dismissed. */
  ackedStopReason: string | null;
  oemGuidanceDismissed: boolean;
}

export interface INoticesRepository {
  /** Unreadable storage means "nothing dismissed", so this never rejects. */
  getState(): Promise<NoticeState>;
  acknowledgeStopReason(reason: string): Promise<void>;
  dismissOemGuidance(): Promise<void>;
}
