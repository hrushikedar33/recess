import { useEffect } from 'react';
import { logger } from '../../core/utils/logger';
import { useCases } from '../di';

/**
 * Once per app start: re-sends everything native mirrors (this also carries data saved before the
 * mirror existed over to the native monitor) and, if the user opted in, refreshes online quotes
 * when a day has passed. Nothing here can fail the app.
 */
export function useStartupSync(): void {
  useEffect(() => {
    useCases.syncBlockedApps.execute();
    useCases.syncGoals.execute();
    useCases.onlineQuotes.refreshIfDue().catch((error: unknown) => {
      logger.warn('[Startup] Could not refresh online quotes', error);
    });
  }, []);
}
