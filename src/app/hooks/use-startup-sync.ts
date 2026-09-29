import { useEffect } from 'react';
import { useCases } from '../di';

/**
 * Re-sends everything native mirrors, once per app start. This also carries apps saved before
 * the native mirror existed over to the native monitor.
 */
export function useStartupSync(): void {
  useEffect(() => {
    useCases.syncBlockedApps.execute();
  }, []);
}
