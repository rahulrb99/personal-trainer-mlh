import { ProfileAuth } from './schema';

let saved: ProfileAuth | null = null;

export async function loadProfileAuth() { return saved; }
export async function saveProfileAuth(value: ProfileAuth | null) { saved = value; }
