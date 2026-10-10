import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { ActionButton } from '@/components/action-button';
import { api } from '@/api/client';
import { Action, Catalog, Preferences, Snapshot } from '@/api/schema';
import { useSession } from '@/hooks/use-session';
import { colors } from '@/theme';
import { VoicePanel } from '@/voice/voice-panel';

const phaseLabels: Record<Snapshot['phase'], string> = {
  awaiting_equipment: 'Find your equipment', awaiting_alternative_confirmation: 'Try an alternative?',
  exercising: 'Your next set', resting: 'Take a breath', blocked: 'Let’s find a way forward', completed: 'You showed up.', ended: 'Your work is saved.',
};
function Paragraph({ children }: { children: React.ReactNode }) { return <Text style={s.body}>{children}</Text>; }

export function TrainerScreen({ watchOnly = false }: { watchOnly?: boolean }) {
  const session = useSession();
  const { snapshot: state, pending, error } = session;
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Preferences['mode']>('strict');
  const [coaching, setCoaching] = useState<Preferences['coaching']>('standard');
  const [demo, setDemo] = useState(true);
  const [exclude, setExclude] = useState<string[]>([]);
  const [joinId, setJoinId] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [endConfirm, setEndConfirm] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  function loadCatalog() { setCatalogError(null); api.catalog().then(setCatalog).catch(e => setCatalogError(e.message)); }
  useEffect(() => { api.catalog().then(setCatalog).catch(e => setCatalogError(e.message)); }, []);
  const ended = state?.phase === 'ended' || state?.phase === 'completed';
  function act(type: Action, source: 'web' | 'watch' = watchOnly ? 'watch' : 'web') { session.act(type, source).catch(() => { /* useSession displays the rejection and retains authoritative state. */ }); }
  const allEntries = state ? [...state.completed, ...state.skipped, ...state.queue, ...state.deferred, ...(state.current ? [state.current] : [])] : [];
  const setsSaved = allEntries.reduce((sum, e) => sum + e.completed_sets, 0);

  const controls = state && !ended ? <View style={s.controls}>
    {state.phase === 'awaiting_equipment' && <><ActionButton title="Got it" onPress={() => act('equipment_claimed')} disabled={pending} /><ActionButton title="Taken" secondary onPress={() => act('equipment_taken')} disabled={pending} /></>}
    {state.phase === 'exercising' && <ActionButton title="Set done" onPress={() => act('set_completed')} disabled={pending} />}
    {state.phase === 'resting' && <Paragraph>Rest ends automatically. Your next set is ready in {session.restSeconds}s.</Paragraph>}
    {state.phase === 'awaiting_alternative_confirmation' && <><Paragraph>{state.pending_alternative?.name} · {state.pending_alternative?.equipment}</Paragraph><ActionButton title="Accept alternative" onPress={() => act('alternative_accepted')} disabled={pending} /><ActionButton title="Keep my exercises" secondary onPress={() => act('alternative_declined')} disabled={pending} /></>}
    {state.phase === 'blocked' && <ActionButton title="Retry remaining exercises" onPress={() => act('retry_deferred')} disabled={pending} />}
    {state.current && <ActionButton title="Skip exercise" secondary onPress={() => act('skip_exercise')} disabled={pending} />}
    {endConfirm ? <><Paragraph>End today’s workout? Your completed sets will be saved.</Paragraph><ActionButton title="Yes, end workout" danger onPress={() => { act('end_session'); setEndConfirm(false); }} disabled={pending} /><ActionButton title="Continue workout" secondary onPress={() => setEndConfirm(false)} /></> : <ActionButton title="End workout" secondary onPress={() => setEndConfirm(true)} disabled={pending} />}
    {pending && <Paragraph>Waiting for confirmation…</Paragraph>}
  </View> : null;

  return <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" style={s.page} contentContainerStyle={s.container}>
    <View style={s.header}><View><Text style={s.brand}>spotter<Text style={{ color: colors.blue }}>.</Text></Text><Text style={s.tagline}>A little guidance. Every set.</Text></View><View style={s.status}><View style={[s.dot, { backgroundColor: state && session.connection === 'Live' ? colors.good : colors.secondary }]} /><Text style={s.small}>{state ? session.connection : 'Web prototype'}</Text></View></View>
    {(error || catalogError) && <View style={s.error}><Text selectable style={{ color: colors.danger }}>{error || catalogError}</Text>{catalogError && <ActionButton title="Reconnect" secondary onPress={loadCatalog} />}</View>}

    {!state && watchOnly ? <View style={s.panel}><Text style={s.title}>Join your workout</Text><Paragraph>This browser panel stands in for watch controls. Enter session access from the trainer screen.</Paragraph><TextInput accessibilityLabel="Session ID" placeholder="Session ID" value={joinId} onChangeText={setJoinId} style={s.input} /><TextInput accessibilityLabel="Session token" placeholder="Session token" value={joinToken} secureTextEntry onChangeText={setJoinToken} style={s.input} />{joinError && <Text style={{ color: colors.danger }}>{joinError}</Text>}<ActionButton title="Join session" onPress={() => { setJoinError(null); session.join({ session_id: joinId.trim(), access_token: joinToken.trim() }).catch(e => setJoinError(e.message)); }} /></View> : !state ? <View style={[s.columns, wide && { flexDirection: 'row' }]}>
      <View style={[s.intro, wide && { flex: 1 }]}><Text style={s.hero}>Your plan.{'\n'}A voice to{'\n'}guide you.</Text><Paragraph>Meet Mat, your gym companion. Set up today’s session, then take it one movement at a time.</Paragraph><View style={s.mat}><Text style={s.matSymbol}>m</Text><View style={{ flex: 1 }}><Text style={s.heading}>Mat is ready when you are.</Text><Paragraph>Guidance for the equipment in your gym, with room to change plans.</Paragraph></View></View><Text style={s.small}>North gym is a fictional demo gym. Equipment availability is confirmed by you.</Text></View>
      <View style={[s.panel, wide && { width: 430 }]}><Text style={s.title}>Today’s session</Text><Text style={s.label}>What should Mat call you?</Text><TextInput accessibilityLabel="Your name" placeholder="Your name" maxLength={60} value={name} onChangeText={setName} style={s.input} />
        <Text style={s.label}>When equipment is taken</Text><View style={s.optionRow}><ActionButton title="Keep my exercises" secondary={mode !== 'strict'} onPress={() => setMode('strict')} /><ActionButton title="Allow alternatives" secondary={mode !== 'alternatives'} onPress={() => setMode('alternatives')} /></View>
        <Text style={s.label}>Coaching style</Text><View style={s.optionRow}>{(['quiet', 'standard', 'teach'] as const).map(value => <ActionButton key={value} title={{ quiet: 'Quiet', standard: 'Standard', teach: 'Teach me' }[value]} secondary={coaching !== value} onPress={() => setCoaching(value)} />)}</View>
        <Text style={s.label}>Full body foundations</Text>{!catalog ? <ActivityIndicator color={colors.blue} /> : catalog.routines[0].exercise_ids.map((id, index) => { const exercise = catalog.exercises.find(e => e.id === id)!; return <View key={id} style={s.routine}><Text style={s.number}>{index + 1}</Text><View style={{ flex: 1 }}><Text style={s.heading}>{exercise.name}</Text><Text style={s.small}>{exercise.sets} sets × {exercise.reps} reps</Text></View><ActionButton title={exclude.includes(id) ? 'Include' : 'Exclude'} secondary onPress={() => setExclude(exclude.includes(id) ? exclude.filter(x => x !== id) : [...exclude, id])} /></View>; })}
        <View style={s.optionRow}><ActionButton title={demo ? 'Demo rest: 5s' : 'Normal rest: 60s'} secondary onPress={() => setDemo(!demo)} /><Text style={s.small}>Shortened rests for testing.</Text></View>
        <ActionButton title={pending ? 'Starting…' : 'Start workout'} disabled={!catalog || pending || exclude.length === 3} onPress={() => session.start({ name: name.trim() || 'You', mode, coaching, excluded_exercise_ids: exclude }, demo)} />
        <Paragraph>Voice can be connected after setup. Buttons remain available while you test.</Paragraph>
      </View>
    </View> : ended ? <View style={s.panel}><Text style={s.hero}>{phaseLabels[state.phase]}</Text><Paragraph>{state.preferences.name}, every completed set counts.</Paragraph><View style={s.metrics}><View><Text style={s.metric}>{setsSaved}</Text><Paragraph>sets saved</Paragraph></View><View><Text style={s.metric}>{state.completed.length}</Text><Paragraph>exercises completed</Paragraph></View></View>{allEntries.filter(e => e.completed_sets > 0).map(e => <View style={s.routine} key={e.instance_id}><View style={{ flex: 1 }}><Text style={s.heading}>{e.name}</Text><Paragraph>{e.completed_sets} of {e.sets} sets{e.id !== e.original_exercise_id ? ' · Substituted' : ''}</Paragraph></View></View>)}{setsSaved === 0 && <Paragraph>No sets were recorded today.</Paragraph>}<Paragraph>{state.skipped.length} exercise(s) skipped. Unfinished work is not counted as complete.</Paragraph><ActionButton title="Start a new session" onPress={() => session.reset().catch(e => setJoinError(e.message))} />{session.credentials && <VoicePanel credentials={session.credentials} snapshot={state} act={session.act} />}</View> : <View style={[s.columns, wide && !watchOnly && { flexDirection: 'row' }]}>
      <View style={[s.panel, { flex: 1 }]}><Text style={s.label}>{phaseLabels[state.phase]}</Text><Text style={s.title}>{state.current?.name || 'Your remaining exercises'}</Text><Paragraph>{state.current?.location || 'Try the deferred equipment again when you’re ready.'}</Paragraph>{state.current && <View style={s.metrics}><View><Text style={s.metric}>{state.phase === 'resting' ? `${session.restSeconds}s` : `${state.set_index}/${state.current.sets}`}</Text><Paragraph>{state.phase === 'resting' ? 'rest remaining' : 'current set'}</Paragraph></View><View><Text style={s.metric}>{state.current.reps}</Text><Paragraph>planned reps</Paragraph></View></View>}
        <View style={s.cue}><Text style={s.heading}>Mat’s next step</Text><Paragraph>{state.last_decision}</Paragraph></View>
        {state.demo_mode && <Text style={s.small}>Demo mode · Rests shortened to 5 seconds</Text>}
        {watchOnly ? controls : <>{session.credentials && <VoicePanel credentials={session.credentials} snapshot={state} act={session.act} />}<Text style={s.label}>Phone fallback controls</Text>{controls}</>}
      </View>
      {!watchOnly && <View style={[s.sidebar, wide && { width: 310 }]}><View style={s.watch}><Text style={[s.small, { color: '#B8C8DE' }]}>Watch controls · Browser simulation</Text><Text style={s.watchTitle}>{state.current?.name || 'Remaining work'}</Text><Text style={{ color: '#DDE7F5', marginBottom: 20 }}>{pending ? 'Confirming…' : 'Connected to your session'}</Text>{state.phase === 'awaiting_equipment' && <><ActionButton title="Got it" disabled={pending} onPress={() => act('equipment_claimed', 'watch')} /><ActionButton title="Taken" secondary disabled={pending} onPress={() => act('equipment_taken', 'watch')} /></>}{state.phase === 'exercising' && <ActionButton title="Set done" disabled={pending} onPress={() => act('set_completed', 'watch')} />}{state.phase === 'resting' && <Text style={s.watchCountdown}>{session.restSeconds}s</Text>}<Link href="/watch" target="_blank" style={{ color: '#DAE5FF', marginTop: 16 }}>Open separate watch panel</Link></View><View style={s.panel}><Text style={s.heading}>Still to come</Text>{[...state.queue, ...state.deferred].map(e => <View key={e.instance_id} style={s.queue}><Text style={s.body}>{e.name}</Text><Text style={s.small}>{state.deferred.some(d => d.instance_id === e.instance_id) ? 'Deferred · reported taken' : `${e.sets} sets`}</Text></View>)}{!state.queue.length && !state.deferred.length && <Paragraph>Your last exercise is in progress.</Paragraph>}<ActionButton title={showAccess ? 'Hide session access' : 'Pair browser watch panel'} secondary onPress={() => setShowAccess(!showAccess)} />{showAccess && session.credentials && <><Paragraph>Copy these only into your local watch panel.</Paragraph><Text selectable style={s.small}>Session ID: {session.credentials.session_id}</Text><Text selectable style={s.small}>Session token: {session.credentials.access_token}</Text></>}</View></View>}
    </View>}
    <View style={s.footer}><Text style={s.small}>Spotter · Built for the next set.</Text><Text style={s.small}>Exercise guidance is demo content pending professional review.</Text></View>
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, container: { padding: 28, gap: 28, width: '100%', maxWidth: 1180, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }, brand: { fontSize: 32, fontWeight: '800', letterSpacing: -1.5, color: colors.ink }, tagline: { fontSize: 13, color: colors.secondary },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 }, dot: { width: 8, height: 8, borderRadius: 4 }, small: { fontSize: 12, lineHeight: 18, color: colors.secondary },
  columns: { gap: 24 }, intro: { paddingVertical: 30, gap: 26 }, hero: { fontSize: 54, lineHeight: 58, letterSpacing: -2.5, fontWeight: '700', color: colors.ink }, body: { fontSize: 15, lineHeight: 24, color: colors.secondary },
  panel: { padding: 26, backgroundColor: colors.paper, borderRadius: 20, gap: 18 }, title: { fontSize: 34, fontWeight: '700', letterSpacing: -1.2, color: colors.ink }, heading: { fontSize: 16, fontWeight: '600', color: colors.ink },
  label: { fontSize: 14, fontWeight: '600', color: colors.secondary }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.ink, backgroundColor: '#F8FAFD' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, routine: { flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, number: { fontSize: 18, color: colors.secondary, fontVariant: ['tabular-nums'] },
  mat: { flexDirection: 'row', gap: 16, alignItems: 'center', padding: 20, backgroundColor: colors.paleBlue, borderRadius: 18 }, matSymbol: { fontSize: 40, color: colors.blue, fontWeight: '800', paddingHorizontal: 10 },
  metrics: { flexDirection: 'row', gap: 50, paddingVertical: 20 }, metric: { fontSize: 54, fontWeight: '600', letterSpacing: -2, color: colors.ink, fontVariant: ['tabular-nums'] },
  cue: { padding: 20, gap: 10, backgroundColor: colors.paleBlue, borderRadius: 14 }, controls: { gap: 10 }, sidebar: { gap: 20 }, watch: { padding: 25, gap: 12, backgroundColor: '#203956', borderRadius: 32, borderWidth: 5, borderColor: '#D0DCE9' }, watchTitle: { fontSize: 24, fontWeight: '600', color: '#FFFFFF' }, watchCountdown: { color: '#FFFFFF', fontSize: 48, fontVariant: ['tabular-nums'] },
  queue: { paddingVertical: 10, gap: 3, borderBottomColor: colors.border, borderBottomWidth: 1 }, error: { padding: 18, backgroundColor: '#FBECEF', borderRadius: 12, gap: 12 }, footer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingBottom: 12 },
});
