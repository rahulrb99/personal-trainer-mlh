import { ActionButton } from '@/components/action-button';

export function GoogleSignInButton({ disabled, onUnavailable }: { disabled?: boolean; onToken: (idToken: string) => void; onUnavailable?: () => void }) {
  return <ActionButton title="Google sign-in is available on web" secondary disabled={disabled} onPress={() => onUnavailable?.()} />;
}
