import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { ActionButton } from '@/components/action-button';
import { setRecordSchema, type Snapshot, type WeightChange } from '@/api/schema';
import { colors } from '@/theme';

export function SetHistory({ records }: { records: z.infer<typeof setRecordSchema>[] }) {
  if (!records.length) return null;
  return <View style={s.history}>
    <Text style={s.label}>Recorded sets</Text>
    {records.map(record => <View key={record.set_index} style={s.record}>
      <Text style={s.text}>Set {record.set_index} · {record.planned_reps} planned reps{record.weight_lb !== null ? ` · ${record.weight_lb} lb` : ' · Weight not set'}</Text>
      <Text style={s.duration}>{record.duration_seconds === null ? 'Timing unavailable' : `${record.duration_seconds.toFixed(1)}s`}</Text>
    </View>)}
  </View>;
}

export function SetTracking({ snapshot, elapsedSeconds, pending, onWeightChange }: {
  snapshot: Snapshot; elapsedSeconds: number; pending: boolean; onWeightChange: (payload: WeightChange) => Promise<Snapshot>;
}) {
  const [weight, setWeight] = useState('');
  const [error, setError] = useState<string | null>(null);
  const exercise = snapshot.current;
  if (!exercise) return null;
  const active = snapshot.phase === 'exercising';
  const canChange = active || snapshot.phase === 'resting';
  if (!canChange && !exercise.set_records.length) return null;
  async function update(payload: WeightChange) {
    setError(null);
    try { await onWeightChange(payload); setWeight(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Weight could not be updated.'); }
  }
  return <View style={s.panel}>
    {active && <View>
      <Text style={s.label}>Set timer</Text>
      <Text style={s.timer}>{snapshot.set_started_at ? `${Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:${(elapsedSeconds % 60).toString().padStart(2, '0')}` : '—'}</Text>
      <Text style={s.small}>{snapshot.set_started_at ? 'Running · stops when you finish this set' : 'Timing unavailable for this older set'}</Text>
    </View>}
    <SetHistory records={exercise.set_records} />
    {canChange && <View style={s.history}>
      <Text style={s.label}>{active ? 'Weight for this set' : 'Weight for the next set'} · {exercise.weight_lb === null ? 'Not set' : `${exercise.weight_lb} lb`}</Text>
      <View style={s.row}>
        <TextInput accessibilityLabel="New weight in pounds" placeholder="Total lb" keyboardType="number-pad" value={weight} onChangeText={setWeight} style={s.input} editable={!pending} />
        <ActionButton title="Update weight" disabled={pending || !weight.trim()} onPress={() => {
          const total = Number(weight);
          if (!Number.isInteger(total) || total < exercise.weight_min_lb || total > exercise.weight_max_lb || total % exercise.weight_step_lb !== 0) {
            setError(`Choose ${exercise.weight_min_lb}–${exercise.weight_max_lb} lb in ${exercise.weight_step_lb} lb increments.`);
            return;
          }
          void update({ weight_lb: total });
        }} />
        {exercise.weight_lb !== null && exercise.weight_lb + exercise.weight_step_lb <= exercise.weight_max_lb && <ActionButton title={`Increase by ${exercise.weight_step_lb} lb`} secondary disabled={pending} onPress={() => void update({ weight_increase_lb: exercise.weight_step_lb })} />}
      </View>
      {error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    </View>}
  </View>;
}

const s = StyleSheet.create({
  panel: { backgroundColor: colors.paleBlue, borderRadius: 16, padding: 18, gap: 18 },
  history: { gap: 10 }, label: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  timer: { fontSize: 44, fontWeight: '600', color: colors.blue, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  small: { color: colors.secondary, fontSize: 12, lineHeight: 18 },
  record: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  text: { color: colors.secondary, fontSize: 13, lineHeight: 20 }, duration: { color: colors.ink, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  input: { minHeight: 48, width: 110, backgroundColor: colors.paper, borderRadius: 12, padding: 12, color: colors.ink, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.danger, fontSize: 13 },
});
