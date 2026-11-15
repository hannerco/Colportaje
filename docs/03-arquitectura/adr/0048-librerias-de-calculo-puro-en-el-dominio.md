# ADR-0048: Librerías de cálculo puro en el dominio
Estado: Aceptado · Fecha: 2026-11-15

## Contexto
ARCHITECTURE §2 dice que el dominio no usa "nada externo (solo utilidades puras)" y HU-BASE-01 R1 prohíbe React, Next, Supabase, `fetch` y DOM. La prueba de arquitectura y el lint de capas se hicieron más estrictos: ningún paquete externo. HU-CLI-05 pide la búsqueda difusa con Fuse.js (OQ-21) en el dominio (`buildSearchIndex`, `searchCustomers`), para probar ahí el umbral con los criterios de aceptación.

## Decisión
- El dominio puede importar una **lista cerrada** de librerías de **cálculo puro**: sin red, sin DOM, sin almacenamiento, sin reloj y sin estado global. Hoy la lista es solo **`fuse.js`**.
- La lista vive en dos sitios que deben coincidir: `eslint.layers.mjs` (regla de capas de `domain`) y `tests/architecture/domain-purity.test.ts` (`PURE_PACKAGES`). La prueba de APIs prohibidas (red, DOM, reloj real) sigue aplicando a todo el código del dominio.
- Agregar otra librería exige un ADR que la justifique.

## Alternativas descartadas
- *Fuse.js fuera del dominio (`src/lib`) e inyectado como función:* más piezas sin ganar pureza real, porque Fuse.js ya es cálculo puro.
- *Búsqueda difusa propia:* contradice OQ-21 y obliga a mantener un algoritmo ya resuelto.

## Consecuencias
- `src/domain/customer-search.ts` usa Fuse.js; el umbral (`search.fuzzyThreshold` = 0,3) se fija con su prueba.
- La decisión es del dueño (2026-11-15, al hacer HU-CLI-05).

## Referencias
ARCHITECTURE §2 · HU-BASE-01 R1 · HU-CLI-05 · OQ-21 · ADR-0014 · BR-CUS-07
