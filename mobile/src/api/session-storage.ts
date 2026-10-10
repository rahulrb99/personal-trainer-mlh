import { Credentials } from './schema';
let saved: Credentials | null = null;
// Native secure persistence is added with the native stage, never store tokens in plain AsyncStorage.
export async function loadSession() { return saved; }
export async function saveSession(value: Credentials | null) { saved = value; }
