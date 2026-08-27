import { describe, expect, it, vi } from 'vitest';
import {
  canRegisterVisit,
  captureVisitPosition,
  createEmptyVisitFormData,
  createVisitPhotoPath,
  isVisitActionDisabled,
  recordVisit,
  uploadVisitPhoto,
  validateVisitForm
} from './visit.service';
import { FriendlyVisitError } from './visit.types';
import type { Visit } from './visit.types';
import type { GeolocationSnapshot } from '../journey/journey.types';

const tenantId = '22222222-2222-4222-8222-222222222222';
const userId = '11111111-1111-4111-8111-111111111111';
const location: GeolocationSnapshot = { latitude: -15.837, longitude: -48.028, accuracy: 12 };

const visit: Visit = {
  id: '33333333-3333-4333-8333-333333333333',
  tenant_id: tenantId,
  consultant_id: userId,
  journey_id: '44444444-4444-4444-8444-444444444444',
  field_route_id: null,
  establishment_name: 'Mercado Central',
  latitude: location.latitude,
  longitude: location.longitude,
  gps_accuracy_meters: location.accuracy,
  photo_path: `${tenantId}/${userId}/photo.jpg`,
  visited_at: '2026-08-27T11:00:00.000Z',
  device_captured_at: '2026-08-27T11:00:00.000Z',
  outcome: 'lead_convertido',
  fraud_score: 0,
  fraud_signals: {},
  suspicious: false,
  review_status: 'pendente',
  created_at: '2026-08-27T11:00:00.000Z',
  updated_at: '2026-08-27T11:00:00.000Z'
};

function createPhoto() {
  return new File(['image'], 'evidencia.jpg', { type: 'image/jpeg' });
}

function createGeolocationSuccess() {
  return {
    getCurrentPosition: vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy ?? 0,
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

describe('visit service', () => {
  it('requires an active journey for a consultant to register a visit', () => {
    expect(canRegisterVisit('consultant', null)).toBe(false);
    expect(canRegisterVisit('consultant', visit.journey_id)).toBe(true);
    expect(canRegisterVisit('admin', visit.journey_id)).toBe(false);
  });

  it('validates the free establishment name, outcome, and required photo', () => {
    expect(() => validateVisitForm(createEmptyVisitFormData())).toThrow(FriendlyVisitError);
    expect(() =>
      validateVisitForm({ establishmentName: 'Mercado Central', outcome: 'lead_convertido', photo: createPhoto() }),
    ).not.toThrow();
  });

  it('uses the private tenant and consultant path for visit evidence', () => {
    expect(createVisitPhotoPath(tenantId, userId, createPhoto(), 'photo-id')).toBe(
      `${tenantId}/${userId}/photo-id.jpg`,
    );
  });

  it('captures GPS with high accuracy only when the visit is submitted', async () => {
    const geolocation = createGeolocationSuccess();

    await expect(captureVisitPosition(geolocation)).resolves.toEqual(location);
    expect(geolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });

  it('uploads evidence to the private visit-photos bucket', async () => {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const client = { storage: { from: vi.fn(() => ({ upload })) } };

    await expect(uploadVisitPhoto(tenantId, userId, createPhoto(), client as never)).resolves.toMatch(
      new RegExp(`^${tenantId}/${userId}/`),
    );
    expect(client.storage.from).toHaveBeenCalledWith('visit-photos');
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${tenantId}/${userId}/`)),
      expect.any(File),
      { contentType: 'image/jpeg', upsert: false },
    );
  });

  it('returns a friendly error when private photo upload fails', async () => {
    const client = {
      storage: { from: vi.fn(() => ({ upload: vi.fn().mockResolvedValue({ data: null, error: {} }) })) }
    };

    await expect(uploadVisitPhoto(tenantId, userId, createPhoto(), client as never)).rejects.toBeInstanceOf(
      FriendlyVisitError,
    );
  });

  it('registers through record_visit RPC with the audited payload', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: visit, error: null });
    const client = { rpc };

    await expect(
      recordVisit(
        {
          tenantId,
          establishmentName: visit.establishment_name,
          outcome: visit.outcome,
          location,
          photoPath: visit.photo_path ?? ''
        },
        client as never,
      ),
    ).resolves.toBe(visit);

    expect(rpc).toHaveBeenCalledWith('record_visit', {
      p_tenant_id: tenantId,
      p_establishment_name: visit.establishment_name,
      p_latitude: location.latitude,
      p_longitude: location.longitude,
      p_gps_accuracy_meters: location.accuracy,
      p_photo_path: visit.photo_path,
      p_outcome: visit.outcome,
      p_field_route_id: null,
      p_device_captured_at: null
    });
  });

  it('does not permit repeated submissions while an action is running', () => {
    expect(isVisitActionDisabled('locating')).toBe(true);
    expect(isVisitActionDisabled('uploading')).toBe(true);
    expect(isVisitActionDisabled('submitting')).toBe(true);
    expect(isVisitActionDisabled('idle')).toBe(false);
  });
});
