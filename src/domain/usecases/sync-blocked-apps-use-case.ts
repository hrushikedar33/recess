import { IBlockedAppsRepository } from '../../data/repositories/i-blocked-apps-repository';

export class SyncBlockedAppsUseCase {
  constructor(private readonly blockedAppsRepository: IBlockedAppsRepository) {}

  execute(): Promise<void> {
    return this.blockedAppsRepository.syncToNative();
  }
}
