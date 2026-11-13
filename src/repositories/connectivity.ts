/** Estado de la conexión. Toda acción lo consulta antes de escribir (BR-GEN-08); HU-BASE-06 lo amplía. */
export interface Connectivity {
  isOnline(): boolean;
}
