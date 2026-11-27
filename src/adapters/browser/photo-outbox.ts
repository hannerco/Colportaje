import { createStore, del, entries, setMany, type UseStore } from 'idb-keyval';
import type { PendingPhoto, PhotoOutbox } from '@/repositories';

/** Base y almacén propios: la caché de lecturas se puede borrar (CACHE_BUSTER) sin tocar las fotos pendientes. */
const DB_NAME = 'colportor-pending-photos';
const STORE_NAME = 'photos';

/**
 * El archivo se guarda como bytes y no como `Blob`: Safari del iPhone ha perdido `Blob` guardados en IndexedDB al
 * reabrir la app (los entrega ilegibles); los bytes no tienen ese problema.
 */
type StoredPhoto = Omit<PendingPhoto, 'file'> & { readonly bytes: ArrayBuffer; readonly type: string };

const toStored = async ({ file, ...photo }: PendingPhoto): Promise<StoredPhoto> => ({
  ...photo,
  bytes: await file.arrayBuffer(),
  type: file.type,
});

const fromStored = ({ bytes, type, ...photo }: StoredPhoto): PendingPhoto => ({
  ...photo,
  file: new Blob([bytes], { type }),
});

/**
 * IndexedDB a veces no responde nunca (Safari del iPhone al abrir la base, sin espacio). Pasado este tiempo, la
 * operación se da por fallida y la bandeja sigue en memoria: nada se queda esperando.
 */
const IDB_TIMEOUT_MS = 4000;

const within = <T>(work: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('IndexedDB no responde')), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
};

/** Pide al navegador no borrar los datos de la app cuando falta espacio (Android). Si no se puede, no pasa nada. */
const askToKeepData = () => {
  try {
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch {
    // Sin la API (o en una ventana privada): las fotos igual quedan guardadas mientras el navegador lo permita.
  }
};

/**
 * Bandeja de fotos en IndexedDB (ADR-0054). Si IndexedDB no está disponible (ventana privada, sin espacio), las
 * fotos quedan en memoria: se suben igual mientras la app siga abierta.
 */
export function createIndexedDbPhotoOutbox(name = DB_NAME, timeoutMs = IDB_TIMEOUT_MS): PhotoOutbox {
  let store: UseStore | undefined;
  const db = () => (store ??= createStore(name, STORE_NAME));
  const memory = new Map<string, PendingPhoto>();

  return {
    async put(photos) {
      askToKeepData();
      try {
        const stored = await Promise.all(photos.map(toStored));
        await within(
          setMany(
            stored.map((photo) => [photo.photoId, photo]),
            db(),
          ),
          timeoutMs,
        );
        for (const photo of photos) memory.delete(photo.photoId);
      } catch {
        for (const photo of photos) memory.set(photo.photoId, photo);
      }
    },

    async list() {
      let saved: PendingPhoto[] = [];
      try {
        saved = (await within(entries<string, StoredPhoto>(db()), timeoutMs)).map(([, photo]) =>
          fromStored(photo),
        );
      } catch {
        // Sin IndexedDB solo queda lo de la memoria.
      }
      const inMemory = [...memory.values()];
      return [...saved.filter((photo) => !memory.has(photo.photoId)), ...inMemory];
    },

    async remove(photoId) {
      memory.delete(photoId);
      try {
        await within(del(photoId, db()), timeoutMs);
      } catch {
        // Si no se pudo borrar, al volver a subirla no se duplica (cada paso es idempotente).
      }
    },
  };
}
