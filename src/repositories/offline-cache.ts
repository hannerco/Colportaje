/** Lecturas guardadas en el dispositivo para consultar sin conexión (HU-BASE-06). */
export interface OfflineCache {
  /** Borra de inmediato lo guardado (al cerrar sesión: los datos son del usuario actual). */
  clear(): Promise<void>;
}
