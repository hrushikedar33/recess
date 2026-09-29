import { Goal } from '@core/types/domain.types';
import { summarizeGoals } from '@features/goals/goals-summary';

const goal = (id: string, done: boolean): Goal => ({
  id,
  title: id,
  done,
  createdAt: 1,
});

describe('summarizeGoals', () => {
  it('invites the first goal when there are none', () => {
    expect(summarizeGoals([])).toEqual({
      done: 0,
      total: 0,
      label: 'Add your first goal',
    });
  });

  it('counts finished goals out of all goals', () => {
    const goals = [goal('a', true), goal('b', true), goal('c', false)];

    expect(summarizeGoals(goals)).toMatchObject({
      done: 2,
      total: 3,
      label: '2 of 3 done',
    });
  });

  it('says none are done when none are', () => {
    expect(summarizeGoals([goal('a', false)]).label).toBe('0 of 1 done');
  });

  it('celebrates when every goal is done', () => {
    expect(summarizeGoals([goal('a', true), goal('b', true)]).label).toBe(
      'All 2 done',
    );
  });
});
