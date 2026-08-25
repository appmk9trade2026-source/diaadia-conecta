import { describe, expect, it } from 'vitest';
import { visitDraftSchema } from './visit.schema';

describe('visitDraftSchema', () => {
  it('accepts a free typed establishment name', () => {
    const result = visitDraftSchema.safeParse({
      tenantId: '8f6b310e-809f-4f8d-bbfa-fcaac128c72f',
      consultantId: '693f61e4-d73a-4b67-80f3-594246a070ef',
      roteiroLabel: 'Aguas Claras - Av. Araucarias',
      establishmentName: 'Padaria Central',
      latitude: -15.837,
      longitude: -48.028,
      gpsAccuracyMeters: 12,
      outcome: 'lead_convertido'
    });

    expect(result.success).toBe(true);
  });
});
