import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, streamUrl } from '@/api/client';
import { Action, Credentials, Preferences, Snapshot, snapshotSchema } from '@/api/schema';
import { loadSession, saveSession } from '@/api/session-storage';

export function useSession() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [connection, setConnection] = useState('Connecting');
  const [restSeconds, setRestSeconds] = useState(0);
  const current = useRef<Snapshot | null>(null);
  const busy = useRef(false);
  const offset = useRef(0);
  const accept = useCallback((state: Snapshot) => {
    if (!current.current || state.session_id !== current.current.session_id || state.version >= current.current.version) {
      offset.current = Date.parse(state.server_time) - Date.now();
      setRestSeconds(state.rest_deadline ? Math.max(0, Math.ceil((Date.parse(state.rest_deadline) - Date.now() - offset.current) / 1000)) : 0);
      current.current = state;
      setSnapshot(state);
    }
  }, []);
  useEffect(() => { loadSession().then(setCredentials).catch(() => setError('Saved session could not be read. Start a new workout.')); }, []);
  useEffect(() => {
    if (!credentials) return;
    let active = true;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    async function connect() {
      if (!credentials || !active) return;
      try {
        const state = await api.snapshot(credentials);
        if (!active) return;
        accept(state); setError(null);
        socket = new WebSocket(streamUrl(credentials.session_id));
        socket.onopen = () => { socket?.send(JSON.stringify({ access_token: credentials.access_token })); if (active) setConnection('Live'); };
        socket.onmessage = (event) => {
          try {
            const value: unknown = JSON.parse(event.data);
            if (typeof value === 'object' && value !== null && 'snapshot' in value) {
              const parsed = snapshotSchema.safeParse(value.snapshot);
              if (parsed.success && active) accept(parsed.data);
            }
          } catch { if (active) setError('An invalid live update was ignored. Refresh your session.'); }
        };
        socket.onclose = () => { if (active) { setConnection('Reconnecting'); retry = setTimeout(connect, 2000); } };
        socket.onerror = () => socket?.close();
      } catch (failure) {
        if (active) {
          setError(failure instanceof Error ? failure.message : 'Cannot load session'); setConnection('Offline');
          if (failure instanceof ApiError && failure.status === 401) { await saveSession(null); setCredentials(null); current.current = null; setSnapshot(null); }
          else retry = setTimeout(connect, 3000);
        }
      }
    }
    connect();
    return () => { active = false; clearTimeout(retry); socket?.close(); };
  }, [credentials, accept]);
  useEffect(() => {
    const timer = setInterval(() => setRestSeconds(snapshot?.rest_deadline ? Math.max(0, Math.ceil((Date.parse(snapshot.rest_deadline) - Date.now() - offset.current) / 1000)) : 0), 250);
    return () => clearInterval(timer);
  }, [snapshot?.rest_deadline]);
  const act = useCallback(async (type: Action, source: 'web' | 'watch' | 'voice' = 'web', target?: { exercise_instance_id: string; set_index: number | null }) => {
    if (!credentials || !current.current) throw new Error('Start or join a workout first.');
    if (busy.current) throw new Error('Another action is awaiting confirmation.');
    const state = current.current;
    if (target && (state.current?.instance_id !== target.exercise_instance_id || (type === 'set_completed' && state.set_index !== target.set_index))) throw new Error('The spoken action targets an old exercise or set. Ask Mat for the current state.');
    busy.current = true; setPending(true); setError(null);
    try { const result = await api.event(credentials, state, type, source); accept(result.snapshot); return result.snapshot; }
    catch (failure) { if (failure instanceof ApiError && failure.snapshot) accept(failure.snapshot); setError(failure instanceof Error ? failure.message : 'Action failed'); throw failure; }
    finally { busy.current = false; setPending(false); }
  }, [credentials, accept]);
  async function start(preferences: Preferences, demo: boolean) {
    setPending(true); setError(null);
    try { const result = await api.create(preferences, demo); const c = { session_id: result.snapshot.session_id, access_token: result.access_token }; await saveSession(c); accept(result.snapshot); setCredentials(c); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Cannot start workout'); }
    finally { setPending(false); }
  }
  async function reset() { await saveSession(null); setCredentials(null); current.current = null; setSnapshot(null); setError(null); }
  async function join(c: Credentials) { const state = await api.snapshot(c); await saveSession(c); accept(state); setCredentials(c); }
  return { credentials, snapshot, error, pending, connection, restSeconds, start, reset, join, act };
}
