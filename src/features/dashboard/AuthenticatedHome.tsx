import { useAuth } from '../auth/AuthProvider';
import { getRoleLabel } from '../auth/roles';

export function AuthenticatedHome() {
  const { appUserContext } = useAuth();

  if (!appUserContext) {
    return null;
  }

  return (
    <section className="authenticated-home" aria-label="Area autenticada">
      <header>
        <p>DIA A DIA CONECTA</p>
        <h1>Area autenticada</h1>
      </header>

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
