import { MapPin, SquareCheckBig, Timer, WifiOff } from 'lucide-react';
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
    return 'Obtendo GPS...';
  }

  if (actionState === 'submitting') {
    return 'Enviando...';
  }

  return fallback;
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
          Check-in e check-out ficam disponiveis para consultores de campo.
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
            <h2 id="journey-title">Nao foi possivel carregar</h2>
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

  return (
    <section className="journey-card" aria-labelledby="journey-title">
      <div className="journey-card__header">
        <span className="journey-card__icon" aria-hidden="true">
          {activeJourney ? <MapPin size={20} /> : <Timer size={20} />}
        </span>
        <div>
          <p>Minha jornada</p>
          <h2 id="journey-title">
            {activeJourney ? 'Jornada em andamento' : 'Jornada do dia'}
          </h2>
        </div>
      </div>

      {activeJourney ? (
        <div className="journey-card__body">
          <div className="journey-meta">
            <span>Iniciada as {formatTime(activeJourney.check_in_at)}</span>
            <strong>Data {formatDate(activeJourney.check_in_at)}</strong>
          </div>
          {activeJourney.check_in_accuracy_meters ? (
            <span className="journey-location">
              <SquareCheckBig size={18} />
              Localizacao registrada
            </span>
          ) : null}
          <button
            className="danger-button"
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
            <div className="journey-meta">
              <span>Jornada encerrada</span>
              <strong>
                Inicio: {formatTime(finishedJourney.check_in_at)}
                {finishedJourney.check_out_at
                  ? ` | Fim: ${formatTime(finishedJourney.check_out_at)}`
                  : ''}
              </strong>
            </div>
          ) : (
            <p className="journey-card__muted">
              Registre sua localizacao para iniciar o expediente de campo.
            </p>
          )}
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
