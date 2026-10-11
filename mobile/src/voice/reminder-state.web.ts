const handled = new Set<string>();
const key = 'spotter-workout-reminders';
export function reminderHandled(id: string) {
  if (handled.has(id)) return true;
  try {
    if (typeof localStorage === 'undefined') return false;
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(value)) value.filter((item): item is string => typeof item === 'string').slice(-50).forEach(item => handled.add(item));
  } catch { console.warn('Workout reminder history could not be restored; using this tab’s history.'); }
  return handled.has(id);
}
export function markReminderHandled(id: string) {
  handled.add(id);
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify([...handled].slice(-50)));
  } catch { console.warn('Workout reminder history could not be saved; using this tab’s history.'); }
}
