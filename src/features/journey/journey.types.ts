export type JourneyStatus = 'aberta' | 'finalizada' | 'cancelada';

export type Journey = {
  id: string;
  tenant_id: string;
  consultant_id: string;
  check_in_at: string;
  check_in_latitude: number;
  check_in_longitude: number;
  check_in_accuracy_meters: number | null;
  check_out_at: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_accuracy_meters: number | null;
  status: JourneyStatus;
  created_at: string;
  updated_at: string;
};

export type GeolocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type JourneyActionState = 'idle' | 'locating' | 'submitting';

export class FriendlyJourneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FriendlyJourneyError';
  }
}
