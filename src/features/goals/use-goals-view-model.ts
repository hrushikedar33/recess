import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCases } from '../../app/di';
import { AppError } from '../../core/errors/app-error';
import { ErrorMessages } from '../../core/errors/error-messages';
import { Goal } from '../../core/types/domain.types';
import { logger } from '../../core/utils/logger';
import { summarizeGoals } from './goals-summary';

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

  const summary = useMemo(() => summarizeGoals(goals), [goals]);

  return {
    goals,
    draft,
    error,
    summary,
    canAdd: draft.trim().length > 0,
    handleChangeDraft,
    handleAdd,
    handleToggle,
    handleRemove,
  };
}
