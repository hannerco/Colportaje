// HU-CLI-06 · Último punto del selector en el almacenamiento local del dispositivo.
import { describe, expect, it } from 'vitest';
import { createLastPickerPointStore, LAST_PICKER_POINT_KEY } from '@/adapters/browser/last-picker-point';

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

describe('createLastPickerPointStore (HU-CLI-06)', () => {
  it('CA-6: recuerda el último punto del usuario; otro usuario no lo ve', () => {
    const storage = memoryStorage();
    const store = createLastPickerPointStore(() => storage);
    expect(store.get('u-1')).toBeNull();
    store.set('u-1', { lat: 6.25, lng: -75.59 });
    store.set('u-1', { lat: 6.2518, lng: -75.5915 }); // el último gana
    expect(store.get('u-1')).toEqual({ lat: 6.2518, lng: -75.5915 });
    expect(store.get('u-2')).toBeNull();
  });

  it('clear() lo borra (al cerrar sesión)', () => {
    const storage = memoryStorage();
    const store = createLastPickerPointStore(() => storage);
    store.set('u-1', { lat: 1, lng: 2 });
    store.clear();
    expect(storage.data.has(LAST_PICKER_POINT_KEY)).toBe(false);
    expect(store.get('u-1')).toBeNull();
  });

  it('un valor dañado o fuera de rango se ignora', () => {
    const storage = memoryStorage();
    const store = createLastPickerPointStore(() => storage);
    storage.setItem(LAST_PICKER_POINT_KEY, '{no es json');
    expect(store.get('u-1')).toBeNull();
    storage.setItem(LAST_PICKER_POINT_KEY, JSON.stringify({ userId: 'u-1', lat: 95, lng: 0 }));
    expect(store.get('u-1')).toBeNull();
  });

  it('sin almacenamiento o si falla, no recuerda nada y nunca lanza', () => {
    const none = createLastPickerPointStore(() => null);
    none.set('u-1', { lat: 1, lng: 2 });
    expect(none.get('u-1')).toBeNull();
    none.clear();
    const broken = createLastPickerPointStore(() => ({
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('lleno');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    }));
    expect(() => broken.set('u-1', { lat: 1, lng: 2 })).not.toThrow();
    expect(broken.get('u-1')).toBeNull();
    expect(() => broken.clear()).not.toThrow();
  });

  it('fuera del navegador (sin window) usa "sin almacenamiento"', () => {
    const store = createLastPickerPointStore();
    store.set('u-1', { lat: 1, lng: 2 });
    expect(store.get('u-1')).toBeNull();
  });
});
