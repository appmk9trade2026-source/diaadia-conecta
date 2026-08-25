import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { GeolocationSnapshot, Journey } from './journey.types';
import { FriendlyJourneyError } from './journey.types';

type JourneyClient = Pick<SupabaseClient, 'from' | 'rpc'>;

const activeJourneyColumns = `
  id,
  tenant_id,
  consultant_id,
  check_in_at,
  check_in_latitude,
  check_in_longitude,
  check_in_accuracy_meters,
  check_out_at,
  check_out_latitude,
  check_out_longitude,
  check_out_accuracy_meters,
  status,
  created_at,
  updated_at
`;

export function getJourneyQueryKey(tenantId: string, userId: string) {
  return ['journey', tenantId, userId] as const;
}

export function getJourneyInvalidationFilter(tenantId: string, userId: string) {
  return { queryKey: getJourneyQueryKey(tenantId, userId) };
}

export function isJourneyActionDisabled(actionState: 'idle' | 'locating' | 'submitting') {
  return actionState !== 'idle';
}

export async function getActiveJourney(
  tenantId: string,
  userId: string,
  client: JourneyClient = supabase,
): Promise<Journey | null> {
  const { data, error } = await client
    .from('journeys')
    .select(activeJourneyColumns)
    .eq('tenant_id', tenantId)
    .eq('consultant_id', userId)
    .eq('status', 'aberta')
    .order('check_in_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new FriendlyJourneyError('Nao foi possivel carregar sua jornada.');
  }

  return (data as Journey | null) ?? null;
}

export async function startJourney(
  tenantId: string,
  location: GeolocationSnapshot,
  client: JourneyClient = supabase,
): Promise<Journey> {
  const { data, error } = await client.rpc('start_journey', {
    p_tenant_id: tenantId,
    p_check_in_latitude: location.latitude,
    p_check_in_longitude: location.longitude,
    p_check_in_accuracy_meters: location.accuracy
  });

  if (error || !data) {
    throw new FriendlyJourneyError('Nao foi possivel iniciar sua jornada. Tente novamente.');
  }

  return data as Journey;
}

export async function finishJourney(
  journeyId: string,
  location: GeolocationSnapshot,
  client: JourneyClient = supabase,
): Promise<Journey> {
  const { data, error } = await client.rpc('finish_journey', {
    p_journey_id: journeyId,
    p_check_out_latitude: location.latitude,
    p_check_out_longitude: location.longitude,
    p_check_out_accuracy_meters: location.accuracy
  });

  if (error || !data) {
    throw new FriendlyJourneyError('Nao foi possivel encerrar sua jornada. Tente novamente.');
  }

  return data as Journey;
}

export function getLocationUnavailableMessage(error?: GeolocationPositionError) {
  if (!error) {
    return 'Seu navegador nao permite capturar localizacao. Ative a localizacao do dispositivo e tente novamente.';
  }

  if (error.code === error.PERMISSION_DENIED) {
    return 'Permita o acesso a localizacao do dispositivo e tente novamente.';
  }

  if (error.code === error.TIMEOUT) {
    return 'A localizacao demorou para responder. Verifique o sinal de GPS e tente novamente.';
  }

  return 'Nao foi possivel obter sua localizacao. Ative a localizacao do dispositivo e tente novamente.';
}

export function captureCurrentPosition(
  geolocation: Geolocation | undefined = navigator.geolocation,
): Promise<GeolocationSnapshot> {
  if (!geolocation) {
    return Promise.reject(new FriendlyJourneyError(getLocationUnavailableMessage()));
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
        reject(new FriendlyJourneyError(getLocationUnavailableMessage(error)));
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0
      },
    );
  });
}
