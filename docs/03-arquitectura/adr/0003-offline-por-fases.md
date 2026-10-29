# ADR-0003: Offline por fases
Estado: Aceptado · Fecha: 2026-10-26 · Revisado: 2026-10-28 (lectura sin conexión en F1)

## Contexto
El colportor trabaja en la calle con señal irregular. Construir escritura offline desde el inicio amplía mucho el alcance y el riesgo. Con un plazo de 14 días no cabe.

## Decisión
- **Fase 1:** PWA online **con lectura sin conexión**: se persiste el caché de lecturas (TanStack Query → IndexedDB) y el service worker cachea el shell. Sin internet la app **abre y permite consultar** lo último sincronizado (clientes, teléfonos, direcciones, Hoy, inventario, abonos). **Registrar o modificar exige conexión**, con mensaje claro y banner persistente.
- Reglas que hacen barato el offline de escritura después: (1) **UUID generados en el cliente**; (2) capa **`repositories`**; (3) **`updated_at`** y **borrado lógico**.
- **Fase 2:** escritura offline con Dexie, **cola idempotente**, **cola de fotos**, indicadores de sincronización. Conflictos: **gana la última escritura por registro**. El **número de ejemplar** será **provisional con marca** y puede cambiar al sincronizar.
- iOS no tiene background sync: se sincroniza al abrir la app.

## Alternativas descartadas
- *Escritura offline en la v1*: duplica complejidad antes de validar.
- *CRDT/PowerSync/ElectricSQL*: sobredimensionado para ~10 usuarios de un solo escritor.
- *App nativa*: innecesaria.

## Consecuencias
Cambiar a offline de escritura solo toca adaptadores. En zonas sin señal el colportor no podrá registrar en la v1 (riesgo aceptado por el dueño).

## Referencias
BR-GEN-08, BR-COPY-05 · RQ-OFF-00, RQ-OFF-01 · AF-90..AF-92 · DECISION-LOG Q2, Q9, Q21
