import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecentVisits } from './RecentVisits';
import type { Visit } from './visit.types';

const visit: Visit = {
  id: '33333333-3333-4333-8333-333333333333',
  tenant_id: '22222222-2222-4222-8222-222222222222',
  consultant_id: '11111111-1111-4111-8111-111111111111',
  journey_id: '44444444-4444-4444-8444-444444444444',
  field_route_id: null,
  establishment_name: 'Mercado Central',
  latitude: -15.837,
  longitude: -48.028,
  gps_accuracy_meters: 12,
  photo_path: '22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/photo.jpg',
  visited_at: '2026-08-27T11:00:00.000Z',
  device_captured_at: null,
  outcome: 'lead_convertido',
  fraud_score: 0,
  fraud_signals: {},
  suspicious: false,
  review_status: 'pendente',
  created_at: '2026-08-27T11:00:00.000Z',
  updated_at: '2026-08-27T11:00:00.000Z'
};

describe('RecentVisits', () => {
  it('renders the empty state without inventing operational data', () => {
    const html = renderToStaticMarkup(<RecentVisits error={null} loading={false} visits={[]} />);

    expect(html).toContain('Nenhuma visita registrada ainda.');
  });

  it('renders the consultant recent visit with its real outcome and evidence status', () => {
    const html = renderToStaticMarkup(<RecentVisits error={null} loading={false} visits={[visit]} />);

    expect(html).toContain('Mercado Central');
    expect(html).toContain('Lead convertido');
    expect(html).toContain('Foto registrada');
  });
});
