import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCases } from '../../app/di';
import { Goal } from '../../core/types/domain.types';
import { LimitEvent } from '../../core/types/native.types';
import { logger } from '../../core/utils/logger';
import { SystemUiAdapter } from '../../data/local/native/system-ui-adapter';
import { copy } from '../../shared/copy';
import { formatDuration } from '../../core/utils/time.utils';
import { remainingSeconds } from './break-countdown';

export type BreakStatus = 'loading' | 'active' | 'over' | 'none';

export function useBreakViewModel() {
  const [event, setEvent] = useState<LimitEvent | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [latest, stored] = await Promise.all([
        useCases.getLimitEvent.execute(),
        useCases.getGoals.execute(),
      ]);
      setEvent(latest);
      setGoals(stored);
    } catch (error) {
      logger.warn('[Break] Could not load the limit event', error);
    } finally {
      setNow(Date.now());
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Another limit can be reached while this screen is open: the takeover re-opens the same link.
  useEffect(() => {
    const subscription = Linking.addEventListener('url', () => {
      load();
    });
    return () => subscription.remove();
  }, [load]);

  useEffect(() => {
    if (!event) {
      return undefined;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [event]);

  const handleToggleGoal = useCallback(async (id: string) => {
    try {
      setGoals(await useCases.toggleGoal.execute(id));
    } catch (error) {
      logger.warn('[Break] Could not update the goal', error);
    }
  }, []);

  // The takeover fills the whole display: hide the system bars while this screen is up.
  useFocusEffect(
    useCallback(() => {
      SystemUiAdapter.setImmersive(true);
      return () => {
        SystemUiAdapter.setImmersive(false);
      };
    }, []),
  );

  /**
   * Shows the phone's real home screen. Leaving Recess instead would only reveal whatever is
   * underneath this screen, which after a takeover is the paused app itself. If the home screen
   * cannot be started, leaving is the fallback, so this is never a trap (the system back button
   * also works here). The monitor keeps running in its own service either way.
   */
  const handleDone = useCallback(async () => {
    try {
      await SystemUiAdapter.goHome();
    } catch (error) {
      logger.warn(
        '[Break] Could not show the home screen, leaving instead',
        error,
      );
      BackHandler.exitApp();
    }
  }, []);

  const remaining = event ? remainingSeconds(event.blockedUntilMs, now) : 0;
  const isDaily = event?.reason === 'DAILY_LIMIT';
  const status: BreakStatus = !loaded
    ? 'loading'
    : !event
    ? 'none'
    : remaining > 0
    ? 'active'
    : 'over';

  const appName = event?.appName ?? '';
  const { headline, detail } = describe(status, isDaily, appName);

  return {
    status,
    event,
    goals,
    isDaily,
    headline,
    detail,
    countdownText:
      status === 'active' && !isDaily ? formatDuration(remaining) : '',
    handleToggleGoal,
    handleDone,
  };
}

function describe(status: BreakStatus, isDaily: boolean, appName: string) {
  if (status === 'none' || status === 'loading') {
    return copy.break.none;
  }
  if (status === 'over') {
    return {
      headline: copy.break.over.headline,
      detail: copy.break.over.detail(appName),
    };
  }
  return isDaily
    ? {
        headline: copy.break.daily.headline,
        detail: copy.break.daily.detail(appName),
      }
    : {
        headline: copy.break.session.headline,
        detail: copy.break.session.detail(appName),
      };
}
