import { AppInfo } from '../../core/types/domain.types';
import { IInstalledAppsRepository } from '../../data/repositories/i-installed-apps-repository';

export class GetInstalledAppsUseCase {
  constructor(
    private readonly installedAppsRepository: IInstalledAppsRepository,
  ) {}

  execute(): Promise<AppInfo[]> {
    return this.installedAppsRepository.getInstalledApps();
  }
}
