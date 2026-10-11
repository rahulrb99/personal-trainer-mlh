import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { type TrainerPersona } from '@/api/schema';
import { ActionButton } from './action-button';
import { colors } from '@/theme';

const palette = { blue: '#84ABFF', mint: '#7CD9BC', peach: '#FFB38F' };
export function TrainerAvatar({ trainer, size = 120, speaking = false, celebrating = false }: { trainer: TrainerPersona; size?: number; speaking?: boolean; celebrating?: boolean }) {
  return <View accessible accessibilityLabel={`${trainer.name}, ${trainer.expression} ${trainer.color} trainer with ${trainer.accessory}`}>
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Ellipse cx="80" cy="143" rx="45" ry="7" fill={colors.border} />
      <Path d="M40 110 Q12 110 23 85 M120 110 Q148 100 139 80" stroke={palette[trainer.color]} strokeWidth="14" strokeLinecap="round" fill="none" />
      <Path d="M42 124 Q28 100 36 65 Q39 32 80 29 Q121 32 124 65 Q132 100 118 124 Q104 141 80 133 Q56 141 42 124" fill={palette[trainer.color]} />
      <Ellipse cx="56" cy="132" rx="14" ry="9" fill={palette[trainer.color]} /><Ellipse cx="104" cy="132" rx="14" ry="9" fill={palette[trainer.color]} />
      {trainer.expression === 'calm' && !celebrating ? <Path d="M55 78 Q61 72 67 78 M93 78 Q99 72 105 78" stroke={colors.ink} strokeWidth="4" strokeLinecap="round" fill="none" /> : <><Ellipse cx="61" cy="76" rx="5" ry={celebrating ? 4 : 8} fill={colors.ink} /><Ellipse cx="99" cy="76" rx="5" ry={celebrating ? 4 : 8} fill={colors.ink} /></>}
      {trainer.expression === 'bold' && <Path d="M53 60 L68 64 M92 64 L107 60" stroke={colors.ink} strokeWidth="4" strokeLinecap="round" />}
      {speaking ? <Ellipse cx="80" cy="98" rx="9" ry="12" fill={colors.ink} /> : <Path d="M67 94 Q80 109 93 94" fill="none" stroke={colors.ink} strokeWidth="4" strokeLinecap="round" />}
      <Ellipse cx="48" cy="92" rx="7" ry="4" fill="#FFFFFF" opacity={0.4} /><Ellipse cx="112" cy="92" rx="7" ry="4" fill="#FFFFFF" opacity={0.4} />
      {trainer.accessory === 'headband' && <><Path d="M37 55 Q80 44 123 55" fill="none" stroke="#FFFFFF" strokeWidth="10" /><Rect x="72" y="46" width="16" height="11" rx="3" fill={colors.blue} /></>}
      {trainer.accessory === 'headphones' && <><Path d="M33 83 V64 Q33 20 80 20 Q127 20 127 64 V83" fill="none" stroke={colors.ink} strokeWidth="8" /><Rect x="26" y="65" width="16" height="30" rx="8" fill={colors.ink} /><Rect x="118" y="65" width="16" height="30" rx="8" fill={colors.ink} /></>}
      {celebrating && <><Path d="M17 32 L20 22 M139 32 L145 23 M12 52 L5 49" stroke={colors.blue} strokeWidth="4" strokeLinecap="round" /><Circle cx="131" cy="13" r="4" fill={palette[trainer.color]} /></>}
    </Svg>
  </View>;
}
export function motivationGreeting(user: string) {
  return `Hey ${user.trim().split(/\s+/)[0] || 'friend'}, good to see you. Let’s make a little progress today, one set at a time.`;
}
export function TrainerPersonaEditor({ value, onSave, onCancel, saving, error, signedIn }: { value: TrainerPersona; onSave: (value: TrainerPersona) => void; onCancel: () => void; saving: boolean; error: string | null; signedIn: boolean }) {
  const [draft, setDraft] = useState(value);
  const set = <K extends keyof TrainerPersona>(key: K, value: TrainerPersona[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  function choices<K extends 'color' | 'expression' | 'accessory' | 'language'>(key: K, values: TrainerPersona[K][]) {
    return <View style={s.row}>{values.map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${key}: ${value}`} accessibilityState={{ selected: draft[key] === value }} onPress={() => set(key, value)} style={[s.choice, draft[key] === value && s.selected]}>{key === 'color' && <View style={[s.swatch, { backgroundColor: palette[value as TrainerPersona['color']] }]} />}<Text style={s.choiceText}>{key === 'language' ? value === 'es' ? 'Español' : 'English' : value.charAt(0).toUpperCase() + value.slice(1)}</Text></Pressable>)}</View>;
  }
  return <View style={s.panel}>
    <View style={s.row}><TrainerAvatar trainer={draft} size={140} /><View style={s.intro}><Text style={s.title}>Meet your trainer.</Text><Text style={s.body}>A little personality. A reason to show up. Make this companion yours.</Text></View></View>
    <Text style={s.label}>Trainer’s name</Text><TextInput accessibilityLabel="Trainer’s name" maxLength={30} value={draft.name} onChangeText={value => set('name', value)} style={s.input} placeholder="Mat" />
    <Text style={s.label}>Trainer language</Text>{choices('language', ['en', 'es'])}
    <Text style={s.body}>Your trainer speaks this language. App menus stay in English.</Text>
    <Text style={s.label}>Color</Text>{choices('color', ['blue', 'mint', 'peach'])}
    <Text style={s.label}>Expression</Text>{choices('expression', ['happy', 'calm', 'bold'])}
    <Text style={s.label}>Accessory</Text>{choices('accessory', ['headband', 'headphones', 'none'])}
    <Text style={s.label}>Why I show up</Text><Text style={s.body}>What brings you to the gym—even on the days you don’t feel like coming?</Text>
    <TextInput accessibilityLabel="Why I show up" multiline maxLength={240} value={draft.motivation} onChangeText={value => set('motivation', value)} placeholder="I want more energy and to feel confident." style={[s.input, { minHeight: 100, textAlignVertical: 'top' }]} />
    <Text style={s.body}>{draft.motivation.length}/240 · Your words, editable anytime.</Text>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: draft.remind }} onPress={() => set('remind', !draft.remind)} style={s.row}><View style={[s.check, draft.remind && s.selected]}><Text>{draft.remind ? '✓' : ''}</Text></View><Text style={s.intro}>Remind me at the beginning of each workout</Text></Pressable>
    <Text style={s.body}>{signedIn ? 'Saved to your profile. ' : 'Used for this workout. Sign in on web to save for future visits. '}When you connect voice, your trainer name and motivation are shared with the voice service.</Text>
    {!!draft.motivation.trim() && <View style={s.preview}><Text style={s.label}>A little encouragement</Text><Text style={s.body}>{motivationGreeting('friend')}</Text><Text style={s.body}>Your trainer will work your words into a natural greeting when voice connects.</Text></View>}
    {error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    <View style={s.row}><ActionButton title={saving ? 'Saving…' : 'Save my trainer'} disabled={saving || !draft.name.trim()} onPress={() => onSave({ ...draft, name: draft.name.trim(), motivation: draft.motivation.trim() })} /><ActionButton title="Cancel" secondary disabled={saving} onPress={onCancel} /></View>
  </View>;
}
const s = StyleSheet.create({
  panel: { padding: 24, gap: 14, backgroundColor: colors.paper, borderRadius: 20 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  intro: { flex: 1, minWidth: 150, color: colors.ink }, title: { fontSize: 32, fontWeight: '700', letterSpacing: -1, color: colors.ink }, body: { fontSize: 14, lineHeight: 22, color: colors.secondary }, label: { fontSize: 15, fontWeight: '600', color: colors.ink },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 48, color: colors.ink, backgroundColor: '#F8FAFD' }, choice: { minHeight: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 2, borderColor: colors.border }, selected: { borderColor: colors.blue, backgroundColor: colors.paleBlue }, choiceText: { color: colors.ink, fontWeight: '600' }, swatch: { width: 18, height: 18, borderRadius: 9 }, check: { width: 26, height: 26, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', borderRadius: 6 }, preview: { padding: 16, gap: 8, backgroundColor: colors.paleBlue, borderRadius: 12 },
});
