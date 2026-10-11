import { useEffect, useRef, useState } from 'react';
import { ActionButton } from '@/components/action-button';
import { Text, View } from 'react-native';
import { colors } from '@/theme';

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; auto_select: boolean; ux_mode: string }) => void;
      renderButton: (parent: HTMLElement, options: { type: string; theme: string; size: string; text: string; shape: string; width: number }) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

let gisLoading: Promise<void> | null = null;

function loadGis() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google sign-in needs a browser.'));
  if (window.google?.accounts.id) return Promise.resolve();
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-spotter-gis="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google sign-in script failed to load.')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.spotterGis = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in script failed to load.'));
    document.head.appendChild(script);
  });
  return gisLoading;
}

export function GoogleSignInButton({ disabled, onToken }: { disabled?: boolean; onToken: (idToken: string) => void; onUnavailable?: () => void }) {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    loadGis().then(() => {
      if (!active || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: response => onTokenRef.current(response.credential),
        auto_select: false,
        ux_mode: 'popup',
      });
      if (buttonRef.current) window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard', theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', width: 260,
      });
      setReady(true);
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'Google sign-in is unavailable.');
    });
    return () => { active = false; };
  }, [clientId]);

  if (!clientId) return <ActionButton title="Sign in with Google" disabled onPress={() => undefined} />;
  return <View style={{ gap: 8 }}>
    {!ready && <ActionButton title={error ? 'Google sign-in unavailable' : 'Loading Google…'} disabled onPress={() => undefined} />}
    <div ref={buttonRef} inert={disabled || !ready} style={{ minHeight: ready ? 44 : 0, opacity: disabled ? 0.5 : 1 }} />
    {error && <Text accessibilityRole="alert" style={{ color: colors.danger, maxWidth: 280 }}>{error} Refresh to try again.</Text>}
  </View>;
}
