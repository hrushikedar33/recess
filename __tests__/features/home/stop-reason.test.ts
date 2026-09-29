import { describeStopReason } from '@features/home/stop-reason';

describe('describeStopReason', () => {
  it('says nothing when the user turned monitoring off themselves', () => {
    expect(describeStopReason('stopped_by_user')).toBeNull();
  });

  it('says nothing when there is no reason at all', () => {
    expect(describeStopReason(null)).toBeNull();
  });

  it.each([
    ['task_removed', 'swiped'],
    ['destroyed_while_enabled', 'stopped Recess'],
    ['fgs_timeout', 'timed out'],
    ['restart_failed (alarm): IllegalStateException', 'refused'],
    ['start_foreground_failed: SecurityException', 'refused'],
    ['enable_failed: RuntimeException', 'refused'],
  ])('explains "%s" in plain words', (reason, expected) => {
    expect(describeStopReason(reason)).toContain(expected);
  });

  it('passes on what Android said about the previous process ending', () => {
    const text = describeStopReason(
      'previous process ended: LOW_MEMORY at 29/09/2026, 14:02',
    );

    expect(text).toContain('LOW_MEMORY');
    expect(text).toContain('14:02');
  });

  it('still tells the user something for a reason it does not know', () => {
    expect(describeStopReason('something_new')).toContain('interrupted');
  });
});
