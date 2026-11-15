import { describe, expect, it, vi } from 'vitest';
import { businessConfig } from '@/domain/config/business-config';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { AuthRepository, LastPickerPointStore } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCustomerRepository } from '../../../tests/support/fake-repositories';
import {
  clearCustomerLocation,
  loadInitialPickerCenter,
  rememberLastChosenPoint,
  setCustomerLocation,
} from './use-cases/customer-location';

const authAs = (userId: string | null) =>
  ({ getCurrentUserId: async () => userId }) as unknown as AuthRepository;
const pointStore = (): LastPickerPointStore => {
  const points = new Map<string, { lat: number; lng: number }>();
  return {
    get: vi.fn((userId: string) => points.get(userId) ?? null),
    set: vi.fn((userId: string, point: { lat: number; lng: number }) => void points.set(userId, point)),
    clear: vi.fn(() => points.clear()),
  };
};

const depsWith = (online = true, userId: string | null = 'u-1') => ({
  connectivity: fakeConnectivity(online),
  auth: authAs(userId),
  lastPickerPoint: pointStore(),
  customers: fakeCustomerRepository({ setLocation: vi.fn(async () => ok(undefined)) }),
});

const LOCATION = { latitude: 6.2518, longitude: -75.5915, accuracyMeters: 12 };

describe('ubicación del cliente (HU-CLI-06)', () => {
  it('CA-1: guarda la ubicación válida y la recuerda como último punto elegido', async () => {
    const deps = depsWith();
    expect(await setCustomerLocation(deps, 'c1', LOCATION)).toEqual(ok(undefined));
    expect(deps.customers.setLocation).toHaveBeenCalledWith('c1', LOCATION);
    expect(deps.lastPickerPoint.set).toHaveBeenCalledWith('u-1', { lat: 6.2518, lng: -75.5915 });
  });

  it('CA-3: latitud 91 → VALIDATION latitude sin ir a la red ni recordar el punto', async () => {
    const deps = depsWith();
    expect(await setCustomerLocation(deps, 'c1', { ...LOCATION, latitude: 91 })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'latitude' } },
    });
    expect(deps.customers.setLocation).not.toHaveBeenCalled();
    expect(deps.lastPickerPoint.set).not.toHaveBeenCalled();
  });

  it('si la base rechaza (archivado), no recuerda el punto; sin conexión → OFFLINE', async () => {
    const deps = depsWith();
    vi.mocked(deps.customers.setLocation).mockResolvedValueOnce(err(appError('CUSTOMER_ARCHIVED')));
    expect(await setCustomerLocation(deps, 'c1', LOCATION)).toEqual(err(appError('CUSTOMER_ARCHIVED')));
    expect(deps.lastPickerPoint.set).not.toHaveBeenCalled();
    const offline = depsWith(false);
    expect(await setCustomerLocation(offline, 'c1', LOCATION)).toEqual(err(appError('OFFLINE')));
    expect(await clearCustomerLocation(offline, 'c1')).toEqual(err(appError('OFFLINE')));
    expect(offline.customers.setLocation).not.toHaveBeenCalled();
  });

  it('CA-5: quitar envía null (coordenadas y precisión vacías)', async () => {
    const deps = depsWith();
    expect(await clearCustomerLocation(deps, 'c1')).toEqual(ok(undefined));
    expect(deps.customers.setLocation).toHaveBeenCalledWith('c1', null);
  });

  it('CA-6: el selector de otro cliente sin ubicación abre en el último punto elegido', async () => {
    const deps = depsWith();
    await rememberLastChosenPoint(deps, { lat: 6.25, lng: -75.59 });
    expect(await loadInitialPickerCenter(deps, null)).toEqual({ lat: 6.25, lng: -75.59, zoom: null });
    expect(await loadInitialPickerCenter(deps, { latitude: 1, longitude: 2 })).toEqual({
      lat: 1,
      lng: 2,
      zoom: null,
    });
  });

  it('sin sesión no recuerda ni lee puntos: abre en Colombia', async () => {
    const deps = depsWith(true, null);
    await rememberLastChosenPoint(deps, { lat: 6.25, lng: -75.59 });
    expect(deps.lastPickerPoint.set).not.toHaveBeenCalled();
    expect(await loadInitialPickerCenter(deps, null)).toEqual(businessConfig.location.defaultCenter);
  });
});
