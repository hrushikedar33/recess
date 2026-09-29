import { Goal } from '../../core/types/domain.types';

export interface GoalsSummary {
  done: number;
  total: number;
  label: string;
}

export function summarizeGoals(goals: Goal[]): GoalsSummary {
  const total = goals.length;
  const done = goals.filter((goal) => goal.done).length;

  if (total === 0) {
    return { done, total, label: 'Add your first goal' };
  }
  if (done === total) {
    return { done, total, label: `All ${total} done` };
  }
  return { done, total, label: `${done} of ${total} done` };
}
