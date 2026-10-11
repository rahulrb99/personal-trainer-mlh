import type { Action, Credentials, Snapshot, WeightChange } from '@/api/schema';

export type VoiceProps = {
  credentials: Credentials;
  snapshot: Snapshot;
  act: (
    action: Action,
    source?: 'web' | 'watch' | 'voice',
    target?: { exercise_instance_id: string; set_index: number | null },
    payload?: WeightChange,
  ) => Promise<Snapshot>;
};
