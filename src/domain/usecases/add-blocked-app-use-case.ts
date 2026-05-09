import { BlockedApp } from '../../core/types/domain.types';
import { IBlockedAppsRepository } from '../../data/repositories/i-blocked-apps-repository';

export class AddBlockedAppUseCase {
  constructor(private readonly blockedAppsRepository: IBlockedAppsRepository) {}

  execute(app: BlockedApp): Promise<BlockedApp[]> {
    return this.blockedAppsRepository.addBlockedApp(app);
  }
}
