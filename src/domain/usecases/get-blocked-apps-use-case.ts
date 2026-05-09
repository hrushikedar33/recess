import { BlockedApp } from '../../core/types/domain.types';
import { IBlockedAppsRepository } from '../../data/repositories/i-blocked-apps-repository';

export class GetBlockedAppsUseCase {
  constructor(private readonly blockedAppsRepository: IBlockedAppsRepository) {}

  execute(): Promise<BlockedApp[]> {
    return this.blockedAppsRepository.getBlockedApps();
  }
}
