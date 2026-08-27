import { supabase } from '../../lib/supabase';
import type { GeolocationSnapshot } from '../journey/journey.types';
import type { RecordVisitInput, Visit, VisitActionState, VisitFormData, VisitOutcome } from './visit.types';
import { FriendlyVisitError, visitOutcomes } from './visit.types';

const visitColumns = `
  id,
  tenant_id,
  consultant_id,
  journey_id,
  field_route_id,
  establishment_name,
  latitude,
  longitude,
  gps_accuracy_meters,
  photo_path,
  visited_at,
  device_captured_at,
  outcome,
  fraud_score,
  fraud_signals,
  suspicious,
  review_status,
  created_at,
  updated_at
`;

const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
const photoExtensionByMime = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
} as const;

type AllowedPhotoMimeType = (typeof allowedPhotoTypes)[number];

type VisitQueryBuilder = {
  select(columns: string): VisitQueryBuilder;
  eq(column: string, value: string): VisitQueryBuilder;
  order(column: string, options: { ascending: boolean }): VisitQueryBuilder;
  limit(count: number): Promise<{ data: unknown; error: unknown }>;
};

type VisitStorageBucket = {
  upload(
    path: string,
    file: File,
    options: { contentType: AllowedPhotoMimeType; upsert: false },
  ): Promise<{ data: unknown; error: unknown }>;
};

type VisitClient = {
  from(table: 'visits'): VisitQueryBuilder;
  rpc(functionName: 'record_visit', payload: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  storage: {
    from(bucket: 'visit-photos'): VisitStorageBucket;
  };
};

export const visitOutcomeLabels: Record<VisitOutcome, string> = {
  lead_convertido: 'Lead convertido',
  recusou: 'Recusou',
  estabelecimento_fechado: 'Estabelecimento fechado',
  ja_possuia_cadastro: 'Já possuía cadastro',
  outro: 'Outro'
};

export function getVisitsQueryKey(tenantId: string, userId: string) {
  return ['visits', tenantId, userId] as const;
}

export function getVisitsInvalidationFilter(tenantId: string, userId: string) {
  return { queryKey: getVisitsQueryKey(tenantId, userId) };
}

export function isVisitActionDisabled(actionState: VisitActionState) {
  return actionState !== 'idle';
}

export function canRegisterVisit(role: string, activeJourneyId: string | null) {
  return role === 'consultant' && Boolean(activeJourneyId);
}

export function createEmptyVisitFormData(): VisitFormData {
  return {
    establishmentName: '',
    outcome: '',
    photo: null
  };
}

export function validateVisitForm(formData: VisitFormData, photoRequired = true) {
  const establishmentName = formData.establishmentName.trim();

  if (!establishmentName) {
    throw new FriendlyVisitError('Informe o nome do estabelecimento.');
  }

  if (!formData.outcome || !visitOutcomes.includes(formData.outcome)) {
    throw new FriendlyVisitError('Selecione o resultado da visita.');
  }

  if (photoRequired && !formData.photo) {
    throw new FriendlyVisitError('Capture uma foto da visita para continuar.');
  }

  if (formData.photo) {
    assertVisitPhoto(formData.photo);
  }

  return {
    establishmentName,
    outcome: formData.outcome
  };
}

export function assertVisitPhoto(file: File) {
  if (!allowedPhotoTypes.includes(file.type as AllowedPhotoMimeType)) {
    throw new FriendlyVisitError('Use uma foto em JPG, PNG ou WebP.');
  }
}

export function createVisitPhotoPath(
  tenantId: string,
  userId: string,
  file: File,
  randomId: string = crypto.randomUUID(),
) {
  assertVisitPhoto(file);
  const extension = photoExtensionByMime[file.type as AllowedPhotoMimeType];

  return `${tenantId}/${userId}/${randomId}.${extension}`;
}

export function getLocationUnavailableMessage(error?: GeolocationPositionError) {
  if (!error) {
    return 'Seu navegador não permite capturar localização. Ative a localização do dispositivo e tente novamente.';
  }

  if (error.code === error.PERMISSION_DENIED) {
    return 'Permita o acesso à localização do dispositivo e tente novamente.';
  }

  if (error.code === error.TIMEOUT) {
    return 'A localização demorou para responder. Verifique o sinal de GPS e tente novamente.';
  }

  return 'Não foi possível obter sua localização. Ative a localização do dispositivo e tente novamente.';
}

export function captureVisitPosition(
  geolocation: Geolocation | undefined = globalThis.navigator?.geolocation,
): Promise<GeolocationSnapshot> {
  if (!geolocation) {
    return Promise.reject(new FriendlyVisitError(getLocationUnavailableMessage()));
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null
        });
      },
      (error) => {
        reject(new FriendlyVisitError(getLocationUnavailableMessage(error)));
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0
      },
    );
  });
}

export async function getRecentVisits(
  tenantId: string,
  userId: string,
  client: VisitClient = supabase as unknown as VisitClient,
): Promise<Visit[]> {
  const { data, error } = await client
    .from('visits')
    .select(visitColumns)
    .eq('tenant_id', tenantId)
    .eq('consultant_id', userId)
    .order('visited_at', { ascending: false })
    .limit(5);

  if (error) {
    throw new FriendlyVisitError('Não foi possível carregar as visitas recentes.');
  }

  return (data as Visit[] | null) ?? [];
}

export async function uploadVisitPhoto(
  tenantId: string,
  userId: string,
  file: File,
  client: VisitClient = supabase as unknown as VisitClient,
) {
  const path = createVisitPhotoPath(tenantId, userId, file);
  const { error } = await client.storage.from('visit-photos').upload(path, file, {
    contentType: file.type as AllowedPhotoMimeType,
    upsert: false
  });

  if (error) {
    throw new FriendlyVisitError('Não foi possível enviar a foto. Tente novamente.');
  }

  return path;
}

export async function recordVisit(
  input: RecordVisitInput,
  client: VisitClient = supabase as unknown as VisitClient,
): Promise<Visit> {
  const { data, error } = await client.rpc('record_visit', {
    p_tenant_id: input.tenantId,
    p_establishment_name: input.establishmentName,
    p_latitude: input.location.latitude,
    p_longitude: input.location.longitude,
    p_gps_accuracy_meters: input.location.accuracy,
    p_photo_path: input.photoPath,
    p_outcome: input.outcome,
    p_field_route_id: input.fieldRouteId ?? null,
    p_device_captured_at: input.deviceCapturedAt ?? null
  });

  if (error || !data) {
    throw new FriendlyVisitError('Não foi possível registrar a visita. Tente novamente.');
  }

  return data as Visit;
}
