import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { JourneyCardView } from './JourneyCard';
import type { Journey } from './journey.types';

const activeJourney: Journey = {
  id: '33333333-3333-4333-8333-333333333333',
  tenant_id: '22222222-2222-4222-8222-222222222222',
  consultant_id: '11111111-1111-4111-8111-111111111111',
  check_in_at: '2026-08-25T11:00:00.000Z',
  check_in_latitude: -15.837,
  check_in_longitude: -48.028,
  check_in_accuracy_meters: 12,
  check_out_at: null,
  check_out_latitude: null,
  check_out_longitude: null,
  check_out_accuracy_meters: null,
  status: 'aberta',
  created_at: '2026-08-25T11:00:00.000Z',
  updated_at: '2026-08-25T11:00:00.000Z'
};

describe('JourneyCardView', () => {
  it('renders the empty journey state', () => {
    const html = renderToStaticMarkup(
      <JourneyCardView
        actionError={null}
        actionState="idle"
        busy={false}
        journey={null}
        onFinish={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    expect(html).toContain('Iniciar jornada');
    expect(html).toContain('Registre sua localizacao');
  });

  it('renders the active journey state', () => {
    const html = renderToStaticMarkup(
      <JourneyCardView
        actionError={null}
        actionState="idle"
        busy={false}
        journey={activeJourney}
        onFinish={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    expect(html).toContain('Jornada em andamento');
    expect(html).toContain('Encerrar jornada');
    expect(html).toContain('Localizacao registrada');
  });

  it('renders a finished journey returned by the backend', () => {
    const html = renderToStaticMarkup(
      <JourneyCardView
        actionError={null}
        actionState="idle"
        busy={false}
        journey={{
          ...activeJourney,
          status: 'finalizada',
          check_out_at: '2026-08-25T19:00:00.000Z'
        }}
        onFinish={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    expect(html).toContain('Jornada encerrada');
    expect(html).toContain('Inicio:');
    expect(html).toContain('Fim:');
  });

  it('disables the action button while submitting', () => {
    const html = renderToStaticMarkup(
      <JourneyCardView
        actionError={null}
        actionState="submitting"
        busy
        journey={null}
        onFinish={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('Enviando...');
  });
});
