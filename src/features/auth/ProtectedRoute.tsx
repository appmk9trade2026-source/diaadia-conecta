import { Navigate } from '@tanstack/react-router';
import type { PropsWithChildren } from 'react';
import { useAuth } from './AuthProvider';
import { AccessState } from './components/AccessState';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { session, appUserContext, loading, error } = useAuth();

  if (loading) {
    return <AccessState title="Carregando acesso" message="Validando sessao e contexto." />;
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  if (error || !appUserContext) {
    return (
      <AccessState
        title="Acesso nao configurado"
        message={error?.message ?? 'Seu usuario ainda nao possui uma empresa ativa configurada.'}
      />
    );
  }

  return <>{children}</>;
}
