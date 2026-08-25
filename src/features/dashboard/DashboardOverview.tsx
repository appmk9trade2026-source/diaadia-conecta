import { workflowStages } from '../../types/domain';

export function DashboardOverview() {
  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <p>Fundacao tecnica</p>
        <h1>DIA A DIA CONECTA</h1>
        <span>Base inicial para jornada, visitas, leads, vouchers e entregas.</span>
      </header>

      <div className="stage-grid" aria-label="Fluxo oficial">
        {workflowStages.map((stage, index) => (
          <article className="stage-card" key={stage.key}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h2>{stage.label}</h2>
            <p>{stage.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
