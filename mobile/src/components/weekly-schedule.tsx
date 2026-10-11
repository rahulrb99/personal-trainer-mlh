import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { WeeklyWorkout } from '@/api/schema';
import { weekdays } from '@/utils/workout-schedule';
import { colors } from '@/theme';

export function WeekdayRail({ schedule, weekday, pending, onDay }: {
  schedule: WeeklyWorkout[]; weekday: number | null; pending: boolean; onDay: (day: number) => void;
}) {
  return <View style={s.rail}>
    <Text style={s.eyebrow}>YOUR WEEK</Text>
    {weekdays.map((day, index) => {
      const selected = weekday === index;
      const saved = schedule.some(item => item.weekday === index);
      return <Pressable
        key={day}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={saved ? `${day}, saved` : day}
        disabled={pending}
        onPress={() => onDay(index)}
        style={[s.day, selected && s.daySelected, pending && s.dayDisabled]}
      >
        <Text style={[s.dayText, selected && s.dayTextSelected]}>{day}</Text>
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
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: colors.blue, marginBottom: 4 },
  day: { minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.paleBlue, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  daySelected: { backgroundColor: colors.blue },
  dayDisabled: { opacity: 0.45 },
  dayText: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  dayTextSelected: { color: '#FFFFFF' },
  check: { color: colors.blue, fontSize: 16, fontWeight: '700' },
  timeCard: { padding: 20, gap: 10, backgroundColor: colors.paper, borderRadius: 20 },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink },
  small: { fontSize: 12, lineHeight: 18, color: colors.secondary },
  timeInput: { minHeight: 48, width: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.ink, backgroundColor: '#F8FAFD' },
});
