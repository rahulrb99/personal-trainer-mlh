import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { WeeklyWorkout } from '@/api/schema';
import { weekdays } from '@/utils/workout-schedule';
import { colors } from '@/theme';

export function WeekdayRail({ schedule, weekday, pending, onDay }: {
  schedule: WeeklyWorkout[]; weekday: number | null; pending: boolean; onDay: (day: number) => void;
}) {
  const compact = useWindowDimensions().width < 600;
  return <View style={[s.rail, compact && s.railCompact]}>
    <Text style={s.eyebrow}>Your week</Text>
    {weekdays.map((day, index) => {
      const selected = weekday === index;
      const saved = schedule.some(item => item.weekday === index);
      return <Pressable
        key={day}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled: pending }}
        accessibilityLabel={saved ? `${day}, saved` : day}
        disabled={pending}
        onPress={() => onDay(index)}
        style={({ pressed }) => [s.day, compact && s.dayCompact, selected && s.daySelected, (pending || pressed) && s.dayDisabled]}
      >
        <Text style={[s.dayText, selected && s.dayTextSelected]}>{compact ? day.slice(0, 3) : day}</Text>
        {saved && <Text style={[s.check, selected && s.dayTextSelected]}>✓</Text>}
      </Pressable>;
    })}
  </View>;
}

export function DayTimeField({ day, time, pending, onTime }: {
  day: string; time: string; pending: boolean; onTime: (time: string) => void;
}) {
  return <View style={s.timeCard}>
    <Text style={s.label}>{day} training time</Text>
    <TextInput accessibilityLabel="Training time" placeholder="HH:MM" value={time} onChangeText={onTime} editable={!pending} maxLength={5} style={s.timeInput} />
    <Text style={s.small}>24-hour local time, such as 18:00. This organizes the plan and does not send a reminder.</Text>
  </View>;
}

const s = StyleSheet.create({
  rail: { width: 168, padding: 14, gap: 8, backgroundColor: colors.paper, borderRadius: 20 },
  railCompact: { width: 76, padding: 8 },
  dayCompact: { paddingHorizontal: 6, flexWrap: 'wrap', gap: 2 },
  eyebrow: { fontSize: 12, fontWeight: '700', color: colors.blue, marginBottom: 4 },
  day: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  daySelected: { backgroundColor: colors.blue },
  dayDisabled: { opacity: 0.45 },
  dayText: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  dayTextSelected: { color: '#FFFFFF' },
  check: { color: colors.blue, fontSize: 16, fontWeight: '700' },
  timeCard: { padding: 20, gap: 10, backgroundColor: colors.paper, borderRadius: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink },
  small: { fontSize: 12, lineHeight: 18, color: colors.secondary },
  timeInput: { minHeight: 48, width: '100%', maxWidth: 160, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.ink, backgroundColor: '#F8FAFD' },
});
