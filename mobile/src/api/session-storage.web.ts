import { Credentials } from './schema';
import { z } from 'zod';
const schema = z.object({ session_id: z.string(), access_token: z.string() });
// Per-tab storage keeps tokens out of URLs and supports refresh. Intended for local prototype.
export async function loadSession(): Promise<Credentials | null> {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem('spotter-session');
  const result = raw ? schema.safeParse(JSON.parse(raw)) : null;
  return result?.success ? result.data : null;
}
export async function saveSession(value: Credentials | null) {
  if (typeof sessionStorage === 'undefined') return;
  if (value) sessionStorage.setItem('spotter-session', JSON.stringify(value)); else sessionStorage.removeItem('spotter-session');
}
