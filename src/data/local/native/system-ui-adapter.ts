import { NativeModules } from 'react-native';
import { AppError } from '../../../core/errors/app-error';
import { SystemUiNativeModule } from '../../../core/types/native.types';
import { logger } from '../../../core/utils/logger';

const nativeModule = (): SystemUiNativeModule | undefined =>
  NativeModules.SystemUiModule as SystemUiNativeModule | undefined;

const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  const { code, message } = (error ?? {}) as {
    code?: unknown;
    message?: unknown;
  };
  return new AppError(
    typeof code === 'string' ? code : 'SYSTEM_UI_ERROR',
    typeof message === 'string' ? message : 'The system call failed.',
  );
};

export const SystemUiAdapter = {
  /**
   * Hides or shows the system bars. Cosmetic, so best effort: it never throws, and does nothing
   * where there is no native module.
   */
  async setImmersive(enabled: boolean): Promise<void> {
    const module = nativeModule();
    if (!module) {
      return;
    }
    try {
      await module.setImmersive(enabled);
    } catch (error) {
      logger.warn('[SystemUi] Could not change the system bars', error);
    }
  },

  /** Shows the home screen. Rejects with an AppError so the caller can fall back to something else. */
  async goHome(): Promise<void> {
    const module = nativeModule();
    if (!module) {
      throw new AppError(
        'NATIVE_UNAVAILABLE',
        'Going home is only available on Android.',
      );
    }
    try {
      await module.goHome();
    } catch (error) {
      throw toAppError(error);
    }
  },
};
