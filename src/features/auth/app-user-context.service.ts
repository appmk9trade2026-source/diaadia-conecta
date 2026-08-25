import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AppRole, AppUserContext } from './auth.types';
import { FriendlyAuthError } from './auth.types';

type ProfileRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
};

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

type MembershipRow = {
  id: string;
  role: AppRole;
  active: boolean;
  tenants: TenantRow | TenantRow[] | null;
};

export type AppContextClient = Pick<SupabaseClient, 'from'>;

function normalizeTenant(tenant: MembershipRow['tenants']): TenantRow | null {
  if (Array.isArray(tenant)) {
    return tenant[0] ?? null;
  }

  return tenant;
}

export function resolveAppUserContext(
  user: User,
  profile: ProfileRow | null,
  memberships: MembershipRow[],
): AppUserContext {
  if (!profile) {
    throw new FriendlyAuthError('profile_missing', 'Acesso nao configurado para este usuario.');
  }

  if (!profile.active) {
    throw new FriendlyAuthError('profile_inactive', 'Usuario inativo. Fale com o administrador.');
  }

  if (memberships.length === 0) {
    throw new FriendlyAuthError('membership_missing', 'Acesso nao configurado para este usuario.');
  }

  const membershipWithInactiveTenant = memberships.find((membership) => {
    const tenant = normalizeTenant(membership.tenants);
    return membership.active && tenant && !tenant.active;
  });

  if (membershipWithInactiveTenant) {
    throw new FriendlyAuthError('tenant_inactive', 'Empresa inativa. Fale com o administrador.');
  }

  const activeMemberships = memberships.filter((membership) => {
    const tenant = normalizeTenant(membership.tenants);
    return membership.active && tenant?.active;
  });

  if (activeMemberships.length === 0) {
    throw new FriendlyAuthError('membership_inactive', 'Acesso inativo. Fale com o administrador.');
  }

  if (activeMemberships.length > 1) {
    throw new FriendlyAuthError(
      'multiple_memberships',
      'Mais de uma empresa ativa encontrada. A selecao de empresa sera habilitada em breve.',
    );
  }

  const membership = activeMemberships[0];
  const tenant = normalizeTenant(membership.tenants);

  if (!tenant) {
    throw new FriendlyAuthError('tenant_inactive', 'Empresa nao encontrada.');
  }

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    profile: {
      name: profile.name,
      phone: profile.phone,
      active: profile.active
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      active: tenant.active
    },
    membership: {
      id: membership.id,
      role: membership.role,
      active: membership.active
    }
  };
}

export async function loadAppUserContext(
  user: User,
  client?: AppContextClient,
): Promise<AppUserContext> {
  const activeClient = client ?? (await import('../../lib/supabase')).supabase;
  const { data: profile, error: profileError } = await activeClient
    .from('profiles')
    .select('id, name, email, phone, active')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new FriendlyAuthError('unknown', 'Nao foi possivel carregar o perfil.');
  }

  const { data: memberships, error: membershipsError } = await activeClient
    .from('tenant_memberships')
    .select('id, role, active, tenants(id, name, slug, active)')
    .eq('user_id', user.id);

  if (membershipsError) {
    throw new FriendlyAuthError('unknown', 'Nao foi possivel carregar o acesso.');
  }

  return resolveAppUserContext(
    user,
    profile as ProfileRow | null,
    (memberships ?? []) as MembershipRow[],
  );
}
