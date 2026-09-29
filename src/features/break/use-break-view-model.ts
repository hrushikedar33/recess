import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCases } from '../../app/di';
import { Goal } from '../../core/types/domain.types';
import { LimitEvent } from '../../core/types/native.types';
import { logger } from '../../core/utils/logger';
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

  /**
   * Leaves Recess, which returns to whatever was underneath (the phone's home screen, after the
   * takeover). The monitor keeps running in its own service. It is never a trap: the system back
   * button also works on this screen.
   */
  const handleDone = useCallback(() => {
    BackHandler.exitApp();
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
    return {
      headline: 'No break right now',
      detail:
        'When an app reaches its limit, your quote and goals will show up here.',
    };
  }
  if (status === 'over') {
    return {
      headline: 'Break over',
      detail: `${appName} is available again. Use it on purpose.`,
    };
  }
  return isDaily
    ? { headline: 'Done for today', detail: `${appName} opens again tomorrow.` }
    : { headline: 'Time to pause', detail: `${appName} is paused for now.` };
}
