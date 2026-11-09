# HU-BASE-06 · Lectura sin conexión y bloqueo de escrituras

> **Épica:** Cimientos · **Depende de:** HU-BASE-01 · **Reglas:** BR-GEN-08, BR-CUS-14 (sin conexión), ADR-0003, AF-90, AF-91 · **Diseño:** estados "sin conexión" de Clientes y Dinero ("Sin conexión · estás viendo los datos de las 9:40 p. m. Puedes consultar, pero no guardar cambios.")

## Historia
**Como** colportor en la calle sin señal **quiero** poder consultar mis clientes, teléfonos, direcciones, inventario y abonos **para** seguir trabajando, sabiendo que para registrar algo necesito conexión.

## Contexto
- Fase 1: **leer** sin conexión sí; **escribir** sin conexión es fase 2 (ADR-0003). Toda escritura se bloquea con un error claro.
- El diseño muestra la hora de los últimos datos ("las 9:40 p. m.") y botones deshabilitados ("Nuevo cliente", "Cobrar", "Entregar al líder").

## Alcance
- **Incluye:** cliente de TanStack Query con persistencia de lecturas en IndexedDB; detección de conexión; guardia de escrituras; hora de la última sincronización; revalidación al volver la conexión; manifiesto PWA y *service worker* que cachea el esqueleto de la app (Serwist) para que abra sin conexión; clasificación de errores de red como reintentables.
- **No incluye:** cola de escrituras, sincronización, número de ejemplar provisional (fase 2), notificaciones.

## Contrato para el front
### Lecturas
- `useConnection()` → `{ online: boolean; lastSyncedAt: Instant | null }` (`lastSyncedAt` = momento de la última lectura exitosa desde el servidor; persiste entre sesiones).
### Para el resto del back
- `runMutation(fn)`: envoltorio que toda acción usa; si no hay conexión devuelve `err(OFFLINE)` sin ejecutar `fn`; si la red falla a mitad, devuelve `NETWORK_ERROR` con `retryable = true`.

## Reglas (el sistema DEBE…)
- **R1.** CUANDO no hay conexión, toda acción DEBE devolver `OFFLINE` sin escribir nada (BR-GEN-08).
- **R2.** CUANDO no hay conexión, las lecturas DEBEN devolver lo último sincronizado en vez de fallar.
- **R3.** CUANDO vuelve la conexión, el sistema DEBE revalidar todas las lecturas.
- **R4.** Reintentar una acción con los mismos IDs NO DEBE duplicar registros (AF-91; idempotencia de cada HU).
- **R5.** La app instalada DEBE abrir sin conexión y mostrar los datos guardados.

## Criterios de aceptación
- **CA-1.** **Dado** una lista de clientes ya cargada y la red cortada, **cuando** se recarga la app, **entonces** la lista aparece con sus datos y `online = false`.
- **CA-2.** **Dado** la red cortada, **cuando** se intenta cualquier acción (p. ej. crear un cliente), **entonces** devuelve `OFFLINE` y en la base no cambia nada.
- **CA-3.** **Dado** que la última lectura exitosa fue a las 21:40 (Bogotá), **cuando** se corta la red, **entonces** `lastSyncedAt` corresponde a esa hora.
- **CA-4.** **Dado** que vuelve la conexión, **cuando** pasa el evento `online`, **entonces** se revalidan las lecturas y `lastSyncedAt` se actualiza.
- **CA-5.** **Dado** una acción cuya respuesta se pierde por la red, **cuando** se reintenta con los mismos IDs, **entonces** el resultado final es una sola fila.

## Casos borde y errores
- Sesión vencida sin conexión: se siguen leyendo los datos guardados (AF-83, HU-BASE-03).
- Los datos guardados son del usuario actual; al cerrar sesión se borra la caché persistida.

## Datos
Ninguno en la base. Persistencia local en IndexedDB.

## Cómo se verifica
- **Unitarias:** `runMutation` con conexión simulada caída; clasificación de errores.
- **E2E mínima (Playwright, sin UI propia):** carga → corte de red → recarga → lecturas disponibles; acción → `OFFLINE`.

## Terminado cuando
Se cumple §10 de las reglas comunes.
