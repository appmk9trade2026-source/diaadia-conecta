import type { GeolocationSnapshot } from '../journey/journey.types';

export const visitOutcomes = [
  'lead_convertido',
  'recusou',
  'estabelecimento_fechado',
  'ja_possuia_cadastro',
  'outro'
] as const;

export type VisitOutcome = (typeof visitOutcomes)[number];

export type VisitReviewStatus = 'pendente' | 'aprovada' | 'suspeita' | 'descartada';

export type Visit = {
  id: string;
  tenant_id: string;
  consultant_id: string;
  journey_id: string;
  field_route_id: string | null;
  establishment_name: string;
  latitude: number;
  longitude: number;
  gps_accuracy_meters: number | null;
  photo_path: string | null;
  visited_at: string;
  device_captured_at: string | null;
  outcome: VisitOutcome;
  fraud_score: number;
  fraud_signals: Record<string, unknown>;
  suspicious: boolean;
  review_status: VisitReviewStatus;
  created_at: string;
  updated_at: string;
};

export type VisitFormData = {
  establishmentName: string;
  outcome: VisitOutcome | '';
  photo: File | null;
};

export type VisitPhoto = {
  file: File;
  previewUrl: string;
};

export type VisitActionState = 'idle' | 'locating' | 'uploading' | 'submitting';

export type RecordVisitInput = {
  tenantId: string;
  establishmentName: string;
  outcome: VisitOutcome;
  location: GeolocationSnapshot;
  photoPath: string;
  fieldRouteId?: string | null;
  deviceCapturedAt?: string | null;
};

export class FriendlyVisitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FriendlyVisitError';
  }
}
