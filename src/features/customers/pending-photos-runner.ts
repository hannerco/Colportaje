import type { PendingPhoto } from '@/repositories';
import {
  discardPendingPhoto,
  drainPendingPhotos,
  queueNewCustomerPhotos,
  retryPendingPhoto,
  type NewCustomerPhotos,
  type PendingPhotosDeps,
} from './use-cases/pending-photos';

export type PendingPhotosState = {
  readonly photos: readonly PendingPhoto[];
  /** La foto que se está subiendo ahora. */
  readonly uploadingId: string | null;
};

export type PendingPhotosRunnerOptions = {
  /** Una foto quedó en la base: refrescar la ficha de su cliente. */
  readonly onUploaded?: (photo: PendingPhoto) => void;
  readonly now?: () => number;
  /** Que dos pestañas no suban a la vez (Web Locks). Por defecto, sin candado. */
  readonly lock?: <T>(run: () => Promise<T>) => Promise<T>;
  /** Con señal pero la subida falló (red inestable): cuánto esperar para volver a intentar. */
  readonly retryMs?: number;
};

export type PendingPhotosRunner = {
  getState(): PendingPhotosState;
  subscribe(listener: () => void): () => void;
  /** Sube lo pendiente. Si ya está subiendo, hace otra ronda al terminar (por si llegó algo nuevo). */
  run(): Promise<void>;
  /** Guarda en el teléfono las fotos de un cliente recién guardado, a nombre del usuario de la sesión, y las sube. */
  queue(input: { customerId: string; photos: NewCustomerPhotos }): Promise<void>;
  retry(photoId: string): Promise<void>;
  discard(photoId: string): Promise<void>;
  stop(): void;
};

const RETRY_MS = 30_000;

/** Pone a andar la bandeja de fotos (ADR-0054) y cuenta qué falta, para que la ficha lo muestre. */
export function createPendingPhotosRunner(
  deps: PendingPhotosDeps,
  { onUploaded, now = Date.now, lock = (run) => run(), retryMs = RETRY_MS }: PendingPhotosRunnerOptions = {},
): PendingPhotosRunner {
  let state: PendingPhotosState = { photos: [], uploadingId: null };
  const listeners = new Set<() => void>();
  let running: Promise<void> | null = null;
  let again = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const set = (patch: Partial<PendingPhotosState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };
  const refresh = async () => set({ photos: await deps.photoOutbox.list() });

  const pass = async () => {
    const outcome = await drainPendingPhotos(deps, {
      onStart: (photo) => set({ uploadingId: photo.photoId }),
      onUploaded: (photo) => {
        void refresh();
        onUploaded?.(photo);
      },
    });
    set({ uploadingId: null });
    await refresh();
    return outcome;
  };

  const run = (): Promise<void> => {
    if (stopped) return Promise.resolve();
    clearTimeout(timer);
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      let waiting = false;
      do {
        again = false;
        try {
          ({ waiting } = await lock(pass));
        } catch {
          // Algo inesperado (IndexedDB, el navegador): lo pendiente sigue guardado y se reintenta.
          set({ uploadingId: null });
          waiting = true;
        }
      } while (again && !stopped);
      if (waiting && !stopped && deps.connectivity.isOnline()) timer = setTimeout(() => void run(), retryMs);
    })().finally(() => {
      running = null;
    });
    return running;
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    run,
    async queue(input) {
      const ownerId = await deps.auth.getCurrentUserId();
      if (!ownerId) throw new Error('Sin sesión no se pueden guardar fotos pendientes');
      await queueNewCustomerPhotos(deps, { ...input, ownerId, now: now() });
      await refresh();
      void run();
    },
    async retry(photoId) {
      await retryPendingPhoto(deps, photoId, now());
      await refresh();
      void run();
    },
    async discard(photoId) {
      await discardPendingPhoto(deps, photoId);
      await refresh();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}

/** Lo que falta de un cliente, para la ficha. */
export type CustomerPendingPhotos = {
  /** Esperan su turno (o señal). */
  readonly pending: number;
  /** Una de ellas se está subiendo ahora. */
  readonly uploading: boolean;
  /** Fallaron sin remedio: la persona decide «Reintentar» o «Descartar». */
  readonly failedIds: readonly string[];
};

export function pendingPhotosOf(state: PendingPhotosState, customerId: string): CustomerPendingPhotos {
  const mine = state.photos.filter((photo) => photo.customerId === customerId);
  const waiting = mine.filter((photo) => photo.failure === null);
  return {
    pending: waiting.length,
    uploading: waiting.some((photo) => photo.photoId === state.uploadingId),
    failedIds: mine.filter((photo) => photo.failure !== null).map((photo) => photo.photoId),
  };
}
