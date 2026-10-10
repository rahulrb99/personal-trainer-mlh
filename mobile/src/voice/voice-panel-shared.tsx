import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { z } from 'zod';
import type { useConversation as useWebConversation } from '@elevenlabs/react';
import { ActionButton } from '@/components/action-button';
import { api, ApiError } from '@/api/client';
import { actionSchema } from '@/api/schema';
import type { VoiceProps } from './types';
import { colors } from '@/theme';

type ConversationHook = typeof useWebConversation;

export function VoicePanelShared(props: VoiceProps & { useConversation: ConversationHook }) {
  const { useConversation, ...voiceProps } = props;
  return <VoiceControls {...voiceProps} useConversation={useConversation} />;
}
function VoiceControls({ credentials, snapshot, act, useConversation }: VoiceProps & { useConversation: ConversationHook }) {
  const [error, setError] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState('');
  const [starting, setStarting] = useState(false);
  const toolVersion = useRef(0);
  const announcedVersion = useRef(snapshot.version);
  const processingTool = useRef(false);
  const wasConnected = useRef(false);
  const latest = useRef(snapshot);
  useEffect(() => { latest.current = snapshot; }, [snapshot]);
  const conversation = useConversation({
    onError: () => setError('Mat disconnected. Check your microphone permission, agent configuration and connection.'),
    onMessage: (message) => { if (message.source === 'ai') setLastReply(message.message); },
    clientTools: {
      get_session_state: async () => JSON.stringify(await api.snapshot(credentials)),
      get_exercise_guidance: async (value: unknown) => {
        const { exercise_id } = z.object({ exercise_id: z.string().min(1) }).parse(value);
        const catalog = await api.catalog();
        const exercise = catalog.exercises.find(e => e.id === exercise_id);
        return JSON.stringify(exercise || { error: 'Unknown exercise. Use the current session exercise ID.' });
      },
      submit_workout_action: async (value: unknown) => {
        processingTool.current = true;
        try {
          const args = z.object({ action: actionSchema, exercise_instance_id: z.string().nullable().default(null), set_index: z.number().int().positive().nullable().default(null) }).parse(value);
          const fresh = latest.current;
          const sessionAction = args.action === 'end_session' || args.action === 'retry_deferred';
          if (sessionAction && (args.exercise_instance_id !== null || args.set_index !== null)) return JSON.stringify({ success: false, error: 'Session-level actions must omit exercise targets.' });
          if (!sessionAction && (!fresh.current || args.exercise_instance_id !== fresh.current.instance_id || args.set_index !== fresh.set_index)) return JSON.stringify({ success: false, error: 'Missing or stale target. Call get_session_state and ask user again.' });
          const result = await act(args.action, 'voice', args.exercise_instance_id ? { exercise_instance_id: args.exercise_instance_id, set_index: args.set_index } : undefined);
          toolVersion.current = result.version;
          return JSON.stringify({ success: true, snapshot: result });
        } catch (failure) { return JSON.stringify({ success: false, error: failure instanceof Error ? failure.message : 'Action rejected' }); }
        finally { processingTool.current = false; }
      },
    },
  });
  const ended = snapshot.phase === 'completed' || snapshot.phase === 'ended';
  useEffect(() => {
    if (ended && conversation.status === 'connected') { conversation.endSession(); return; }
    if (conversation.status !== 'connected') {
      wasConnected.current = false;
      return;
    }
    if (!wasConnected.current) {
      // A new voice connection gets current context, never a replay of actions
      // that happened while it was disconnected.
      wasConnected.current = true;
      announcedVersion.current = snapshot.version;
      conversation.sendContextualUpdate(`Authoritative workout snapshot: ${JSON.stringify(snapshot)}`);
      return;
    }
    if (snapshot.version <= announcedVersion.current) return;
    announcedVersion.current = snapshot.version;
    conversation.sendContextualUpdate(`Authoritative workout snapshot: ${JSON.stringify(snapshot)}`);
    if (!processingTool.current && snapshot.version !== toolVersion.current) {
      conversation.sendUserMessage(`App update after an accepted event: ${snapshot.last_decision}. Explain this next step briefly according to coaching preference. Do not submit another workout action for this message.`);
    }
  }, [snapshot, ended, conversation]);
  async function connect() {
    setError(null); setStarting(true);
    try {
      const { conversation_token } = await api.voiceToken(credentials);
      announcedVersion.current = snapshot.version;
      await conversation.startSession({ conversationToken: conversation_token, connectionType: 'webrtc', dynamicVariables: { workout_context: JSON.stringify(snapshot), coaching_style: snapshot.preferences.coaching, user_name: snapshot.preferences.name } });
    } catch (failure) { setError(failure instanceof ApiError && failure.status === 503 ? 'Mat’s voice is not configured for this prototype yet. Workout controls still work.' : failure instanceof Error ? failure.message : 'Unable to connect Mat'); }
    finally { setStarting(false); }
  }
  return <View style={{ gap: 12, paddingVertical: 12 }}>
    <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '600' }}>Mat · {conversation.status === 'connected' ? conversation.isSpeaking ? 'Speaking' : conversation.isMuted ? 'Muted' : 'Listening' : 'Voice not connected'}</Text>
    {conversation.status === 'connected' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><ActionButton title={conversation.isMuted ? 'Talk to Mat' : 'Mute listening'} secondary onPress={() => conversation.setMuted(!conversation.isMuted)} /><ActionButton title="Disconnect voice" secondary onPress={() => conversation.endSession()} /></View> : <ActionButton title={starting ? 'Connecting Mat…' : 'Connect Mat’s voice'} disabled={ended || starting} onPress={() => void connect()} />}
    <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>Say “set done,” “repeat,” or ask about the current exercise. Connecting enables your microphone for this session.</Text>
    {lastReply !== '' && <Text style={{ color: colors.secondary, lineHeight: 22 }}>{lastReply}</Text>}
    {error && <Text selectable style={{ color: colors.danger }}>{error}</Text>}
  </View>;
}
