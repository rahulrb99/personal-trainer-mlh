import { z } from 'zod';
import { ProfileAuth } from './schema';

const schema = z.object({ access_token: z.string() });

export async function loadProfileAuth(): Promise<ProfileAuth | null> {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem('spotter-profile');
  const result = raw ? schema.safeParse(JSON.parse(raw)) : null;
  return result?.success ? result.data : null;
}

export async function saveProfileAuth(value: ProfileAuth | null) {
  if (typeof sessionStorage === 'undefined') return;
  if (value) sessionStorage.setItem('spotter-profile', JSON.stringify(value));
  else sessionStorage.removeItem('spotter-profile');
}
