import { ConversationProvider, useConversation } from '@elevenlabs/react-native';
import { VoicePanelShared } from './voice-panel-shared';
import type { VoiceProps } from './types';

export function VoicePanel(props: VoiceProps) {
  return <ConversationProvider><VoicePanelShared {...props} useConversation={useConversation} /></ConversationProvider>;
}
