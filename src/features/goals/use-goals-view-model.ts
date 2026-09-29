import { useCallback, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCases } from '../../app/di';
import { AppError } from '../../core/errors/app-error';
import { ErrorMessages } from '../../core/errors/error-messages';
import { Goal } from '../../core/types/domain.types';
import { logger } from '../../core/utils/logger';
import { summarizeGoals } from './goals-summary';

const QUOTES_ATTRIBUTION_URL = 'https://zenquotes.io/';

const messageFor = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.message;
  }
  logger.error('[Goals] Unexpected failure', error);
  return ErrorMessages.generic;
};

export function useGoalsViewModel() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [onlineQuotes, setOnlineQuotes] = useState(false);
  const [onlineQuotesLoaded, setOnlineQuotesLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      useCases.getGoals
        .execute()
        .then((stored) => {
          if (active) {
            setGoals(stored);
          }
        })
        .catch((failure: unknown) => setError(messageFor(failure)));
      useCases.onlineQuotes
        .isEnabled()
        .then((enabled) => {
          if (active) {
            setOnlineQuotes(enabled);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) {
            setOnlineQuotesLoaded(true);
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const handleChangeDraft = useCallback((text: string) => {
    setDraft(text);
    setError(null);
  }, []);

  const handleAdd = useCallback(async () => {
    try {
      setGoals(await useCases.addGoal.execute(draft));
      setDraft('');
      setError(null);
    } catch (failure) {
      setError(messageFor(failure));
    }
  }, [draft]);

  const handleToggle = useCallback(async (id: string) => {
    try {
      setGoals(await useCases.toggleGoal.execute(id));
    } catch (failure) {
      setError(messageFor(failure));
    }
  }, []);

  const handleRemove = useCallback(async (id: string) => {
    try {
      setGoals(await useCases.removeGoal.execute(id));
    } catch (failure) {
      setError(messageFor(failure));
    }
  }, []);

  /** Off by default. Turning it on fetches straight away; a failed fetch is only logged. */
  const handleToggleOnlineQuotes = useCallback(async (enabled: boolean) => {
    try {
      await useCases.onlineQuotes.setEnabled(enabled);
      setOnlineQuotes(enabled);
    } catch (failure) {
      setError(messageFor(failure));
      return;
    }
    if (enabled) {
      useCases.onlineQuotes.refreshIfDue().catch((failure: unknown) => {
        logger.warn('[Goals] Could not fetch online quotes', failure);
      });
    }
  }, []);

  const summary = useMemo(() => summarizeGoals(goals), [goals]);

  const handleOpenAttribution = useCallback(async () => {
    try {
      await Linking.openURL(QUOTES_ATTRIBUTION_URL);
    } catch (failure) {
      // No browser installed or the link was refused: nothing the user needs to be told about.
      logger.warn(
        '[Goals] Could not open the quotes attribution link',
        failure,
      );
    }
  }, []);

  return {
    goals,
    draft,
    error,
    summary,
    canAdd: draft.trim().length > 0,
    onlineQuotes,
    onlineQuotesLoaded,
    handleToggleOnlineQuotes,
    handleOpenAttribution,
    handleChangeDraft,
    handleAdd,
    handleToggle,
    handleRemove,
  };
}
