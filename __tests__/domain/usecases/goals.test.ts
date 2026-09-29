import * as fs from 'fs';
import * as path from 'path';
import { AppError } from '@core/errors/app-error';
import { Goal } from '@core/types/domain.types';
import { IGoalsRepository } from '@data/repositories/i-goals-repository';
import { AddGoalUseCase } from '@domain/usecases/add-goal-use-case';
import { GetGoalsUseCase } from '@domain/usecases/get-goals-use-case';
import { RemoveGoalUseCase } from '@domain/usecases/remove-goal-use-case';
import { ToggleGoalUseCase } from '@domain/usecases/toggle-goal-use-case';

class InMemoryGoalsRepository implements IGoalsRepository {
  saves = 0;

  constructor(public goals: Goal[] = []) {}

  async getGoals(): Promise<Goal[]> {
    return this.goals;
  }

  async saveGoals(goals: Goal[]): Promise<void> {
    this.saves += 1;
    this.goals = goals;
  }

  syncToNative(): Promise<void> {
    return Promise.resolve();
  }
}

const goal = (id: string, title = `Goal ${id}`, done = false): Goal => ({
  id,
  title,
  done,
  createdAt: 1,
});

const manyGoals = (count: number): Goal[] =>
  Array.from({ length: count }, (_, i) => goal(`g${i + 1}`));

const failureOf = async (action: Promise<unknown>): Promise<unknown> =>
  action.then(
    () => undefined,
    (error: unknown) => error,
  );

describe('AddGoalUseCase', () => {
  let repository: InMemoryGoalsRepository;
  let nextId: number;
  const idFactory = () => `id-${(nextId += 1)}`;
  const clock = () => 1234;
  let add: AddGoalUseCase;

  beforeEach(() => {
    repository = new InMemoryGoalsRepository();
    nextId = 0;
    add = new AddGoalUseCase(repository, idFactory, clock);
  });

  it('adds an unfinished goal with an id and a creation time', async () => {
    const goals = await add.execute('Finish the report');

    expect(goals).toEqual([
      { id: 'id-1', title: 'Finish the report', done: false, createdAt: 1234 },
    ]);
  });

  it('trims whitespace around the title', async () => {
    const goals = await add.execute('   Read a chapter  ');

    expect(goals[0].title).toBe('Read a chapter');
  });

  it('keeps goals in the order they were created', async () => {
    await add.execute('First');
    const goals = await add.execute('Second');

    expect(goals.map((g) => g.title)).toEqual(['First', 'Second']);
  });

  it('saves the new list', async () => {
    await add.execute('Call mum');

    expect(repository.goals.map((g) => g.title)).toEqual(['Call mum']);
  });

  it('rejects an empty title', async () => {
    const error = await failureOf(add.execute(''));

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'GOAL_EMPTY' });
  });

  it('rejects a title of only whitespace', async () => {
    await expect(add.execute('    ')).rejects.toMatchObject({
      code: 'GOAL_EMPTY',
    });
  });

  it('rejects a title over 120 characters', async () => {
    await expect(add.execute('x'.repeat(121))).rejects.toMatchObject({
      code: 'GOAL_TOO_LONG',
    });
  });

  it('accepts a title of exactly 120 characters', async () => {
    const goals = await add.execute('x'.repeat(120));

    expect(goals[0].title).toHaveLength(120);
  });

  it('counts the length after trimming', async () => {
    const goals = await add.execute(` ${'x'.repeat(120)} `);

    expect(goals[0].title).toHaveLength(120);
  });

  it('accepts the 20th goal', async () => {
    repository.goals = manyGoals(19);

    const goals = await add.execute('Number twenty');

    expect(goals).toHaveLength(20);
  });

  it('rejects the 21st goal', async () => {
    repository.goals = manyGoals(20);

    await expect(add.execute('Number twenty-one')).rejects.toMatchObject({
      code: 'GOAL_LIMIT_REACHED',
    });
  });

  it('leaves the stored goals untouched when a goal is rejected', async () => {
    repository.goals = manyGoals(20);

    await failureOf(add.execute('Too many'));
    await failureOf(add.execute(''));

    expect(repository.saves).toBe(0);
    expect(repository.goals).toHaveLength(20);
  });

  it('gives every goal a different id when using the default id factory', async () => {
    const realAdd = new AddGoalUseCase(repository);

    for (let i = 0; i < 20; i += 1) {
      await realAdd.execute(`Goal ${i}`);
    }

    expect(new Set(repository.goals.map((g) => g.id)).size).toBe(20);
  });
});

describe('ToggleGoalUseCase', () => {
  it('flips only the goal with the given id', async () => {
    const repository = new InMemoryGoalsRepository([goal('a'), goal('b')]);

    const goals = await new ToggleGoalUseCase(repository).execute('b');

    expect(goals.map((g) => g.done)).toEqual([false, true]);
  });

  it('flips back when toggled twice', async () => {
    const repository = new InMemoryGoalsRepository([goal('a')]);
    const toggle = new ToggleGoalUseCase(repository);

    await toggle.execute('a');
    const goals = await toggle.execute('a');

    expect(goals[0].done).toBe(false);
  });

  it('does nothing for an unknown id', async () => {
    const repository = new InMemoryGoalsRepository([goal('a')]);

    const goals = await new ToggleGoalUseCase(repository).execute('missing');

    expect(goals).toEqual([goal('a')]);
    expect(repository.saves).toBe(0);
  });
});

describe('RemoveGoalUseCase', () => {
  it('removes the goal with the given id and keeps the order of the rest', async () => {
    const repository = new InMemoryGoalsRepository([
      goal('a'),
      goal('b'),
      goal('c'),
    ]);

    const goals = await new RemoveGoalUseCase(repository).execute('b');

    expect(goals.map((g) => g.id)).toEqual(['a', 'c']);
    expect(repository.goals.map((g) => g.id)).toEqual(['a', 'c']);
  });

  it('does nothing for an unknown id', async () => {
    const repository = new InMemoryGoalsRepository([goal('a')]);

    await new RemoveGoalUseCase(repository).execute('missing');

    expect(repository.saves).toBe(0);
  });
});

describe('GetGoalsUseCase', () => {
  it('returns the stored goals', async () => {
    const repository = new InMemoryGoalsRepository([goal('a'), goal('b')]);

    await expect(new GetGoalsUseCase(repository).execute()).resolves.toEqual([
      goal('a'),
      goal('b'),
    ]);
  });
});

describe('goal use cases and the framework', () => {
  it('import nothing from React Native, so they run in isolation', () => {
    const dir = path.join(__dirname, '../../../src/domain/usecases');
    const sources = fs
      .readdirSync(dir)
      .filter((file) => /goal/.test(file))
      .map((file) => fs.readFileSync(path.join(dir, file), 'utf8'));

    expect(sources.length).toBeGreaterThanOrEqual(4);
    sources.forEach((source) => expect(source).not.toMatch(/react-native/));
  });
});
