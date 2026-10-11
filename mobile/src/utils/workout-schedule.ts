import type { Catalog, WeeklyWorkout } from '@/api/schema';

export const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function localWeekday(date: Date): number { return (date.getDay() + 6) % 7; }

export function scheduledWorkout(schedule: WeeklyWorkout[], date: Date): { workout: WeeklyWorkout; daysAway: number } | null {
  const day = localWeekday(date);
  const ordered = schedule.map(workout => ({ workout, daysAway: (workout.weekday - day + 7) % 7 })).sort((a, b) => a.daysAway - b.daysAway);
  return ordered[0] ?? null;
}

export function workoutFocus(groupIds: string[], catalog: Catalog | null): string {
  const legs = new Set(['quadriceps', 'hamstrings', 'glutes', 'calves']);
  if (groupIds.length && groupIds.every(id => legs.has(id))) return 'leg';
  return groupIds.map(id => catalog?.muscle_groups.find(group => group.id === id)?.name.toLowerCase() ?? id).join(' + ');
}

export function displayWorkoutTime(time: string): string {
  const [hour, minute] = time.split(':').map(Number);
  return `${hour % 12 || 12}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
