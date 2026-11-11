/** IDs UUID v4 generados en el cliente (BR-GEN-04): reintentar con el mismo ID no duplica nada. */
export const newId = (): string => crypto.randomUUID();
