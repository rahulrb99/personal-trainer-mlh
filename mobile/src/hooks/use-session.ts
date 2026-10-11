import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, streamUrl } from '@/api/client';
import { Action, Credentials, PlannedExercise, Preferences, Snapshot, WeightChange, snapshotSchema } from '@/api/schema';
import { loadSession, saveSession } from '@/api/session-storage';

type ConnectionState = 'Connecting' | 'Live' | 'Reconnecting' | 'Offline';

const reconnectDelay = (attempt: number) => Math.min(1000 * 2 ** Math.min(attempt, 5), 30_000);

export function useSession() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>('Connecting');
  const [restSeconds, setRestSeconds] = useState(0);
  const [setSeconds, setSetSeconds] = useState(0);
  const current = useRef<Snapshot | null>(null);
  const busy = useRef(false);
  const offset = useRef(0);

  const accept = useCallback((state: Snapshot) => {
    const previous = current.current;
    if (previous?.session_id === state.session_id && state.version <= previous.version) return false;

    offset.current = Date.parse(state.server_time) - Date.now();
    setRestSeconds(state.rest_deadline ? Math.max(0, Math.ceil((Date.parse(state.rest_deadline) - Date.now() - offset.current) / 1000)) : 0);
    setSetSeconds(state.phase === 'exercising' && state.set_started_at ? Math.max(0, Math.floor((Date.now() + offset.current - Date.parse(state.set_started_at)) / 1000)) : 0);
    current.current = state;
    setSnapshot(state);
    return true;
  }, []);

  useEffect(() => { loadSession().then(setCredentials).catch(() => setError('Saved session could not be read. Start a new workout.')); }, []);

  useEffect(() => {
    if (!credentials) return;
    const sessionCredentials: Credentials = credentials;

    let active = true;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let connecting = false;
    let retryAttempt = 0;

    // A different session must not inherit an older session's in-memory state.
    if (current.current && current.current.session_id !== sessionCredentials.session_id) {
      current.current = null;
      setSnapshot(null);
      setRestSeconds(0);
    }

    function scheduleReconnect() {
      if (!active || retry !== undefined) return;
      setConnection('Reconnecting');
      retry = setTimeout(() => {
        retry = undefined;
        void connect();
      }, reconnectDelay(retryAttempt++));
    }

    async function connect() {
      if (!active || connecting) return;
      connecting = true;
      setConnection(retryAttempt === 0 ? 'Connecting' : 'Reconnecting');
      try {
        const state = await api.snapshot(sessionCredentials);
        if (!active) return;
        if (state.session_id !== sessionCredentials.session_id) throw new Error('The session service returned a different session. Rejoin the workout.');
        accept(state);
        setError(null);

        const candidate = new WebSocket(streamUrl(sessionCredentials.session_id));
        socket = candidate;
        let receivedSnapshot = false;
        candidate.onopen = () => {
          if (!active || socket !== candidate) return;
          try {
            candidate.send(JSON.stringify({ access_token: sessionCredentials.access_token }));
          } catch {
            setError('Could not authorize the live session stream. Reconnecting to the latest state.');
            candidate.close();
          }
        };
        candidate.onmessage = (event) => {
          if (!active || socket !== candidate) return;
          try {
            if (typeof event.data !== 'string') throw new Error('Live update was not text.');
            const frame: unknown = JSON.parse(event.data);
            if (typeof frame !== 'object' || frame === null || !('type' in frame) || frame.type !== 'snapshot' || !('snapshot' in frame)) {
              throw new Error('Live update used an unsupported frame.');
            }
            const parsed = snapshotSchema.safeParse(frame.snapshot);
            if (!parsed.success || parsed.data.session_id !== sessionCredentials.session_id) {
              throw new Error('Live update did not match the session contract.');
            }
            accept(parsed.data);
            receivedSnapshot = true;
            retryAttempt = 0;
            setError(null);
            setConnection('Live');
          } catch {
            setError('The live session sent an invalid update. Reconnecting to the latest session state.');
            candidate.close();
          }
        };
        candidate.onclose = () => {
          if (!active || socket !== candidate) return;
          socket = null;
          if (!receivedSnapshot) setConnection('Reconnecting');
          scheduleReconnect();
        };
        candidate.onerror = () => {
          if (active && socket === candidate) candidate.close();
        };
      } catch (failure) {
        if (!active) return;
        setError(failure instanceof Error ? failure.message : 'Cannot load session');
        setConnection('Offline');
        if (failure instanceof ApiError && failure.status === 401) {
          await saveSession(null);
          if (active) {
            setCredentials(null);
            if (current.current?.session_id === sessionCredentials.session_id) {
              current.current = null;
              setSnapshot(null);
            }
          }
        } else {
          scheduleReconnect();
        }
      } finally {
        connecting = false;
      }
    }

    void connect();
    return () => {
      active = false;
      if (retry !== undefined) clearTimeout(retry);
      socket?.close();
    };
  }, [credentials, accept]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRestSeconds(snapshot?.rest_deadline ? Math.max(0, Math.ceil((Date.parse(snapshot.rest_deadline) - Date.now() - offset.current) / 1000)) : 0);
      setSetSeconds(snapshot?.phase === 'exercising' && snapshot.set_started_at ? Math.max(0, Math.floor((Date.now() + offset.current - Date.parse(snapshot.set_started_at)) / 1000)) : 0);
    }, 250);
    return () => clearInterval(timer);
  }, [snapshot?.rest_deadline, snapshot?.set_started_at, snapshot?.phase]);

  const act = useCallback(async (type: Action, source: 'web' | 'watch' | 'voice' = 'web', target?: { exercise_instance_id: string; set_index: number | null }, payload?: WeightChange) => {
    if (!credentials || !current.current) throw new Error('Start or join a workout first.');
    if (busy.current) throw new Error('Another action is awaiting confirmation.');
    const state = current.current;
    if (target && (state.current?.instance_id !== target.exercise_instance_id || state.set_index !== target.set_index)) throw new Error('The spoken action targets an old exercise or set. Ask Mat for the current state.');
    busy.current = true; setPending(true); setError(null);
    try { const result = await api.event(credentials, state, type, source, payload); accept(result.snapshot); return result.snapshot; }
    catch (failure) { if (failure instanceof ApiError && failure.snapshot) accept(failure.snapshot); setError(failure instanceof Error ? failure.message : 'Action failed'); throw failure; }
    finally { busy.current = false; setPending(false); }
  }, [credentials, accept]);

  async function start(preferences: Preferences, demo: boolean, selectedMuscleGroups: string[], plan: PlannedExercise[]) {
    setPending(true); setError(null);
    try { const result = await api.create(preferences, demo, selectedMuscleGroups, plan); const c = { session_id: result.snapshot.session_id, access_token: result.access_token }; await saveSession(c); accept(result.snapshot); setCredentials(c); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Cannot start workout'); }
    finally { setPending(false); }
  }

  const reset = useCallback(async () => { await saveSession(null); setCredentials(null); current.current = null; setSnapshot(null); setError(null); setConnection('Offline'); }, []);
  async function join(c: Credentials) { const state = await api.snapshot(c); await saveSession(c); accept(state); setCredentials(c); }
  return { credentials, snapshot, error, pending, connection, restSeconds, setSeconds, start, reset, join, act };
}
