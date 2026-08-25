import type { AppRole } from './auth.types';

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  consultant: 'Consultor'
};

const permissions = {
  viewAuthenticatedShell: ['admin', 'supervisor', 'consultant']
} as const satisfies Record<string, readonly AppRole[]>;

export type Permission = keyof typeof permissions;

export function hasRole(currentRole: AppRole | null | undefined, roles: AppRole[]): boolean {
  return Boolean(currentRole && roles.includes(currentRole));
}

export function can(currentRole: AppRole | null | undefined, permission: Permission): boolean {
  return Boolean(currentRole && permissions[permission].includes(currentRole));
}

export function getRoleLabel(role: AppRole): string {
  return roleLabels[role];
}
