import { z } from 'zod';
import { visitOutcomes } from '../../types/domain';

export const visitDraftSchema = z.object({
  tenantId: z.string().uuid(),
  consultantId: z.string().uuid(),
  journeyId: z.string().uuid().optional(),
  roteiroLabel: z.string().min(1),
  establishmentName: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  gpsAccuracyMeters: z.number().positive().optional(),
  outcome: z.enum(visitOutcomes)
});

export type VisitDraft = z.infer<typeof visitDraftSchema>;
