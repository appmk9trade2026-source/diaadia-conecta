import { CheckCircle2, MapPin, Navigation, SquareCheckBig, Timer, WifiOff } from 'lucide-react';
import type { Journey } from './journey.types';
import { useJourney } from './useJourney';

type JourneyCardProps = {
  tenantId: string;
  userId: string;
  role: string;
};

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit'
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function getActionLabel(actionState: string, fallback: string) {
  if (actionState === 'locating') {
    return 'Obtendo sua localização...';
  }

  if (actionState === 'submitting') {
    return fallback === 'Iniciar jornada' ? 'Iniciando jornada...' : 'Encerrando jornada...';
  }

  return fallback;
}

function getActionHint(actionState: string) {
  if (actionState === 'locating') {
    return 'Obtendo sua localização...';
  }

  if (actionState === 'submitting') {
    return 'Enviando para confirmação segura.';
  }

  return null;
}

export function JourneyCard({ tenantId, userId, role }: JourneyCardProps) {
  const isConsultant = role === 'consultant';
  const journeyState = useJourney({ tenantId, userId, enabled: isConsultant });

  if (!isConsultant) {
    return (
      <section className="journey-card" aria-labelledby="journey-title">
        <div className="journey-card__header">
          <span className="journey-card__icon" aria-hidden="true">
            <Timer size={20} />
          </span>
          <div>
            <p>Minha jornada</p>
            <h2 id="journey-title">Jornada operacional</h2>
          </div>
        </div>
        <p className="journey-card__muted">
          Check-in e check-out ficam disponíveis para consultores de campo.
        </p>
      </section>
    );
  }

  if (journeyState.loading) {
    return (
      <section className="journey-card" aria-labelledby="journey-title">
        <div className="journey-card__header">
          <span className="journey-card__icon" aria-hidden="true">
            <Timer size={20} />
          </span>
          <div>
            <p>Minha jornada</p>
            <h2 id="journey-title">Carregando jornada</h2>
          </div>
        </div>
      </section>
    );
  }

  if (journeyState.error) {
    return (
      <section className="journey-card" aria-labelledby="journey-title">
        <div className="journey-card__header">
          <span className="journey-card__icon journey-card__icon--danger" aria-hidden="true">
            <WifiOff size={20} />
          </span>
          <div>
            <p>Minha jornada</p>
            <h2 id="journey-title">Não foi possível carregar</h2>
          </div>
        </div>
        <p className="journey-error" role="alert">
          {journeyState.error}
        </p>
      </section>
    );
  }

  return (
    <JourneyCardView
      actionError={journeyState.actionError}
      actionState={journeyState.actionState}
      busy={journeyState.busy}
      journey={journeyState.displayJourney}
      onFinish={() => void journeyState.finish(journeyState.journey?.id)}
      onStart={() => void journeyState.start()}
    />
  );
}

export type JourneyCardViewProps = {
  journey: Journey | null;
  actionState: string;
  actionError: string | null;
  busy: boolean;
  onStart: () => void;
  onFinish: () => void;
};

export function JourneyCardView({
  journey,
  actionState,
  actionError,
  busy,
  onFinish,
  onStart
}: JourneyCardViewProps) {
  const finishedJourney = journey?.status === 'finalizada' ? journey : null;
  const activeJourney = journey?.status === 'aberta' ? journey : null;
  const actionHint = getActionHint(actionState);

  return (
    <section className="journey-card" aria-labelledby="journey-title">
      <div className="journey-card__header">
        <span
          className={`journey-card__icon${activeJourney ? ' journey-card__icon--active' : ''}`}
          aria-hidden="true"
        >
          {activeJourney ? <MapPin size={20} /> : <Timer size={20} />}
        </span>
        <div>
          <p>Minha jornada</p>
          <h2 id="journey-title">
            {activeJourney
              ? 'Jornada em andamento'
              : finishedJourney
                ? 'Jornada encerrada'
                : 'Pronto para começar?'}
          </h2>
        </div>
      </div>

      {activeJourney ? (
        <div className="journey-card__body">
          <div className="journey-status journey-status--active" aria-live="polite">
            <CheckCircle2 size={18} />
            <span>Jornada em andamento</span>
          </div>

          <div className="journey-facts">
            <div>
              <span>Início</span>
              <strong>{formatTime(activeJourney.check_in_at)}</strong>
            </div>
            <div>
              <span>Data</span>
              <strong>{formatDate(activeJourney.check_in_at)}</strong>
            </div>
            <div>
              <span>Localização</span>
              <strong>{activeJourney.check_in_accuracy_meters ? 'Registrada' : 'Confirmada'}</strong>
            </div>
          </div>

          {activeJourney.check_in_accuracy_meters ? (
            <span className="journey-location">
              <SquareCheckBig size={18} />
              Localização registrada
            </span>
          ) : null}

          <button
            className="journey-secondary-danger-button"
            type="button"
            disabled={busy}
            onClick={onFinish}
          >
            {getActionLabel(actionState, 'Encerrar jornada')}
          </button>
        </div>
      ) : (
        <div className="journey-card__body">
          {finishedJourney ? (
            <div className="journey-facts journey-facts--finished">
              <div>
                <span>Início</span>
                <strong>{formatTime(finishedJourney.check_in_at)}</strong>
              </div>
              <div>
                <span>Fim</span>
                <strong>
                  {finishedJourney.check_out_at ? formatTime(finishedJourney.check_out_at) : '-'}
                </strong>
              </div>
            </div>
          ) : (
            <p className="journey-card__muted">
              Registre sua localização para iniciar o expediente de campo.
            </p>
          )}

          {actionHint ? (
            <div className="journey-status" aria-live="polite">
              <Navigation size={18} />
              <span>{actionHint}</span>
            </div>
          ) : null}

          <button
            className="primary-button journey-card__button"
            type="button"
            disabled={busy}
            onClick={onStart}
          >
            {getActionLabel(actionState, 'Iniciar jornada')}
          </button>
        </div>
      )}

      {actionError ? (
        <p className="journey-error" role="alert">
          {actionError}
        </p>
      ) : null}
    </section>
  );
}
