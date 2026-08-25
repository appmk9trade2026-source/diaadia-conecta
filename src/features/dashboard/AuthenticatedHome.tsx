import { useAuth } from '../auth/AuthProvider';
import { getRoleLabel } from '../auth/roles';
import { JourneyCard } from '../journey/JourneyCard';

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
        <span>Bem-vindo ao DIA A DIA CONECTA.</span>
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

      <JourneyCard
        role={appUserContext.membership.role}
        tenantId={appUserContext.tenant.id}
        userId={appUserContext.userId}
      />
    </section>
  );
}
