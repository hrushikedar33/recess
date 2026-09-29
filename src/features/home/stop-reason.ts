/**
 * Turns the native "last stop reason" into a sentence for the user, or null when there is nothing
 * to tell (no reason, or the user turned monitoring off themselves).
 */
export function describeStopReason(reason: string | null): string | null {
  if (!reason || reason === 'stopped_by_user') {
    return null;
  }
  if (reason === 'task_removed') {
    return 'You swiped Recess away, so it had to restart itself.';
  }
  if (reason === 'destroyed_while_enabled') {
    return 'Android stopped Recess in the background, so it restarted.';
  }
  if (reason === 'fgs_timeout') {
    return 'Android timed out the background service, so it restarted.';
  }
  if (
    reason.startsWith('restart_failed') ||
    reason.startsWith('start_foreground_failed') ||
    reason.startsWith('enable_failed')
  ) {
    return 'Android refused to start Recess in the background. Opening the app starts it again.';
  }
  if (reason.startsWith('previous process ended:')) {
    return `Recess was closed by the system (${reason
      .replace('previous process ended: ', '')
      .replace(' at ', ', ')}).`;
  }
  return 'Recess was interrupted and restarted.';
}
