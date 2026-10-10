import { Text } from 'react-native';
import { Action, Credentials, Snapshot } from '@/api/schema';
export type VoiceProps = { credentials: Credentials; snapshot: Snapshot; act: (action: Action, source?: 'web' | 'watch' | 'voice', target?: { exercise_instance_id: string; set_index: number | null }) => Promise<Snapshot> };
export function VoicePanel(_: VoiceProps) { return <Text>Native voice is a later validation stage. Workout controls are available below.</Text>; }
