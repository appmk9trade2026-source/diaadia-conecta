import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { FriendlyAuthError } from './auth.types';
import { resolveAppUserContext } from './app-user-context.service';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com'
} as User;

const activeProfile = {
  id: user.id,
  name: 'Usuario Teste',
  email: 'user@example.com',
  phone: null,
  active: true
};

const activeTenant = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Tenant Teste',
  slug: 'tenant-teste',
  active: true
};

const activeMembership = {
  id: '33333333-3333-4333-8333-333333333333',
  role: 'admin' as const,
  active: true,
  tenants: activeTenant
};

function expectAuthError(action: () => unknown, code: FriendlyAuthError['code']) {
  expect(action).toThrow(FriendlyAuthError);

  try {
    action();
  } catch (error) {
    expect((error as FriendlyAuthError).code).toBe(code);
  }
}

describe('resolveAppUserContext', () => {
  it('rejects a user without session context', () => {
    expectAuthError(() => resolveAppUserContext(user, null, []), 'profile_missing');
  });

  it('returns a valid app context', () => {
    const context = resolveAppUserContext(user, activeProfile, [activeMembership]);

    expect(context.userId).toBe(user.id);
    expect(context.tenant.slug).toBe('tenant-teste');
    expect(context.membership.role).toBe('admin');
  });

  it('rejects inactive profile', () => {
    expectAuthError(
      () => resolveAppUserContext(user, { ...activeProfile, active: false }, [activeMembership]),
      'profile_inactive',
    );
  });

  it('rejects inactive membership', () => {
    expectAuthError(
      () => resolveAppUserContext(user, activeProfile, [{ ...activeMembership, active: false }]),
      'membership_inactive',
    );
  });

  it('rejects inactive tenant', () => {
    expectAuthError(
      () =>
        resolveAppUserContext(user, activeProfile, [
          { ...activeMembership, tenants: { ...activeTenant, active: false } }
        ]),
      'tenant_inactive',
    );
  });

  it('rejects users without memberships', () => {
    expectAuthError(() => resolveAppUserContext(user, activeProfile, []), 'membership_missing');
  });

  it('rejects multiple active memberships', () => {
    expectAuthError(
      () =>
        resolveAppUserContext(user, activeProfile, [
          activeMembership,
          {
            ...activeMembership,
            id: '44444444-4444-4444-8444-444444444444',
            tenants: { ...activeTenant, id: '55555555-5555-4555-8555-555555555555', slug: 'outro' }
          }
        ]),
      'multiple_memberships',
    );
  });

  it('uses the valid membership when another active membership has an inactive tenant', () => {
    const context = resolveAppUserContext(user, activeProfile, [
      {
        ...activeMembership,
        id: '44444444-4444-4444-8444-444444444444',
        tenants: { ...activeTenant, id: '55555555-5555-4555-8555-555555555555', active: false }
      },
      activeMembership
    ]);

    expect(context.tenant.slug).toBe('tenant-teste');
    expect(context.membership.id).toBe(activeMembership.id);
  });

  it('rejects two valid memberships as multiple memberships', () => {
    expectAuthError(
      () =>
        resolveAppUserContext(user, activeProfile, [
          activeMembership,
          {
            ...activeMembership,
            id: '66666666-6666-4666-8666-666666666666',
            tenants: { ...activeTenant, id: '77777777-7777-4777-8777-777777777777', slug: 'terceiro' }
          }
        ]),
      'multiple_memberships',
    );
  });
});
