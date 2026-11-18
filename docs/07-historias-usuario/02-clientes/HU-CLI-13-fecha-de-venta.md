# HU-CLI-13 · Fecha de venta del libro editable

> **Épica:** Clientes · **Depende de:** HU-CLI-09, HU-INV-05 · **Reglas:** BR-GEN-16, BR-COPY-06, BR-CUS-04, ADR-0049, AF-50 · **Diseño:** sin pantalla nueva: reutiliza el chip de fecha de «Agregar · fecha pasada» (INV-02) en «Agregar libro» de la ficha, y la propiedad en línea «Recibido el» del detalle del ejemplar (INV-05) para «Vendido el»

## Historia
**Como** colportor que empieza a usar la app con la campaña ya iniciada **quiero** decir en qué fecha vendí cada libro, y poder cambiarla después, **para** que mi historial y la fecha «Cliente desde» reflejen lo que realmente pasó.

## Contexto
- Hoy `sold_at` es siempre «ahora» (HU-CLI-09 R2). Esta HU **no edita** esa HU: la amplía con una migración nueva (ADR-0049).
- Es el mismo patrón de `received_at`: chip **Hoy ▾** (Hoy, Ayer, Anteayer u «Otra fecha…», nunca futura) y edición discreta en línea después, con historial.
- «Cliente desde» (`customer_since`) es la **primera** fecha de venta; el orden por fecha de venta y la fila «fecha(s) de venta» de la ficha usan `sold_at`.
- El campo `sold_at` es `timestamptz`. **Interpretación (I-32):** cuando el día elegido es hoy se guarda el instante actual; si es otro día, las 12:00 del día elegido en America/Bogota. Todas las comparaciones por día se hacen en Bogotá.

## Alcance
- **Incluye:** elegir la fecha de venta al asignar un ejemplar a un cliente; editar la fecha de venta de un ejemplar vendido; evento en el historial; que las lecturas existentes usen esa fecha.
- **No incluye:** la pantalla (la hace el front con las piezas existentes), minibooks (tienen su propia fecha, BR-MBK-02), la fecha de recibido (ya es editable, HU-INV-05).

## Contrato para el front
### Acciones
- `assignCopyToCustomer(copyId, customerId, { soldOn? })` → igual que HU-CLI-09; `soldOn` es una fecha (Bogotá), por defecto hoy. Errores nuevos: `SOLD_IN_FUTURE`, `SOLD_BEFORE_RECEIVED`.
- `updateSoldAt(copyId, soldOn)` → `Result<{ account: CustomerAccount }>` · errores: `COPY_NOT_SOLD`, `COPY_IS_MINIBOOK`, `SOLD_IN_FUTURE`, `SOLD_BEFORE_RECEIVED`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** CUANDO se asigna un ejemplar con `soldOn`, el sistema DEBE guardar esa fecha como `sold_at` (BR-COPY-06 ajustada). Sin `soldOn`, es hoy.
- **R2.** `sold_at` NO DEBE ser un día futuro ni anterior al día de `received_at` (comparación por día en Bogotá). Se valida en el trigger del ejemplar, en toda escritura (como ya se hace con `received_at`).
- **R3.** Cambiar `sold_at` DEBE registrar un evento `sold_at_changed` con la fecha anterior y la nueva, y mover la última modificación del cliente (BR-CUS-16).
- **R4.** Cambiar `sold_at` NO DEBE cambiar el precio acordado, el estado ni los abonos.
- **R5.** CUANDO se edita `received_at` (HU-INV-05), la validación «no posterior a la venta» DEBE usar el `sold_at` nuevo.
- **R6.** `customer_since` y los órdenes por fecha de venta DEBEN usar el `sold_at` guardado (no `created_at`).

## Criterios de aceptación
- **CA-1.** **Dado** un ejemplar recibido el 28/10 y hoy 16/11, **cuando** se asigna a Natalia con `soldOn = 05/11`, **entonces** `sold_at` es el 05/11 (Bogotá) y «Cliente desde» de Natalia es 05/11.
- **CA-2.** **Dado** ese ejemplar vendido el 05/11, **cuando** se cambia a 03/11, **entonces** se guarda y el historial tiene `sold_at_changed` (05/11 → 03/11).
- **CA-3.** **Dado** un ejemplar recibido el 28/10, **cuando** se intenta vender el 25/10, **entonces** `SOLD_BEFORE_RECEIVED`.
- **CA-4.** **Dado** hoy 16/11, **cuando** se intenta vender el 17/11, **entonces** `SOLD_IN_FUTURE`.
- **CA-5.** **Dado** Natalia con dos libros vendidos el 10/11 y el 05/11, **entonces** «Cliente desde» es 05/11 y, si el del 05/11 pasa al 12/11, «Cliente desde» pasa a 10/11.
- **CA-6.** **Dado** un ejemplar vendido el 05/11, **cuando** se intenta editar su recibido al 06/11, **entonces** se rechaza (posterior a la venta).
- **CA-7.** **Dado** un ejemplar en físico o un minibook, **cuando** se llama `updateSoldAt`, **entonces** `COPY_NOT_SOLD` / `COPY_IS_MINIBOOK`.

## Casos borde y errores
- Dos personas cambian la fecha a la vez: gana la última escritura y quedan ambos eventos.
- Un ejemplar devuelto al inventario conserva `received_at` y pierde `sold_at` (BR-COPY-08, sin cambio).

## Datos
Migración nueva: función `assign_copy_to_customer` con parámetro `p_sold_on date default null`; función `update_sold_at(p_copy_id, p_sold_on)`; tipo de evento `sold_at_changed`; el trigger del ejemplar valida `sold_at` (R2).

## Cómo se verifica
- **Dominio:** `validateSoldAt(soldOn, receivedAt, today)` y el cálculo del instante guardado (I-32).
- **Integración:** CA-1 a CA-7 y la concurrencia.

## Terminado cuando
Se cumple §10 de las reglas comunes.
