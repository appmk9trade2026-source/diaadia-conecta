import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { FriendlyAuthError } from './auth.types';

function mapSupabaseAuthError(message: string | undefined): FriendlyAuthError {
  const normalizedMessage = message?.toLowerCase() ?? '';

  if (
    normalizedMessage.includes('invalid login credentials') ||
    normalizedMessage.includes('invalid credentials')
  ) {
    return new FriendlyAuthError('invalid_credentials', 'E-mail ou senha invalidos.');
  }

  if (normalizedMessage.includes('fetch') || normalizedMessage.includes('network')) {
    return new FriendlyAuthError('network_error', 'Nao foi possivel conectar. Tente novamente.');
  }

  return new FriendlyAuthError('unknown', 'Nao foi possivel concluir a autenticacao.');
}

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw mapSupabaseAuthError(error.message);
  }

  if (!data.session) {
    throw new FriendlyAuthError('session_missing', 'Sessao nao iniciada.');
  }

  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw mapSupabaseAuthError(error.message);
  }
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw mapSupabaseAuthError(error.message);
  }

  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw mapSupabaseAuthError(error.message);
  }

  return data.user;
}
