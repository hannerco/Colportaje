# HU-INV-02 · Agregar ejemplares al inventario por lote

> **Épica:** Inventario · **Depende de:** HU-INV-01 · **Reglas:** BR-COPY-02/03/04/05, BR-MBK-01, ADR-0043, AF-50, AF-51 · **Diseño:** "Inventario · Agregar · botones con imagen y buscador", "Agregar · fecha pasada", "Agregar · Resumen" (escritorio claro)

## Historia
**Como** colportor que recibe libros del líder **quiero** marcar cuántos recibí de cada título y confirmarlos de una vez **para** registrar el lote rápido y sin errores.

## Contexto
- El diseño cambió la regla anterior (un ejemplar por toque): ahora se **acumula** un lote local y se confirma en un **Resumen** ("Vas a agregar N ejemplares") con "Agregar N" (ronda 26, ADR-0043). Nada se guarda antes. No hay favoritos.
- El chip de fecha ofrece Hoy, Ayer, Anteayer y "Otra fecha…" (nunca futura): sirve cuando no hubo señal o celular el día que llegaron (AF-50).
- En móvil no hay aviso "agregado · Deshacer" por toque: manda el lote.

## Alcance
- **Incluye:** lectura del catálogo para agregar (activos, agrupados y con búsqueda); lógica local del lote (sumar, restar, escribir cantidad, vaciar, resumen por categoría); opciones de fecha; función SQL que crea todo el lote.
- **No incluye:** deshacer después de confirmar (se elimina cada ejemplar, HU-INV-08), favoritos ni orden por "más pedidos" (backlog), recepción desde el líder (fase 3).

## Contrato para el front
### Lecturas
- `useAddCatalog({ search })` → `{ groups: [{ category, titles: [{ id, name, imageUrl }] }] }`: solo títulos **activos**; grupos en orden Culturales, Religiosos, Minibooks; dentro, por nombre (español, sin tildes); los grupos vacíos no aparecen. La búsqueda filtra por nombre normalizado (contiene).
- `receivedDateOptions(today)` → `[{ key: 'today' | 'yesterday' | 'day_before', date }]`.
### Lógica local (dominio puro, sin red)
- `AddBatch`: `increment(titleId)`, `decrement(titleId)` (no baja de 0), `setQuantity(titleId, n)` (entero ≥ 0), `clear()`, `total()`, `summary()` → `{ total, byCategory: { cultural, religious, minibook }, lines: [{ titleId, name, category, quantity }] }` (líneas ordenadas por categoría y nombre).
### Acciones
- `addCopiesBatch({ batchId, receivedAt, lines: [{ titleId, copyIds: uuid[] }] })` → `Result<{ created: [{ copyId, titleId, number }] }>` · errores: `BATCH_EMPTY`, `DATE_IN_FUTURE`, `TITLE_INACTIVE` (`details.titleIds`), `OFFLINE`. Los `copyIds` los genera el cliente (uno por ejemplar) para que reintentar no duplique.

## Reglas (el sistema DEBE…)
- **R1.** Sumar, restar o descartar el lote NO DEBE tocar la base de datos.
- **R2.** CUANDO se confirma, el sistema DEBE crear **todos** los ejemplares del lote o **ninguno** (una sola transacción).
- **R3.** Cada ejemplar creado DEBE quedar `in_stock`, con número consecutivo, `receivedAt` = la fecha del lote, y copia del precio público y del precio colportor **vigentes** del título (BR-COPY-03); y DEBE dejar el evento `received`.
- **R4.** La fecha del lote NO DEBE ser posterior a hoy en Bogotá (BR-COPY-04).
- **R5.** CUANDO algún título del lote ya no está activo al confirmar, el sistema DEBE rechazar todo el lote con `TITLE_INACTIVE`.
- **R6.** CUANDO se reintenta con los mismos `copyIds`, NO DEBE crear duplicados; devuelve los ya creados.

## Criterios de aceptación
- **CA-1.** **Dado** un lote vacío, **cuando** se toca 2 veces "Un corazón tranquilo" y 1 vez "Bebidas saludables", **entonces** `summary()` da total 3, culturales 3, y no existe ningún ejemplar nuevo en la base.
- **CA-2.** **Dado** ese lote con fecha "Hoy" (04/11/2026) y sin ejemplares previos de esos títulos, **cuando** se confirma, **entonces** existen "Un corazón tranquilo" #1 y #2 y "Bebidas saludables" #1, todos `in_stock`, recibidos el 04/11/2026, con los precios del título en ese momento.
- **CA-3.** **Dado** un lote de 18 (3 culturales y 15 minibooks), **cuando** se pide el resumen, **entonces** da culturales 3, religiosos 0, minibooks 15 y total 18.
- **CA-4.** **Dado** un lote con un título desactivado justo antes de confirmar, **cuando** se confirma, **entonces** devuelve `TITLE_INACTIVE` y no se crea ninguno.
- **CA-5.** **Dado** la fecha 05/11/2026 con hoy 04/11/2026, **cuando** se confirma, **entonces** devuelve `DATE_IN_FUTURE`.
- **CA-6.** **Dado** que la respuesta de la confirmación se pierde, **cuando** se reintenta con los mismos `copyIds`, **entonces** siguen existiendo 3 ejemplares, no 6.
- **CA-7.** **Dado** "Ayer" con hoy 04/11/2026, **cuando** se piden las opciones de fecha, **entonces** Ayer = 03/11/2026 y Anteayer = 02/11/2026.
- **CA-8.** **Dado** el precio de un título que cambia de 75.000 a 80.000 después de agregar un ejemplar, **cuando** se lee ese ejemplar, **entonces** conserva 75.000 (BR-TIT-07).

## Casos borde y errores
- `setQuantity(titleId, 0)` quita la línea del resumen.
- Un lote con cantidades enormes por error (p. ej. 500) se permite; el Resumen sirve para revisarlo.

## Datos
Función SQL `add_copies(p_batch_id, p_received_at, p_lines jsonb)`: valida, numera con `next_copy_number`, inserta ejemplares y eventos en una transacción.

## Cómo se verifica
- **Dominio:** `AddBatch` (sumar, restar, no negativos, resumen por categoría, orden de líneas), `receivedDateOptions`.
- **Integración:** CA-2, CA-4, CA-5, CA-6 y CA-8 contra Supabase local.

## Terminado cuando
Se cumple §10 de las reglas comunes.
