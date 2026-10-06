import { NativeModules } from 'react-native';
import { AppError } from '@core/errors/app-error';
import { SystemUiAdapter } from '@data/local/native/system-ui-adapter';

const native = NativeModules.SystemUiModule;

describe('SystemUiAdapter', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    NativeModules.SystemUiModule = native;
  });

  describe('setImmersive', () => {
    it('forwards the flag to the native module', async () => {
      await SystemUiAdapter.setImmersive(true);
      await SystemUiAdapter.setImmersive(false);

      expect(native.setImmersive).toHaveBeenNthCalledWith(1, true);
      expect(native.setImmersive).toHaveBeenNthCalledWith(2, false);
    });

    it('is best effort: a native failure never reaches the caller', async () => {
      native.setImmersive.mockRejectedValueOnce(new Error('no window'));

      await expect(SystemUiAdapter.setImmersive(true)).resolves.toBeUndefined();
    });

    it('does nothing when the module is not there (iOS, tests)', async () => {
      NativeModules.SystemUiModule = undefined;

      await expect(SystemUiAdapter.setImmersive(true)).resolves.toBeUndefined();
    });
  });

  describe('goHome', () => {
    it('asks native to show the home screen', async () => {
      await SystemUiAdapter.goHome();

      expect(native.goHome).toHaveBeenCalledTimes(1);
    });

    it('says so when the module is missing, so the caller can fall back', async () => {
      NativeModules.SystemUiModule = undefined;

      const error = await SystemUiAdapter.goHome().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('NATIVE_UNAVAILABLE');
    });

    it('turns a native failure into a typed error with its code', async () => {
      native.goHome.mockRejectedValueOnce({
        code: 'NO_ACTIVITY',
        message: 'There is no screen to start from.',
      });

      const error = await SystemUiAdapter.goHome().catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('NO_ACTIVITY');
    });
  });
});
