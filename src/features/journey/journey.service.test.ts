import { describe, expect, it, vi } from 'vitest';
import {
  captureCurrentPosition,
  finishJourney,
  getActiveJourney,
  getJourneyInvalidationFilter,
  getJourneyQueryKey,
  isJourneyActionDisabled,
  startJourney
} from './journey.service';
import { FriendlyJourneyError } from './journey.types';
import type { GeolocationSnapshot, Journey } from './journey.types';

const tenantId = '22222222-2222-4222-8222-222222222222';
const userId = '11111111-1111-4111-8111-111111111111';
const journeyId = '33333333-3333-4333-8333-333333333333';

const activeJourney: Journey = {
  id: journeyId,
  tenant_id: tenantId,
  consultant_id: userId,
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

const location: GeolocationSnapshot = {
  latitude: -15.837,
  longitude: -48.028,
  accuracy: 12
};

function createJourneyClient(data: Journey | null, error: unknown = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn()
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue({ data, error });

  return {
    client: {
      from: vi.fn(() => query),
      rpc: vi.fn()
    },
    query
  };
}

function createRpcClient(data: Journey | null, error: unknown = null) {
  return {
    rpc: vi.fn().mockResolvedValue({ data, error }),
    from: vi.fn()
  };
}

function createGeolocationSuccess() {
  return {
    getCurrentPosition: vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({})
        },
        timestamp: Date.now(),
        toJSON: () => ({})
      });
    })
  } as unknown as Geolocation;
}

function createGeolocationFailure(code: number, key: 'PERMISSION_DENIED' | 'TIMEOUT') {
  return {
    getCurrentPosition: vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
      error({
        code,
        message: 'browser error',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as GeolocationPositionError);
    }),
    [key]: code
  } as unknown as Geolocation;
}

describe('journey service', () => {
  it('returns null when there is no active journey', async () => {
    const { client } = createJourneyClient(null);

    await expect(getActiveJourney(tenantId, userId, client as never)).resolves.toBeNull();
  });

  it('loads the current active journey through RLS query filters', async () => {
    const { client, query } = createJourneyClient(activeJourney);

    await expect(getActiveJourney(tenantId, userId, client as never)).resolves.toBe(activeJourney);

    expect(client.from).toHaveBeenCalledWith('journeys');
    expect(query.eq).toHaveBeenCalledWith('tenant_id', tenantId);
    expect(query.eq).toHaveBeenCalledWith('consultant_id', userId);
    expect(query.eq).toHaveBeenCalledWith('status', 'aberta');
  });

  it('starts a journey through start_journey RPC', async () => {
    const client = createRpcClient(activeJourney);

    await expect(startJourney(tenantId, location, client as never)).resolves.toBe(activeJourney);

    expect(client.rpc).toHaveBeenCalledWith('start_journey', {
      p_tenant_id: tenantId,
      p_check_in_latitude: location.latitude,
      p_check_in_longitude: location.longitude,
      p_check_in_accuracy_meters: location.accuracy
    });
  });

  it('maps GPS permission denied to a friendly error', async () => {
    const geolocation = createGeolocationFailure(1, 'PERMISSION_DENIED');

    await expect(captureCurrentPosition(geolocation)).rejects.toMatchObject({
      message: 'Permita o acesso a localizacao do dispositivo e tente novamente.'
    });
  });

  it('maps GPS timeout to a friendly error', async () => {
    const geolocation = createGeolocationFailure(3, 'TIMEOUT');

    await expect(captureCurrentPosition(geolocation)).rejects.toMatchObject({
      message: 'A localizacao demorou para responder. Verifique o sinal de GPS e tente novamente.'
    });
  });

  it('raises a friendly error when start_journey fails', async () => {
    const client = createRpcClient(null, { message: 'rpc failed' });

    await expect(startJourney(tenantId, location, client as never)).rejects.toBeInstanceOf(
      FriendlyJourneyError,
    );
  });

  it('finishes a journey through finish_journey RPC', async () => {
    const finishedJourney = {
      ...activeJourney,
      check_out_at: '2026-08-25T19:00:00.000Z',
      check_out_latitude: location.latitude,
      check_out_longitude: location.longitude,
      check_out_accuracy_meters: location.accuracy,
      status: 'finalizada' as const
    };
    const client = createRpcClient(finishedJourney);

    await expect(finishJourney(journeyId, location, client as never)).resolves.toBe(finishedJourney);

    expect(client.rpc).toHaveBeenCalledWith('finish_journey', {
      p_journey_id: journeyId,
      p_check_out_latitude: location.latitude,
      p_check_out_longitude: location.longitude,
      p_check_out_accuracy_meters: location.accuracy
    });
  });

  it('raises a friendly error when finish_journey fails', async () => {
    const client = createRpcClient(null, { message: 'rpc failed' });

    await expect(finishJourney(journeyId, location, client as never)).rejects.toBeInstanceOf(
      FriendlyJourneyError,
    );
  });

  it('blocks repeated clicks while a journey action is running', () => {
    expect(isJourneyActionDisabled('locating')).toBe(true);
    expect(isJourneyActionDisabled('submitting')).toBe(true);
    expect(isJourneyActionDisabled('idle')).toBe(false);
  });

  it('uses the central query key for refetch after mutations', () => {
    expect(getJourneyInvalidationFilter(tenantId, userId)).toEqual({
      queryKey: getJourneyQueryKey(tenantId, userId)
    });
  });

  it('captures the current GPS position with high accuracy options', async () => {
    const geolocation = createGeolocationSuccess();

    await expect(captureCurrentPosition(geolocation)).resolves.toEqual(location);

    expect(geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0
      },
    );
  });
});
