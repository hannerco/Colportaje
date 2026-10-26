# ADR-0003: Offline por fases
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
El colportor trabaja en la calle con señal irregular. Construir offline desde el inicio amplía mucho el alcance y el riesgo. El dueño preguntó cómo se haría sin tener aún la app.

## Decisión
- **Fase 1: PWA online.** Se diseñan desde ya tres reglas que hacen barato el offline después: (1) **IDs UUID generados en el cliente**; (2) toda lectura/escritura pasa por una capa **`repositories`** (la UI nunca habla con Supabase); (3) todo registro lleva **`updated_at`** y **borrado lógico**.
- **Fase 2: offline.** Base local **Dexie/IndexedDB**, **cola de escrituras idempotente**, **cola de fotos**, indicadores de sincronización. Conflictos: **gana la última escritura por registro** (un solo escritor por cuenta).
- iOS no tiene background sync: se sincroniza al abrir la app.

## Alternativas descartadas
- *Offline desde la v1*: duplica la complejidad (sincronización, conflictos, pruebas) antes de validar el producto.
- *CRDT / PowerSync / ElectricSQL*: sobredimensionado para ~10 usuarios de un solo escritor.
- *App nativa*: innecesaria; la PWA cubre Android e iOS ≥ 16.4.

## Consecuencias
- Cambiar a offline solo toca los adaptadores, no las features ni la UI.
- **Pendiente:** numeración de ejemplares offline (OQ-20, ADR-0023).
- Sesión caducada sin conexión: permitir uso local y reautenticar al volver.

## Referencias
ARCHITECTURE.md §7 · RQ-OFF-01 · DECISION-LOG Q2, Q9
