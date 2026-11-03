import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from './supabase';

/** Returns the stored session, or signs the user in anonymously if there is none. */
async function getOrCreateSession(): Promise<Session> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error || !signIn.session) throw new Error(error?.message ?? 'No session returned');
  return signIn.session;
}

export function useAnonymousSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      getOrCreateSession()
        .then(setSession)
        .catch((e: Error) => setError(e.message)),
    [],
  );

  useEffect(() => {
    load();
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, [load]);

  const retry = useCallback(() => {
    setError(null);
    load();
  }, [load]);

  return { session, error, retry };
}
