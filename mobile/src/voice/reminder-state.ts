// Native sessions are currently restored only within this app process.
const handled = new Set<string>();
export function reminderHandled(id: string) { return handled.has(id); }
export function markReminderHandled(id: string) { handled.add(id); }
