import { CheckCircle2, Clock3, Image, MapPin, WifiOff } from 'lucide-react';
import { visitOutcomeLabels } from './visit.service';
import type { Visit } from './visit.types';

type RecentVisitsProps = {
  error: string | null;
  loading: boolean;
  visits: Visit[];
};

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit'
});

export function RecentVisits({ error, loading, visits }: RecentVisitsProps) {
  return (
    <section className="recent-visits" aria-labelledby="recent-visits-title">
      <div className="recent-visits__header">
        <div>
          <p>Hoje</p>
          <h2 id="recent-visits-title">Visitas recentes</h2>
        </div>
      </div>

      {loading ? <p className="recent-visits__empty">Carregando visitas recentes...</p> : null}

      {!loading && error ? (
        <p className="journey-error" role="alert">
          <WifiOff size={18} aria-hidden="true" />
          {error}
        </p>
      ) : null}

      {!loading && !error && visits.length === 0 ? (
        <div className="recent-visits__empty">
          <MapPin size={20} aria-hidden="true" />
          <span>Nenhuma visita registrada ainda.</span>
        </div>
      ) : null}

      {!loading && !error && visits.length > 0 ? (
        <ul className="recent-visits__list">
          {visits.map((visit) => (
            <li key={visit.id}>
              <div className="recent-visits__main">
                <strong>{visit.establishment_name}</strong>
                <span>{visitOutcomeLabels[visit.outcome]}</span>
              </div>
              <div className="recent-visits__meta">
                <span>
                  <Clock3 size={15} aria-hidden="true" />
                  {timeFormatter.format(new Date(visit.visited_at))}
                </span>
                {visit.photo_path ? (
                  <span>
                    <Image size={15} aria-hidden="true" />
                    Foto registrada
                  </span>
                ) : null}
                <span>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  {visit.review_status === 'pendente' ? 'Registrada' : visit.review_status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
