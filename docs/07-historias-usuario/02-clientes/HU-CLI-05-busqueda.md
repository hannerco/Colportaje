# HU-CLI-05 · Búsqueda de clientes

> **Épica:** Clientes · **Depende de:** HU-CLI-04 · **Reglas:** BR-CUS-07, BR-CUS-14, ADR-0014, OQ-21 · **Diseño:** "Escritorio · sin resultados" ("Nadie coincide con «Hernán Valencia»", "Busqué por nombre, teléfono, información, dirección y libros.", "Buscar en Archivados", "Crear «Hernán Valencia»")

## Historia
**Como** colportor **quiero** buscar un cliente escribiendo parte de su nombre, su teléfono, algo de su información, su dirección o un libro que me compró, aunque escriba con errores o sin tildes, **para** encontrarlo rápido en la calle.

## Contexto
- Búsqueda **local y difusa** (Fuse.js, OQ-21): funciona sin conexión sobre los clientes ya cargados.
- "Libros" = títulos de los ejemplares que el cliente **tiene hoy** (vendidos). No busca por número de ejemplar, categoría, fotos ni emoji (BR-CUS-07).
- Los resultados mezclan activos y prospectos; "Buscar en Archivados" amplía; sin resultados se ofrece "Crear «texto»", que abre Nuevo cliente con ese nombre (BR-CUS-14).

## Alcance
- **Incluye:** índice de búsqueda; función de búsqueda; modelo de "sin resultados" con sus dos salidas; integración con `useCustomerList({ search })`.
- **No incluye:** búsqueda global "⌘K" del sidebar (sin regla, FT-01), filtro por libro (backlog).

## Contrato para el front
### Lecturas
- `useCustomerList({ ..., search, includeArchivedInSearch })` (HU-CLI-04): con `search` no vacío, las filas son los resultados ordenados por relevancia, dentro de la pestaña actual; en Todos incluye siempre los prospectos que coinciden.
- Cuando no hay resultados: `emptySearch: { query, canSearchArchived, createName }`.
- Dominio: `buildSearchIndex(customers, soldTitlesByCustomer)` y `searchCustomers(index, query, { includeArchived })` → `[{ id, score }]`.

## Reglas (el sistema DEBE…)
- **R1.** DEBE buscar en nombre, teléfono (solo dígitos), información, dirección y títulos vendidos actuales (BR-CUS-07).
- **R2.** DEBE tolerar tildes, mayúsculas y errores de escritura dentro del umbral `search.fuzzyThreshold` (que se fija aquí con su prueba).
- **R3.** NO DEBE encontrar por títulos de libros devueltos, números de ejemplar, categoría ni emoji.
- **R4.** Sin `includeArchived`, NO DEBE devolver archivados; con él, solo agrega los archivados.
- **R5.** `createName` DEBE ser el texto buscado sin espacios sobrantes.

## Criterios de aceptación
- **CA-1.** **Dado** "María Gómez", **cuando** se busca "maria gomes", **entonces** aparece (RQ-CUS-04).
- **CA-2.** **Dado** un cliente con teléfono "301 557 9032", **cuando** se busca "5579032", **entonces** aparece.
- **CA-3.** **Dado** un cliente que compró "Un corazón tranquilo", **cuando** se busca "corazon tranquilo", **entonces** aparece; **dado** que lo devolvió, **entonces** ya no aparece por ese título.
- **CA-4.** **Dado** "Hernán Valencia" sin coincidencias, **cuando** se busca, **entonces** `emptySearch = { query: "Hernán Valencia", canSearchArchived: true, createName: "Hernán Valencia" }`.
- **CA-5.** **Dado** un cliente archivado "Rubén Darío Vélez", **cuando** se busca "ruben", **entonces** no aparece; **cuando** se busca con archivados, **entonces** aparece marcado como archivado.
- **CA-6.** **Dado** un prospecto "Carlos Andrés Gómez" con el interruptor de prospectos apagado, **cuando** se busca "carlos", **entonces** aparece.

## Casos borde y errores
- Búsqueda de una sola letra: se permite; el umbral evita ruido excesivo.

## Datos
Sin cambios de esquema.

## Cómo se verifica
- **Dominio:** CA-1 a CA-6 con un conjunto de clientes de prueba (prueba de aceptación que fija el umbral, ARCHITECTURE §1).

## Terminado cuando
Se cumple §10 de las reglas comunes.
