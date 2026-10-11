import * as Crypto from 'expo-crypto';
import { z } from 'zod';
import { Action, Credentials, PlannedExercise, Preferences, ProfileAuth, Snapshot, authResultSchema, catalogSchema, createResultSchema, eventResultSchema, healthSchema, planPreviewSchema, snapshotSchema, summarySchema, userProfileSchema } from './schema';

export const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(message: string, public status: number, public snapshot?: Snapshot) { super(message); }
}
async function request<T>(path: string, schema: z.ZodType<T>, credentials?: { access_token: string }, body?: unknown, method?: 'GET' | 'POST' | 'PUT'): Promise<T> {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 12000);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: method ?? (body === undefined ? 'GET' : 'POST'), signal: abort.signal,
      headers: { 'Content-Type': 'application/json', ...(credentials ? { Authorization: `Bearer ${credentials.access_token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      const error = z.object({ message: z.string().optional(), detail: z.unknown().optional(), snapshot: z.unknown().optional() }).safeParse(data);
      const state = snapshotSchema.safeParse(error.success ? error.data.snapshot : undefined);
      throw new ApiError(error.success ? error.data.message || (typeof error.data.detail === 'string' ? error.data.detail : `Request rejected (${response.status})`) : `Request failed (${response.status})`, response.status, state.success ? state.data : undefined);
    }
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error instanceof z.ZodError ? 'The API returned an incompatible response. Check the shared contract.' : `Cannot reach the workout service at ${BASE_URL}. Check the backend and your connection.`);
  } finally { clearTimeout(timeout); }
}
export const api = {
  catalog: () => request('/catalog', catalogSchema),
  health: () => request('/health', healthSchema),
  googleSignIn: (id_token: string) => request('/auth/google', authResultSchema, undefined, { id_token }),
  profile: (auth: ProfileAuth) => request('/profile', userProfileSchema, auth),
  saveProfile: (auth: ProfileAuth, body: { name: string; preferences: Preferences; muscle_group_ids: string[]; plan: PlannedExercise[] | null }) => request('/profile', userProfileSchema, auth, body, 'PUT'),
  previewPlan: (muscle_group_ids: string[]) => request('/plans/preview', planPreviewSchema, undefined, { muscle_group_ids }),
  create: (preferences: Preferences, demo_mode: boolean, selected_muscle_group_ids: string[], plan: PlannedExercise[]) => request('/sessions', createResultSchema, undefined, {
    routine_id: 'full-body', preferences, demo_mode, selected_muscle_group_ids, plan,
  }),
  snapshot: (c: Credentials) => request(`/sessions/${c.session_id}`, snapshotSchema, c),
  summary: (c: Credentials) => request(`/sessions/${c.session_id}/summary`, summarySchema, c),
  event: (c: Credentials, snapshot: Snapshot, type: Action, source: 'web' | 'watch' | 'voice' = 'web') => request(`/sessions/${c.session_id}/events`, eventResultSchema, c, {
    event_id: Crypto.randomUUID(), expected_version: snapshot.version, source, type,
    exercise_instance_id: snapshot.current?.instance_id ?? null, set_index: snapshot.set_index, payload: {},
  }),
  voiceToken: (c: Credentials) => request('/voice/token', z.object({ conversation_token: z.string() }), c, { session_id: c.session_id }),
};
export function streamUrl(sessionId: string): string {
  const url = new URL(BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/sessions/${sessionId}/stream`;
  return url.toString();
}
