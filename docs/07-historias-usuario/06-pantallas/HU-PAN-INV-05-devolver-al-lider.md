# HU-PAN-INV-05 · Devolver al líder

> **Iteración 1** · **Nivel:** pantalla · **Código:** `ReturnToLeaderScreen` en `src/features/inventory/screens/` · **Storybook:** `Pantallas/Inventario/Devolver al líder` · **Depende de:** HU-PAN-INV-01 · **Back:** HU-INV-09 · **Diseño:** sección «5 · Devolver al líder» (escritorio: Inv-d-devolver-modal, -devolver-angosto, -angosto-minibooks, -angosto-resumen; móvil: Inv-m-devolver, -devolver-sesion, -devolver-nota, -devolver-resumen) · **Reglas:** BR-COPY-16, ADR-0043

## Historia
**Como** colportor **quiero** elegir los ejemplares que le devuelvo al líder, agregar una nota y confirmar, con la opción de deshacer, **para** que mi inventario quede igual a la maleta.

## Contrato que usa
`useReturnToLeaderCandidates`, `returnSelectionSummary` (puro) y `useReturnToLeader` (devolver y deshacer).

## Pantalla
- **Escritorio:** modal con cada ejemplar por título y casillas. El lienzo trae dos variantes, «modal» y «angosta, sin categorías»: **se usa la angosta**, que es la que tiene minibooks y resumen completos, salvo que el dueño diga otra.
- **Móvil:** pantalla con los ejemplares a elegir → «Siguiente: nota» → «Listo: resumen con la nota».
- Al confirmar: Aviso con «Deshacer».

## Estados (stories)
Eligiendo · Minibooks abierto · Nota · Resumen · Devolviendo · Sin conexión.

## Criterios de aceptación
- **CA-1.** **Dado** que elijo 2 ejemplares de «Psiconutrición» y 1 minibook, **entonces** el resumen dice 3 y los lista con la nota.
- **CA-2.** **Dado** la devolución confirmada, **cuando** pulso «Deshacer», **entonces** los 3 vuelven a En físico.
- **CA-3.** **Dado** ningún ejemplar elegido, **entonces** «Siguiente» está deshabilitado.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Devolver al líder en lote y deshacer» (TESTING.md, flujo 15) pasa.
