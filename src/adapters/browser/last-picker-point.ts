import { z } from 'zod';
import type { LastPickerPointStore } from '@/repositories';

export const LAST_PICKER_POINT_KEY = 'colportor-last-picker-point';

const storedSchema = z.object({
  userId: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** El `localStorage` del navegador o `null` (servidor, modo privado estricto o almacenamiento bloqueado). */
const browserStorage = (): StorageLike | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

/**
 * Último punto del selector en el almacenamiento local (HU-CLI-06). Guarda un solo punto con su dueño: si
 * entra otro usuario no lo ve. Cualquier fallo del almacenamiento se trata como "no hay punto".
 */
export const createLastPickerPointStore = (
  getStorage: () => StorageLike | null = browserStorage,
): LastPickerPointStore => ({
  get(userId) {
    try {
      const raw = getStorage()?.getItem(LAST_PICKER_POINT_KEY);
      if (!raw) return null;
      const parsed = storedSchema.safeParse(JSON.parse(raw));
      if (!parsed.success || parsed.data.userId !== userId) return null;
      return { lat: parsed.data.lat, lng: parsed.data.lng };
    } catch {
      return null;
    }
  },
  set(userId, point) {
    try {
      getStorage()?.setItem(
        LAST_PICKER_POINT_KEY,
        JSON.stringify({ userId, lat: point.lat, lng: point.lng }),
      );
    } catch {
      // Sin almacenamiento disponible: el selector abrirá en Colombia.
    }
  },
  clear() {
    try {
      getStorage()?.removeItem(LAST_PICKER_POINT_KEY);
    } catch {
      // Nada que borrar.
    }
  },
});
