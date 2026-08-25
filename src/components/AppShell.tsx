import type { PropsWithChildren } from 'react';
import { useState } from 'react';
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
  const [logoutState, setLogoutState] = useState<'idle' | 'submitting' | 'error'>('idle');

  async function handleSignOut() {
    if (logoutState === 'submitting') {
      return;
    }

    setLogoutState('submitting');

    try {
      await signOut();
      queryClient.clear();
      await navigate({ to: '/login' });
      setLogoutState('idle');
    } catch {
      setLogoutState('error');
    }
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
        {logoutState === 'error' ? (
          <p className="logout-error">Nao foi possivel sair agora. Tente novamente.</p>
        ) : null}
        <button
          className="sign-out-button"
          disabled={logoutState === 'submitting'}
          type="button"
          onClick={handleSignOut}
        >
          <LogOut size={18} aria-hidden="true" />
          <span>{logoutState === 'submitting' ? 'Saindo...' : 'Sair'}</span>
        </button>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
