import { ClipboardCheck, LockKeyhole } from 'lucide-react';
import { useJourney } from '../journey/useJourney';
import { canRegisterVisit } from './visit.service';
import { RecentVisits } from './RecentVisits';
import { useVisits } from './useVisits';
import { VisitForm } from './VisitForm';

type VisitsPanelProps = {
  role: string;
  tenantId: string;
  userId: string;
};

export function VisitsPanel({ role, tenantId, userId }: VisitsPanelProps) {
  const isConsultant = role === 'consultant';
  const journeyState = useJourney({ tenantId, userId, enabled: isConsultant });
  const activeJourneyId = journeyState.journey?.status === 'aberta' ? journeyState.journey.id : null;
  const visitsState = useVisits({ tenantId, userId, activeJourneyId, enabled: isConsultant });
  const registrationEnabled = canRegisterVisit(role, activeJourneyId);

  if (!isConsultant) {
    return (
      <section className="visit-access-card" aria-labelledby="visit-access-title">
        <span aria-hidden="true">
          <LockKeyhole size={20} />
        </span>
        <div>
          <p>Visitas</p>
          <h2 id="visit-access-title">Registro de campo</h2>
          <span>Consultores registram somente as próprias visitas durante uma jornada ativa.</span>
        </div>
      </section>
    );
  }

  return (
    <section className="visits-panel" aria-labelledby="visits-title">
      <header className="visits-panel__header">
        <span aria-hidden="true">
          <ClipboardCheck size={22} />
        </span>
        <div>
          <p>Visitas</p>
          <h2 id="visits-title">Atendimento em campo</h2>
        </div>
      </header>

      {journeyState.loading ? <p className="visits-panel__notice">Verificando a jornada ativa...</p> : null}
      {!journeyState.loading && journeyState.error ? (
        <p className="journey-error" role="alert">Não foi possível verificar sua jornada para liberar visitas.</p>
      ) : null}
      {!journeyState.loading && !journeyState.error && !registrationEnabled ? (
        <p className="visits-panel__notice">Para registrar uma visita, inicie sua jornada primeiro.</p>
      ) : null}

      {registrationEnabled ? (
        <VisitForm
          actionError={visitsState.actionError}
          actionState={visitsState.actionState}
          busy={visitsState.busy}
          onSubmit={visitsState.submitVisit}
        />
      ) : null}

      {visitsState.successMessage ? (
        <p className="visit-success" role="status">{visitsState.successMessage}</p>
      ) : null}

      <RecentVisits error={visitsState.error} loading={visitsState.loading} visits={visitsState.visits} />
    </section>
  );
}
