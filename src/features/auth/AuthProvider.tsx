import { createContext, useContext, useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getCurrentUser, getSession } from './auth.service';
import { loadAppUserContext } from './app-user-context.service';
import type { AuthState } from './auth.types';
import { FriendlyAuthError } from './auth.types';

const AuthContext = createContext<AuthState | null>(null);

function normalizeError(error: unknown): FriendlyAuthError | null {
  if (!error) {
    return null;
  }

  if (error instanceof FriendlyAuthError) {
    return error;
  }

  return new FriendlyAuthError('unknown', 'Nao foi possivel carregar sua sessao.');
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: getSession,
    staleTime: 30_000
  });

  const userQuery = useQuery({
    queryKey: ['auth', 'user', sessionQuery.data?.user.id],
    queryFn: getCurrentUser,
    enabled: Boolean(sessionQuery.data),
    staleTime: 30_000
  });

  const appContextQuery = useQuery({
    queryKey: ['auth', 'app-user-context', userQuery.data?.id],
    queryFn: () => loadAppUserContext(userQuery.data!),
    enabled: Boolean(userQuery.data),
    retry: false,
    staleTime: 30_000
  });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: ['auth'] });
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      session: sessionQuery.data ?? null,
      user: userQuery.data ?? null,
      appUserContext: appContextQuery.data ?? null,
      loading:
        sessionQuery.isLoading ||
        userQuery.isLoading ||
        appContextQuery.isLoading ||
        sessionQuery.isFetching,
      error:
        normalizeError(sessionQuery.error) ??
        normalizeError(userQuery.error) ??
        normalizeError(appContextQuery.error)
    }),
    [
      appContextQuery.data,
      appContextQuery.error,
      appContextQuery.isLoading,
      sessionQuery.data,
      sessionQuery.error,
      sessionQuery.isFetching,
      sessionQuery.isLoading,
      userQuery.data,
      userQuery.error,
      userQuery.isLoading
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return value;
}
