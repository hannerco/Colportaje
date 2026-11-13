/** Estado de la conexión. Toda acción lo consulta antes de escribir (BR-GEN-08, HU-BASE-06). */
export interface Connectivity {
  isOnline(): boolean;
  /** Avisa cada vez que cambia el estado; devuelve la función para dejar de escuchar. */
  subscribe(listener: (online: boolean) => void): () => void;
}
