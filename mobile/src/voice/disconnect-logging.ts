import { getLogger, LoggerNames } from 'livekit-client';

// LiveKit can report a closing socket as an error after an intentional hangup.
// Keep it in the developer console without promoting it to Expo's error overlay.
const closingConversations = new Map<string, number>();
let installed = false;

export function expectVoiceDisconnect(conversationId: string) {
  const now = Date.now();
  for (const [id, until] of closingConversations) {
    if (until <= now) closingConversations.delete(id);
  }
  if (!conversationId) return;
  closingConversations.set(conversationId, now + 10_000);
  if (installed) return;
  installed = true;
  const logger = getLogger(LoggerNames.Signal);
  const originalFactory = logger.methodFactory;
  logger.methodFactory = (method, level, name) => {
    const original = originalFactory(method, level, name);
    return (...args: unknown[]) => {
      const context = args[1] as { room?: unknown; error?: { name?: string; reasonName?: string } } | undefined;
      const room = context?.room;
      const expected = typeof room === 'string' && [...closingConversations].some(
        ([id, until]) => until > Date.now() && room.endsWith(`_${id}`),
      );
      if (method === 'error' && args[0] === 'error reading from signal stream' && expected
        && context?.error?.name === 'ConnectionError' && context.error.reasonName === 'WebSocket') {
        console.info(...args);
        return;
      }
      original(...args);
    };
  };
  logger.setLevel(logger.getLevel());
}
