# HU-DIN-06 · Lista de Abibonos

> **Épica:** Dinero · **Depende de:** HU-DIN-01 · **Reglas:** BR-DEP-11/14, BR-GEN-14 · **Diseño:** "Dinero · Abibonos · lista · ⓘ abierto" (columnas Nombre, Fecha, Total, Efectivo, Transferencia, Estado, Recibo; "Total abonado al líder")

## Historia
**Como** colportor **quiero** ver todas mis entregas al líder con su total, desglose, estado y recibo **para** revisar lo que he entregado en la campaña.

## Contexto
- La vista Abibonos no tiene subvistas (ronda 23). Muestra el **Total abonado al líder** = Σ total de los **confirmados** (BR-DEP-11).
- Búsqueda por nombre y orden por fecha (por defecto, más reciente primero), total y nombre (ronda 26).

## Alcance
- **Incluye:** la lista con conteo, total abonado, búsqueda y orden.
- **No incluye:** el detalle (HU-DIN-04 `useDeposit`).

## Contrato para el front
### Lecturas
- `useDepositsList({ search, sort })` → `{ count, totalDeliveredToLeader, rows: [{ depositId, title, depositDate, total, cash, transfer, status, hasReceipt }] }`; `sort.key`: `'date' | 'total' | 'name'`.

## Reglas (el sistema DEBE…)
- **R1.** La lista DEBE incluir borradores y confirmados (no los borradores borrados).
- **R2.** `totalDeliveredToLeader` DEBE sumar solo confirmados.
- **R3.** `hasReceipt` DEBE ser verdadero si tiene al menos una foto de recibo activa.
- **R4.** La búsqueda DEBE ser por título, sin tildes ni mayúsculas; el orden por fecha desempata por título.

## Criterios de aceptación
- **CA-1.** **Dado** cinco confirmados que suman 1.440.000 y un borrador de 50.000 sin recibo, **entonces** `count = 6`, `totalDeliveredToLeader = 1.440.000` y el borrador tiene `hasReceipt = false`.
- **CA-2.** **Dado** la búsqueda "donacion", **entonces** aparece "Donación campaña".
- **CA-3.** **Dado** el orden por total descendente, **entonces** el de 420.000 va primero.

## Casos borde y errores
- Sin Abibonos: `count = 0` ("Aún no tienes Abibonos", front).

## Datos
Sin cambios de esquema.

## Cómo se verifica
- **Dominio:** función que arma la lista (CA-1 a CA-3).

## Terminado cuando
Se cumple §10 de las reglas comunes.
