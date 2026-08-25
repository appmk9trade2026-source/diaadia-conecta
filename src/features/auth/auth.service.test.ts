import { describe, expect, it, vi } from 'vitest';
import { supabase } from '../../lib/supabase';
import { FriendlyAuthError } from './auth.types';
import { signInWithPassword, signOut } from './auth.service';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    }
  }
}));

describe('auth service', () => {
  it('maps invalid login errors to a friendly error', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' }
    } as never);

    await expect(signInWithPassword('bad@example.com', 'wrong')).rejects.toMatchObject({
      code: 'invalid_credentials'
    });
  });

  it('signs out through Supabase Auth', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null } as never);

    await expect(signOut()).resolves.toBeUndefined();
  });

  it('raises a friendly logout error', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
      error: { message: 'Network request failed' }
    } as never);

    await expect(signOut()).rejects.toBeInstanceOf(FriendlyAuthError);
  });
});
