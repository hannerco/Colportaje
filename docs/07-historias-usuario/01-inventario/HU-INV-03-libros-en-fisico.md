# HU-INV-03 · Libros en físico y Por resolver

> **Épica:** Inventario · **Depende de:** HU-INV-01 · **Reglas:** BR-INV-03, BR-COPY-10, BR-GOAL-06, BR-MBK-01 · **Diseño:** "Inventario · Libros en físico y Agregar", "un título abierto", "Por resolver (modal)" (escritorio claro)

## Historia
**Como** colportor **quiero** ver cuántos ejemplares tengo de cada libro y cuáles tienen novedad **para** saber qué llevo encima y qué debo aclarar con el líder.

## Contexto
- Junto a cada título va su **precio de referencia** (precio público vigente; en minibooks sin precio público, el colportor). Es una referencia, **no una suma** (ronda 26, BR-INV-03).
- El total junto al título "Libros en físico" **no cuenta minibooks**; los minibooks se listan aparte, al final.
- Los ejemplares `flagged` no cuentan como físicos; se ven en "N por resolver".

## Alcance
- **Incluye:** resumen de libros en físico por título; ejemplares en físico de un título; lista "Por resolver".
- **No incluye:** acciones sobre los ejemplares (HU-INV-05..09), Hacer inventario.

## Contrato para el front
### Lecturas
- `useInStockSummary()` → `{ booksTotal, titles: [{ titleId, name, imageUrl, category, referencePrice, inStockCount }], minibooks: [mismos campos], flaggedCount }`.
  - `titles`: culturales y religiosos con al menos un ejemplar `in_stock`, ordenados por nombre. `minibooks`: igual, aparte. Incluye títulos **desactivados** si aún tienen ejemplares.
  - `booksTotal` = ejemplares `in_stock` que **no** son minibook.
- `useInStockCopiesOfTitle(titleId)` → `{ title: { name, inStockCount, referencePrice }, copies: [{ copyId, number, receivedAt }] }` ordenados por recibido más antiguo y luego número.
- `useFlaggedCopies()` → `[{ copyId, titleName, number, note, flaggedAt }]` ordenados del más antiguo al más reciente (incluye minibooks).

## Reglas (el sistema DEBE…)
- **R1.** El conteo de un título DEBE contar solo ejemplares `in_stock` no borrados (BR-INV-03).
- **R2.** `booksTotal` NO DEBE incluir minibooks.
- **R3.** El precio mostrado por título DEBE ser el precio de referencia vigente; ninguna lectura de esta HU DEBE devolver sumas de dinero (BR-GOAL-06).
- **R4.** Los ejemplares `flagged` NO DEBEN contar en físico y DEBEN aparecer en Por resolver (BR-COPY-10).

## Criterios de aceptación
- **CA-1.** **Dado** 4 "Bebidas saludables" en físico, 3 "Un corazón tranquilo" (uno de ellos con novedad) y 12 minibooks "Esperanza para hoy", **cuando** se pide el resumen, **entonces** Bebidas = 4, Corazón = 2, `booksTotal` = 6, el minibook aparece en `minibooks` con 12 y `flaggedCount` = 1.
- **CA-2.** **Dado** "Bebidas saludables" con precio público 75.000, **cuando** se lee el resumen, **entonces** su `referencePrice` es 75.000 aunque un ejemplar viejo tenga copiado 70.000.
- **CA-3.** **Dado** un título con 0 ejemplares en físico, **cuando** se pide el resumen, **entonces** no aparece.
- **CA-4.** **Dado** "Un corazón tranquilo" con #4 (recibido 18/10), #9 (25/10) y #13 (03/11), **cuando** se abre el título, **entonces** se listan en ese orden.
- **CA-5.** **Dado** un título desactivado con 2 ejemplares en físico, **cuando** se pide el resumen, **entonces** sí aparece con 2.

## Casos borde y errores
- Sin ejemplares: listas vacías y totales en 0 (el front muestra el estado vacío).

## Datos
Sin cambios de esquema; consultas sobre `copy` y `title`.

## Cómo se verifica
- **Dominio:** función que arma el resumen a partir de ejemplares y títulos (CA-1 a CA-5).
- **Integración:** la consulta respeta RLS y excluye borrados.

## Terminado cuando
Se cumple §10 de las reglas comunes.
