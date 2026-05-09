import { BlockedApp } from '../../core/types/domain.types';

export class CheckUsageLimitUseCase {
  execute(blockedApp: BlockedApp, usageMinutes: number): boolean {
    return usageMinutes >= blockedApp.limitMinutes;
  }
}
