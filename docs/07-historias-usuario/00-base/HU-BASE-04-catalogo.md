# HU-BASE-04 · Catálogo de títulos: carga y lectura

> **Épica:** Cimientos · **Depende de:** HU-BASE-02 · **Reglas:** BR-TIT-01..07, BR-INV-03, ADR-0007, DT-10 · **Diseño:** sin pantalla propia (los títulos aparecen en Inventario y en "Agregar libro")

## Historia
**Como** colportor **quiero** que los libros del catálogo ya estén cargados con su categoría y precios **para** poder agregarlos a mi inventario sin escribirlos yo.

## Contexto
- El catálogo es compartido (sin `owner_id`) y solo el admin lo modifica (BR-TIT-01). La pantalla **Catálogo** del admin no está diseñada (ADR-0041): la carga inicial y los ajustes se hacen con un **script idempotente** (BR-TIT-06).
- El identificador visual del título (DT-10: ícono, portada o emoji) **sigue abierto**; el diseño usa un cuadro de imagen. Por ahora solo existe `image_path` (portada opcional).

## Alcance
- **Incluye:** tabla `title` con sus checks y RLS; bucket público `title-images` (lectura pública, escritura admin); script `scripts/load-catalog.ts` que lee un archivo de datos del repositorio (`scripts/data/catalog.json`, lo provee el dueño) y hace *upsert* idempotente; `TitleRepository` de lectura; cálculo del **precio de referencia**.
- **No incluye:** pantalla de Catálogo, ícono o emoji del título, subir portadas desde la app.

## Contrato para el resto del código
- `TitleRepository.listActive()` → títulos activos; `TitleRepository.getMany(ids)` → incluidos los inactivos (para mostrar ejemplares de títulos desactivados).
- Modelo `Title = { id, name, author, description, imageUrl | null, publicPrice | null, colportorPrice, category: 'cultural' | 'religious' | 'minibook', isActive }`.
- Dominio: `referencePrice(title)` = `publicPrice` si existe; si no (minibook sin precio público), `colportorPrice` (BR-INV-03). `CATEGORY_ORDER = ['cultural', 'religious', 'minibook']`.
- Script: `pnpm catalog:load scripts/data/catalog.json`. Cada registro trae un `id` (UUID estable) para que volver a cargar actualice en vez de duplicar.

## Reglas (el sistema DEBE…)
- **R1.** Todo usuario autenticado y activo DEBE poder leer los títulos; solo el admin DEBE poder escribirlos (BR-TIT-01).
- **R2.** CUANDO la categoría no es `minibook`, `publicPrice` DEBE ser > 0; en `minibook` puede ser nulo; `colportorPrice` DEBE ser ≥ 0 (BR-TIT-04).
- **R3.** Un título NO DEBE borrarse: se desactiva (`is_active = false`) (BR-TIT-03).
- **R4.** CUANDO el script se corre dos veces con el mismo archivo, el resultado DEBE ser idéntico (sin duplicados).
- **R5.** Cambiar el precio de un título NO DEBE cambiar ejemplares ya recibidos (BR-TIT-07; los ejemplares copian el precio, HU-INV-01).

## Criterios de aceptación
- **CA-1.** **Dado** un archivo con 3 títulos, **cuando** se corre el script dos veces, **entonces** existen exactamente 3 títulos.
- **CA-2.** **Dado** un registro cultural sin precio público, **cuando** se carga, **entonces** el script falla con un mensaje que nombra el registro y no carga nada de ese archivo.
- **CA-3.** **Dado** un minibook con precio público nulo y precio colportor 1.500, **cuando** se pide su precio de referencia, **entonces** es 1.500; **dado** un cultural con precio público 75.000, **entonces** es 75.000.
- **CA-4.** **Dado** un colportor, **cuando** intenta modificar un título, **entonces** falla por RLS.
- **CA-5.** **Dado** un título desactivado, **cuando** se pide `listActive`, **entonces** no aparece; **cuando** se pide con `getMany`, **entonces** sí.

## Casos borde y errores
- Nombres repetidos entre títulos se permiten (lo que identifica es el `id`).

## Datos
Tabla `title` (DATABASE.md), RLS de lectura para autenticados y escritura con `is_admin()`; bucket `title-images`.

## Cómo se verifica
- **Dominio:** `referencePrice` y validación de un registro del catálogo.
- **Integración:** idempotencia del script, RLS de lectura y escritura, `listActive` frente a `getMany`.

## Terminado cuando
Se cumple §10 de las reglas comunes y el `seed.sql` local trae unos 15 títulos ficticios de las tres categorías (para probar las HU de inventario).
