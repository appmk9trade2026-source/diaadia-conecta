import { useAuth } from '../auth/AuthProvider';
import { getRoleLabel } from '../auth/roles';

export function AuthenticatedHome() {
  const { appUserContext } = useAuth();

  if (!appUserContext) {
    return null;
  }

  const firstName = appUserContext.profile.name.split(' ')[0] ?? appUserContext.profile.name;

  return (
    <section className="authenticated-home" aria-label="Area autenticada">
      <header>
        <p>DIA A DIA CONECTA</p>
        <h1>Ola, {firstName}</h1>
        <span>Teste Mestres do Lovable</span>
      </header>

      <div className="status-card">
        <span className="status-badge">Acesso ativo</span>
      </div>

      <dl className="identity-list">
        <div>
          <dt>Empresa</dt>
          <dd>{appUserContext.tenant.name}</dd>
        </div>
        <div>
          <dt>Usuario</dt>
          <dd>{appUserContext.profile.name}</dd>
        </div>
        <div>
          <dt>Perfil</dt>
          <dd>{getRoleLabel(appUserContext.membership.role)}</dd>
        </div>
      </dl>
    </section>
  );
}