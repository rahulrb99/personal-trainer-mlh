import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { Link } from 'expo-router';
import { ActionButton } from '@/components/action-button';
import { SetHistory, SetTracking } from '@/components/set-tracking';
import { ExerciseCatalogDetails } from '@/components/exercise-catalog-details';
import { MuscleMap } from '@/components/muscle-map';
import { LandingScreen } from '@/screens/landing-screen';
import { api } from '@/api/client';
import { loadProfileAuth, saveProfileAuth } from '@/api/profile-storage';
import { Action, Catalog, PlannedExercise, Preferences, ProfileAuth, Snapshot, UserProfile } from '@/api/schema';
import { useSession } from '@/hooks/use-session';
import { colors } from '@/theme';
import { getVolumeCautions, recommendedSetLimit, type VolumeCaution } from '@/utils/workout-volume';
import { TrainerAvatar, TrainerPersonaEditor, motivationGreeting } from '@/components/trainer-persona';
import { defaultTrainer, type TrainerPersona } from '@/api/schema';
import { reminderHandled, markReminderHandled } from '@/voice/reminder-state';
import { VoicePanel } from '@/voice/voice-panel';

const phaseLabels: Record<Snapshot['phase'], string> = {
  awaiting_equipment: 'Find your equipment', awaiting_alternative_confirmation: 'Try an alternative?',
  exercising: 'Your next set', resting: 'Take a breath', blocked: 'Let’s find a way forward', completed: 'You showed up.', ended: 'Your work is saved.',
};
function Paragraph({ children }: { children: React.ReactNode }) { return <Text style={s.body}>{children}</Text>; }

function Stepper({ label, value, minimum, maximum, onChange }: { label: string; value: number; minimum: number; maximum: number; onChange: (value: number) => void }) {
  return <View style={s.stepper}>
    <Text style={s.small}>{label}</Text>
    <View style={s.stepperControls}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} disabled={value <= minimum} onPress={() => onChange(value - 1)} style={s.stepButton}><Text style={s.stepText}>−</Text></Pressable>
      <Text style={s.stepValue}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} disabled={value >= maximum} onPress={() => onChange(value + 1)} style={s.stepButton}><Text style={s.stepText}>+</Text></Pressable>
    </View>
  </View>;
}

function PlanEditor({ catalog, selectedGroups, plan, onChange, volumeCautions, volumeAcknowledged, onVolumeAcknowledgementChange }: {
  catalog: Catalog;
  selectedGroups: string[];
  plan: PlannedExercise[];
  onChange: (plan: PlannedExercise[]) => void;
  volumeCautions: VolumeCaution[];
  volumeAcknowledged: boolean;
  onVolumeAcknowledgementChange: (acknowledged: boolean) => void;
}) {
  const byId = new Map(catalog.exercises.map(exercise => [exercise.id, exercise]));
  const plannedIds = new Set(plan.map(item => item.exercise_id));
  const selectedNames = new Map(catalog.muscle_groups.map(group => [group.id, group.name]));
  const eligibleToAdd = catalog.exercises.filter(exercise =>
    !plannedIds.has(exercise.id)
    && selectedGroups.some(group => exercise.primary_muscle_group === group || exercise.secondary_muscle_groups.includes(group))
  );
  const update = (index: number, patch: Partial<PlannedExercise>) => onChange(plan.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));

  return <View style={{ gap: 18 }}>
    <View>
      <Text style={s.title}>Approve today’s plan</Text>
      <Paragraph>Review each machine and location. Settings are planning values, not a prescribed safe load.</Paragraph>
    </View>
    {!!volumeCautions.length && <View accessibilityRole="alert" style={s.caution}>
      <Text style={s.cautionTitle}>Check your planned volume</Text>
      <Paragraph>
        {volumeCautions.map(item => `${selectedNames.get(item.muscleGroupId) ?? item.muscleGroupId}: ${item.plannedSets} sets`).join(' · ')}
      </Paragraph>
      <Paragraph>High planned volume may increase fatigue. Consider reducing sets or asking a qualified trainer. This is not an overtraining diagnosis.</Paragraph>
      <Text style={s.small}>This caution appears above {recommendedSetLimit} planned sets per muscle, including primary and secondary muscle work.</Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: volumeAcknowledged }}
        onPress={() => onVolumeAcknowledgementChange(!volumeAcknowledged)}
        style={[s.acknowledgement, volumeAcknowledged && s.acknowledgementChecked]}
      >
        <View style={[s.checkbox, volumeAcknowledged && s.checkboxChecked]} />
        <Text style={s.acknowledgementText}>I reviewed this fatigue caution and want to continue.</Text>
      </Pressable>
    </View>}
    {plan.map((item, index) => {
      const exercise = byId.get(item.exercise_id);
      if (!exercise) return null;
      const replacement = exercise.alternatives.map(id => byId.get(id)).find(candidate => candidate && !plannedIds.has(candidate.id));
      return <View key={item.exercise_id} style={s.planCard}>
        <View style={s.planHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.heading}>{exercise.name}</Text>
            <Text style={s.small}>{selectedNames.get(exercise.primary_muscle_group) || exercise.primary_muscle_group} · {exercise.location}</Text>
            <Text style={s.small}>{exercise.equipment}</Text>
          </View>
          <ActionButton title="Remove" secondary onPress={() => onChange(plan.filter((_, itemIndex) => itemIndex !== index))} />
        </View>
        <View style={s.settingsRow}>
          <Stepper label="sets" value={item.sets} minimum={1} maximum={5} onChange={sets => update(index, { sets })} />
          <Stepper label="reps" value={item.reps} minimum={1} maximum={30} onChange={reps => update(index, { reps })} />
        </View>
        <View>
          <Text style={s.label}>Weight · {item.weight_lb === null ? 'Not set' : `${item.weight_lb} lb`}</Text>
          <Slider
            accessibilityLabel={`${exercise.name} weight`}
            minimumValue={exercise.weight_min_lb}
            maximumValue={exercise.weight_max_lb}
            step={exercise.weight_step_lb}
            value={item.weight_lb ?? exercise.weight_min_lb}
            minimumTrackTintColor={colors.blue}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.blue}
            onValueChange={weight => update(index, { weight_lb: Math.round(weight) })}
          />
          {item.weight_lb !== null && <ActionButton title="Clear weight" secondary onPress={() => update(index, { weight_lb: null })} />}
        </View>
        <ExerciseCatalogDetails catalog={catalog} exercise={exercise} />
        {replacement && <ActionButton title={`Replace with ${replacement.name}`} secondary onPress={() => update(index, {
          exercise_id: replacement.id, sets: replacement.sets, reps: replacement.reps, weight_lb: null,
        })} />}
      </View>;
    })}
    <View style={s.planCard}>
      <Text style={s.heading}>Add another selected-muscle machine</Text>
      <View style={s.optionRow}>
        {eligibleToAdd.map(exercise => <ActionButton
          key={exercise.id}
          title={`Add ${exercise.name}`}
          secondary
          disabled={plan.length >= 8}
          onPress={() => onChange([...plan, { exercise_id: exercise.id, sets: exercise.sets, reps: exercise.reps, weight_lb: null }])}
        />)}
        {!eligibleToAdd.length && <Paragraph>All matching machines are already included.</Paragraph>}
      </View>
    </View>
  </View>;
}

export function TrainerScreen({ watchOnly = false }: { watchOnly?: boolean }) {
  const session = useSession();
  const { snapshot: state, pending, error } = session;
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Preferences['mode']>('strict');
  const [coaching, setCoaching] = useState<Preferences['coaching']>('standard');
  const [demo, setDemo] = useState(true);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlannedExercise[] | null>(null);
  const [volumeAcknowledged, setVolumeAcknowledged] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [joinId, setJoinId] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [endConfirm, setEndConfirm] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [trainer, setTrainer] = useState<TrainerPersona>(defaultTrainer);
  const [editingTrainer, setEditingTrainer] = useState(false);
  const [savingTrainer, setSavingTrainer] = useState(false);
  const [trainerError, setTrainerError] = useState<string | null>(null);
  const [dismissedReminder, setDismissedReminder] = useState<string | null>(null);
  const [profileAuth, setProfileAuth] = useState<ProfileAuth | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  function applyProfile(next: UserProfile) {
    setProfile(next);
    setTrainer(next.preferences.trainer);
    setName(next.name);
    setMode(next.preferences.mode);
    setCoaching(next.preferences.coaching);
    if (next.muscle_group_ids.length) setSelectedGroups(next.muscle_group_ids);
    if (next.plan?.length) {
      setPlan(next.plan);
      setVolumeAcknowledged(false);
    }
  }
  function loadCatalog() { setCatalogError(null); api.catalog().then(setCatalog).catch(e => setCatalogError(e.message)); }
  useEffect(() => { api.catalog().then(setCatalog).catch(e => setCatalogError(e.message)); }, []);
  useEffect(() => {
    let active = true;
    async function restoreProfile() {
      const healthCheck = api.health().then(health => {
        if (active) setGoogleEnabled(health.google_auth_configured);
      }).catch(() => {
        if (active) setProfileError('Could not connect. Refresh the page to try again.');
      });
      try {
        const auth = await loadProfileAuth();
        if (auth) {
          try {
            const saved = await api.profile(auth);
            if (active) { setProfileAuth(auth); applyProfile(saved); }
          } catch (failure) {
            await saveProfileAuth(null);
            if (active) setProfileError(failure instanceof Error ? failure.message : 'Please sign in again.');
          }
        }
      } catch {
        if (active) setProfileError('Your saved sign-in could not be read. Please sign in again.');
      } finally {
        await healthCheck;
        if (active) setCheckingProfile(false);
      }
    }
    void restoreProfile();
    return () => { active = false; };
  }, []);
  async function signInWithGoogle(idToken: string) {
    if (signingIn) return;
    setSigningIn(true);
    setProfileError(null);
    try {
      const result = await api.googleSignIn(idToken);
      const auth = { access_token: result.access_token };
      await saveProfileAuth(auth);
      setProfileAuth(auth);
      applyProfile(result.profile);
    } catch (failure) {
      setProfileError(failure instanceof Error ? failure.message : 'Google sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  }
  async function signOutProfile() {
    try {
      await saveProfileAuth(null);
      setProfileAuth(null);
      setProfile(null);
      setName('');
      setTrainer(defaultTrainer);
      setEditingTrainer(false);
      setSelectedGroups([]);
      setPlan(null);
      setVolumeAcknowledged(false);
      setProfileError(null);
    } catch {
      setProfileError('Could not sign out. Please try again.');
    }
  }
  async function persistProfile(nextPlan: PlannedExercise[]) {
    if (!profileAuth) return;
    const saved = await api.saveProfile(profileAuth, {
      name: name.trim() || profile?.name || 'You',
      preferences: { name: name.trim() || profile?.name || 'You', mode, coaching, trainer, excluded_exercise_ids: [] },
      muscle_group_ids: selectedGroups,
      plan: nextPlan,
    });
    setProfile(saved);
  }
  async function saveTrainer(next: TrainerPersona) {
    setSavingTrainer(true); setTrainerError(null);
    try {
      if (profileAuth) {
        const saved = await api.saveProfile(profileAuth, {
          name: name.trim() || profile?.name || 'You',
          preferences: { name: name.trim() || profile?.name || 'You', mode, coaching, trainer: next, excluded_exercise_ids: [] },
          muscle_group_ids: selectedGroups, plan,
        });
        setProfile(saved);
      }
      setTrainer(next); setEditingTrainer(false);
    } catch (failure) { setTrainerError(failure instanceof Error ? failure.message : 'Could not save your trainer. Try again.'); }
    finally { setSavingTrainer(false); }
  }
  function toggleGroup(groupId: string) {
    setPlan(null);
    setVolumeAcknowledged(false);
    setPlanError(null);
    setSelectedGroups(groups => groups.includes(groupId) ? groups.filter(id => id !== groupId) : [...groups, groupId]);
  }
  function updatePlan(nextPlan: PlannedExercise[]) {
    setPlan(nextPlan);
    setVolumeAcknowledged(false);
  }
  async function previewPlan() {
    if (!selectedGroups.length) return;
    setPlanning(true);
    setPlanError(null);
    try {
      const preview = await api.previewPlan(selectedGroups);
      setPlan(preview.plan);
      setVolumeAcknowledged(false);
    } catch (failure) {
      setPlanError(failure instanceof Error ? failure.message : 'Could not build a workout plan.');
    } finally {
      setPlanning(false);
    }
  }
  const ended = state?.phase === 'ended' || state?.phase === 'completed';
  function act(type: Action, source: 'web' | 'watch' = watchOnly ? 'watch' : 'web') { session.act(type, source).catch(() => { /* useSession displays the rejection and retains authoritative state. */ }); }
  const allEntries = state ? [...state.completed, ...state.skipped, ...state.queue, ...state.deferred, ...(state.current ? [state.current] : [])] : [];
  const setsSaved = allEntries.reduce((sum, e) => sum + e.completed_sets, 0);
  const volumeCautions = catalog && plan ? getVolumeCautions(catalog.exercises, plan) : [];
  const currentCatalogExercise = catalog && state?.current ? catalog.exercises.find(exercise => exercise.id === state.current?.id) : undefined;
  const bodyRegionNames = catalog ? [...new Set(
    catalog.muscle_groups
      .filter(group => selectedGroups.includes(group.id))
      .flatMap(group => group.body_regions)
      .map(regionId => catalog.body_regions.find(region => region.id === regionId)?.name)
      .filter((name): name is string => Boolean(name))
  )] : [];

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
    <View style={s.header}><View><Text style={s.brand}>spotter<Text style={{ color: colors.blue }}>.</Text></Text><Text style={s.tagline}>A little guidance. Every set.</Text></View>{profile && !watchOnly && !state ? <ActionButton title="Sign out" secondary onPress={() => void signOutProfile()} /> : watchOnly || (profile && state) ? <View style={s.status}><View style={[s.dot, { backgroundColor: state && session.connection === 'Live' ? colors.good : colors.secondary }]} /><Text style={s.small}>{state ? session.connection : 'Watch controls'}</Text></View> : <Text style={s.small}>YOUR NEXT SET STARTS HERE</Text>}</View>
    {(error || catalogError || planError || profileError) && <View style={s.error}><Text selectable style={{ color: colors.danger }}>{error || catalogError || planError || profileError}</Text>{catalogError && <ActionButton title="Reconnect" secondary onPress={loadCatalog} />}</View>}

    {!watchOnly && profile && <View accessibilityLiveRegion="polite" style={s.welcome}><Text style={s.welcomeTitle}>Welcome, {profile.name.trim().split(/\s+/)[0] || 'friend'}.</Text><Text style={s.body}>{state ? 'Let’s keep your workout moving.' : 'Let’s make today’s workout yours.'}</Text></View>}
    {!watchOnly && (profile || Platform.OS !== 'web') && !state && (editingTrainer ? <TrainerPersonaEditor value={trainer} onSave={next => void saveTrainer(next)} onCancel={() => setEditingTrainer(false)} saving={savingTrainer} error={trainerError} signedIn={!!profileAuth} /> : <View style={s.mat}><TrainerAvatar trainer={trainer} size={90} /><View style={{ flex: 1 }}><Text style={s.heading}>{trainer.name}, your trainer</Text><Paragraph>{trainer.motivation ? `Your why: “${trainer.motivation}”` : 'Give your trainer a personality and a reason to remind you why you show up.'}</Paragraph></View><ActionButton title="Customize trainer" secondary onPress={() => { setTrainerError(null); setEditingTrainer(true); }} /></View>)}
    {!watchOnly && state && (editingTrainer ? <View style={{ gap: 12 }}><Paragraph>Changes apply to your next workout. This session keeps the trainer you started with.</Paragraph><TrainerPersonaEditor value={trainer} onSave={next => void saveTrainer(next)} onCancel={() => setEditingTrainer(false)} saving={savingTrainer} error={trainerError} signedIn={!!profileAuth} /></View> : <ActionButton title="Customize trainer for next workout" secondary onPress={() => { setTrainerError(null); setEditingTrainer(true); }} />)}
    {!watchOnly && state && !ended && state.preferences.trainer.remind && !!state.preferences.trainer.motivation && dismissedReminder !== state.session_id && !reminderHandled(state.session_id) && <View style={s.mat}><TrainerAvatar trainer={state.preferences.trainer} size={90} /><View style={{ flex: 1 }}><Text style={s.heading}>Good to see you.</Text><Paragraph>{motivationGreeting(state.preferences.name)}</Paragraph><ActionButton title="Skip reminder" secondary onPress={() => { markReminderHandled(state.session_id); setDismissedReminder(state.session_id); }} /></View></View>}
    {!watchOnly && Platform.OS === 'web' && !profile ? <LandingScreen checking={checkingProfile} signingIn={signingIn} googleEnabled={googleEnabled} onToken={idToken => void signInWithGoogle(idToken)} /> : !state && watchOnly ? <View style={s.panel}><Text style={s.title}>Join your workout</Text><Paragraph>This browser panel stands in for watch controls. Enter session access from the trainer screen.</Paragraph><TextInput accessibilityLabel="Session ID" placeholder="Session ID" value={joinId} onChangeText={setJoinId} style={s.input} /><TextInput accessibilityLabel="Session token" placeholder="Session token" value={joinToken} secureTextEntry onChangeText={setJoinToken} style={s.input} />{joinError && <Text style={{ color: colors.danger }}>{joinError}</Text>}<ActionButton title="Join session" onPress={() => { setJoinError(null); session.join({ session_id: joinId.trim(), access_token: joinToken.trim() }).catch(e => setJoinError(e.message)); }} /></View> : !state ? plan && catalog ? <View style={s.panel}>
      <PlanEditor
        catalog={catalog}
        selectedGroups={selectedGroups}
        plan={plan}
        onChange={updatePlan}
        volumeCautions={volumeCautions}
        volumeAcknowledged={volumeAcknowledged}
        onVolumeAcknowledgementChange={setVolumeAcknowledged}
      />
      <View style={s.optionRow}>
        <ActionButton title="Back to muscle selection" secondary onPress={() => { setPlan(null); setVolumeAcknowledged(false); }} />
        <ActionButton title={demo ? 'Demo rest: 5s' : 'Normal rest: 60s'} secondary onPress={() => setDemo(!demo)} />
      </View>
      <ActionButton title={pending ? 'Starting…' : 'Approve and start workout'} disabled={pending || editingTrainer || savingTrainer || plan.length === 0 || (volumeCautions.length > 0 && !volumeAcknowledged)} onPress={() => void (async () => {
        try {
          await persistProfile(plan);
          await session.start({ name: name.trim() || 'You', mode, coaching, trainer, excluded_exercise_ids: [] }, demo, selectedGroups, plan);
        } catch (failure) { setProfileError(failure instanceof Error ? failure.message : 'Could not save and start your workout. Try again.'); }
      })()} />
      <Paragraph>{trainer.name}’s voice is available after approval. The machine order becomes fixed when the workout starts. You can confirm weight changes between sets.</Paragraph>
    </View> : <View style={[s.columns, wide && { flexDirection: 'row' }]}>
      <View style={[s.intro, wide && { flex: 1 }]}><Text style={s.hero}>Choose what{'\n'}to train today.</Text><Paragraph>Select muscle groups on the body map. Spotter recommends up to eight configured machines, then you approve every setting.</Paragraph><View style={s.mat}><Text style={s.matSymbol}>m</Text><View style={{ flex: 1 }}><Text style={s.heading}>{trainer.name} is in your corner.</Text><Paragraph>Guidance is source-backed demo content with professional review still pending.</Paragraph></View></View><Text style={s.small}>North gym is fictional. Confirm the actual machine placard and ask gym staff when uncertain.</Text></View>
      <View style={[s.panel, wide && { width: 560 }]}>
        <Text style={s.title}>Today’s muscles</Text>
        <Text style={s.label}>What should {trainer.name} call you?</Text><TextInput accessibilityLabel="Your name" placeholder="Your name" maxLength={60} value={name} onChangeText={setName} style={s.input} />
        {!catalog ? <ActivityIndicator color={colors.blue} /> : <MuscleMap groups={catalog.muscle_groups} selected={selectedGroups} onToggle={toggleGroup} />}
        {!!bodyRegionNames.length && <View style={s.regionSummary}><Text style={s.regionSummaryTitle}>Highlighted body-map regions</Text><Text style={s.small}>{bodyRegionNames.join(' · ')}</Text></View>}
        <Text style={s.label}>When equipment is taken</Text><View style={s.optionRow}><ActionButton title="Keep my exercises" secondary={mode !== 'strict'} onPress={() => setMode('strict')} /><ActionButton title="Allow alternatives" secondary={mode !== 'alternatives'} onPress={() => setMode('alternatives')} /></View>
        <Text style={s.label}>Coaching style</Text><View style={s.optionRow}>{(['quiet', 'standard', 'teach'] as const).map(value => <ActionButton key={value} title={{ quiet: 'Quiet', standard: 'Standard', teach: 'Teach me' }[value]} secondary={coaching !== value} onPress={() => setCoaching(value)} />)}</View>
        <ActionButton title={planning ? 'Building plan…' : 'Build my workout'} disabled={!catalog || !selectedGroups.length || planning} onPress={() => void previewPlan()} />
      </View>
    </View> : ended ? <View style={s.panel}><TrainerAvatar trainer={state.preferences.trainer} celebrating={setsSaved > 0} /><Text style={s.hero}>{phaseLabels[state.phase]}</Text><Paragraph>{state.preferences.name}, every completed set counts.</Paragraph><View style={s.metrics}><View><Text style={s.metric}>{setsSaved}</Text><Paragraph>sets saved</Paragraph></View><View><Text style={s.metric}>{state.completed.length}</Text><Paragraph>exercises completed</Paragraph></View></View>{allEntries.filter(e => e.completed_sets > 0).map(e => <View style={s.routine} key={e.instance_id}><View style={{ flex: 1 }}><Text style={s.heading}>{e.name}</Text><Paragraph>{e.completed_sets} of {e.sets} sets{e.weight_lb !== null ? ` · ${e.weight_lb} lb` : ''}{e.id !== e.original_exercise_id ? ' · Substituted' : ''}</Paragraph><SetHistory records={e.set_records} /></View></View>)}{setsSaved === 0 && <Paragraph>No sets were recorded today.</Paragraph>}<Paragraph>{state.skipped.length} exercise(s) skipped. Unfinished work is not counted as complete.</Paragraph><ActionButton title="Start a new session" onPress={() => session.reset().catch(e => setJoinError(e.message))} />{session.credentials && <VoicePanel credentials={session.credentials} snapshot={state} act={session.act} />}</View> : <View style={[s.columns, wide && !watchOnly && { flexDirection: 'row' }]}>
      <View style={[s.panel, { flex: 1 }]}><Text style={s.label}>{phaseLabels[state.phase]}</Text><Text style={s.title}>{state.current?.name || 'Your remaining exercises'}</Text><Paragraph>{state.current?.location || 'Try the deferred equipment again when you’re ready.'}</Paragraph>{state.current && <View style={s.metrics}><View><Text style={s.metric}>{state.phase === 'resting' ? `${session.restSeconds}s` : `${state.set_index}/${state.current.sets}`}</Text><Paragraph>{state.phase === 'resting' ? 'rest remaining' : 'current set'}</Paragraph></View><View><Text style={s.metric}>{state.current.reps}</Text><Paragraph>planned reps</Paragraph></View>{state.current.weight_lb !== null && <View><Text style={s.metric}>{state.current.weight_lb}</Text><Paragraph>planned lb</Paragraph></View>}</View>}
        {catalog && currentCatalogExercise && <ExerciseCatalogDetails catalog={catalog} exercise={currentCatalogExercise} />}
        {state.current && <SetTracking key={`${state.current.instance_id}:${state.set_index}`} snapshot={state} elapsedSeconds={session.setSeconds} pending={pending} onWeightChange={payload => session.act('weight_updated', watchOnly ? 'watch' : 'web', undefined, payload)} />}
        <View style={s.cue}><Text style={s.heading}>{state.preferences.trainer.name}’s next step</Text><Paragraph>{state.last_decision}</Paragraph></View>
        {state.demo_mode && <Text style={s.small}>Demo mode · Rests shortened to 5 seconds</Text>}
        {watchOnly ? controls : <>{session.credentials && <VoicePanel credentials={session.credentials} snapshot={state} act={session.act} />}<Text style={s.label}>Phone fallback controls</Text>{controls}</>}
      </View>
      {!watchOnly && <View style={[s.sidebar, wide && { width: 310 }]}><View style={s.watch}><Text style={[s.small, { color: '#B8C8DE' }]}>Watch controls · Browser simulation</Text><Text style={s.watchTitle}>{state.current?.name || 'Remaining work'}</Text><Text style={{ color: '#DDE7F5', marginBottom: 20 }}>{pending ? 'Confirming…' : session.connection === 'Live' ? 'Live session' : `${session.connection} · actions require server confirmation`}</Text>{state.phase === 'awaiting_equipment' && <><ActionButton title="Got it" disabled={pending} onPress={() => act('equipment_claimed', 'watch')} /><ActionButton title="Taken" secondary disabled={pending} onPress={() => act('equipment_taken', 'watch')} /></>}{state.phase === 'exercising' && <ActionButton title="Set done" disabled={pending} onPress={() => act('set_completed', 'watch')} />}{state.phase === 'resting' && <Text style={s.watchCountdown}>{session.restSeconds}s</Text>}<Link href="/watch" target="_blank" style={{ color: '#DAE5FF', marginTop: 16 }}>Open separate watch panel</Link></View><View style={s.panel}><Text style={s.heading}>Still to come</Text>{[...state.queue, ...state.deferred].map(e => <View key={e.instance_id} style={s.queue}><Text style={s.body}>{e.name}</Text><Text style={s.small}>{state.deferred.some(d => d.instance_id === e.instance_id) ? 'Deferred · reported taken' : `${e.sets} sets`}</Text></View>)}{!state.queue.length && !state.deferred.length && <Paragraph>Your last exercise is in progress.</Paragraph>}<ActionButton title={showAccess ? 'Hide session access' : 'Pair watch controls'} secondary onPress={() => setShowAccess(!showAccess)} />{showAccess && session.credentials && <><Paragraph>Enter these in the native watch app or your local browser watch panel. Treat the session token as private.</Paragraph><Text selectable style={s.small}>Session ID: {session.credentials.session_id}</Text><Text selectable style={s.small}>Session token: {session.credentials.access_token}</Text></>}</View></View>}
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
  planCard: { padding: 18, gap: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: '#F8FAFD' },
  caution: { padding: 18, gap: 10, borderWidth: 1, borderColor: '#D88630', borderRadius: 16, backgroundColor: '#FFF6E8' },
  cautionTitle: { color: '#74400C', fontSize: 18, fontWeight: '700' },
  acknowledgement: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: '#D88630', borderRadius: 12, backgroundColor: '#FFFFFF' },
  acknowledgementChecked: { borderColor: colors.good, backgroundColor: '#EDF8F4' },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#A96722', borderRadius: 5 },
  checkboxChecked: { borderColor: colors.good, backgroundColor: colors.good },
  acknowledgementText: { flex: 1, color: colors.ink, fontWeight: '600' },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  settingsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  stepper: { gap: 6 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.paleBlue, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.blue, fontSize: 22, fontWeight: '700' },
  stepValue: { minWidth: 28, textAlign: 'center', color: colors.ink, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  regionSummary: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: colors.paleBlue },
  regionSummaryTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  welcome: { gap: 6, paddingTop: 12 }, welcomeTitle: { fontSize: 30, fontWeight: '700', letterSpacing: -1, color: colors.ink },
  mat: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center', padding: 20, backgroundColor: colors.paleBlue, borderRadius: 18 }, matSymbol: { fontSize: 40, color: colors.blue, fontWeight: '800', paddingHorizontal: 10 },
  metrics: { flexDirection: 'row', gap: 50, paddingVertical: 20 }, metric: { fontSize: 54, fontWeight: '600', letterSpacing: -2, color: colors.ink, fontVariant: ['tabular-nums'] },
  cue: { padding: 20, gap: 10, backgroundColor: colors.paleBlue, borderRadius: 14 }, controls: { gap: 10 }, sidebar: { gap: 20 }, watch: { padding: 25, gap: 12, backgroundColor: '#203956', borderRadius: 32, borderWidth: 5, borderColor: '#D0DCE9' }, watchTitle: { fontSize: 24, fontWeight: '600', color: '#FFFFFF' }, watchCountdown: { color: '#FFFFFF', fontSize: 48, fontVariant: ['tabular-nums'] },
  queue: { paddingVertical: 10, gap: 3, borderBottomColor: colors.border, borderBottomWidth: 1 }, error: { padding: 18, backgroundColor: '#FBECEF', borderRadius: 12, gap: 12 }, footer: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingBottom: 12 },
});
