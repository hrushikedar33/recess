import { BlockedApp } from '../../core/types/domain.types';
import { IBlockedAppsRepository } from '../../data/repositories/i-blocked-apps-repository';

export class ToggleBlockedAppUseCase {
  constructor(private readonly blockedAppsRepository: IBlockedAppsRepository) {}

  execute(packageName: string): Promise<BlockedApp[]> {
    return this.blockedAppsRepository.toggleBlockedApp(packageName);
  }
}
