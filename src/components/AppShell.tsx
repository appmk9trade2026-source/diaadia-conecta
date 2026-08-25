import type { PropsWithChildren } from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthProvider';
import { signOut } from '../features/auth/auth.service';
import { getRoleLabel } from '../features/auth/roles';

export function AppShell({ children }: PropsWithChildren) {
  const { appUserContext } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await signOut();
    queryClient.clear();
    await navigate({ to: '/login' });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegacao principal">
        <div className="brand">
          <span className="brand-mark">DC</span>
          <div>
            <strong>DIA A DIA</strong>
            <span>CONECTA</span>
          </div>
        </div>
        {appUserContext ? (
          <div className="session-summary">
            <span>Empresa</span>
            <strong>{appUserContext.tenant.name}</strong>
            <span>Usuario</span>
            <strong>{appUserContext.profile.name}</strong>
            <span>Perfil</span>
            <strong>{getRoleLabel(appUserContext.membership.role)}</strong>
          </div>
        ) : null}
        <button className="sign-out-button" type="button" onClick={handleSignOut}>
          <LogOut size={18} aria-hidden="true" />
          <span>Sair</span>
        </button>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
