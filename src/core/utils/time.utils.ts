export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

export function msToMinutes(milliseconds: number): number {
  return milliseconds / 1000 / 60;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
