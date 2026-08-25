import type { Session, User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'supervisor' | 'consultant';

export type AppUserContext = {
  userId: string;
  email: string | null;
  profile: {
    name: string;
    phone: string | null;
    active: boolean;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    active: boolean;
  };
  membership: {
    id: string;
    role: AppRole;
    active: boolean;
  };
};

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'network_error'
  | 'session_missing'
  | 'profile_missing'
  | 'profile_inactive'
  | 'membership_missing'
  | 'membership_inactive'
  | 'tenant_inactive'
  | 'multiple_memberships'
  | 'unknown';

export class FriendlyAuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'FriendlyAuthError';
    this.code = code;
  }
}

export type AuthState = {
  session: Session | null;
  user: User | null;
  appUserContext: AppUserContext | null;
  loading: boolean;
  error: FriendlyAuthError | null;
};
