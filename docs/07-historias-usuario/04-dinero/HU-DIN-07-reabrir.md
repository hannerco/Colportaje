# HU-DIN-07 · Reabrir un Abibono confirmado

> **Épica:** Dinero · **Depende de:** HU-DIN-05 · **Reglas:** BR-DEP-12, BR-PAY-10, BR-AUD-01, AF-06, AF-44, AF-105 · **Diseño:** "Dinero · Abibono confirmado · Reabrir con motivo" (botón discreto "Reabrir" y campo "Motivo")

## Historia
**Como** colportor que se equivocó en un Abibono ya confirmado (por ejemplo, incluyó un abono de otro cliente) **quiero** reabrirlo explicando por qué **para** corregirlo y volver a confirmarlo sin perder el rastro de lo que pasó.

## Contexto
- Reabrir es **discreto** y exige un **motivo** (BR-DEP-12): devuelve el Abibono a borrador y sus abonos a **cobrados** (vuelven a contar como "por entregar", AF-105). Queda en el historial.
- Después se corrige como cualquier borrador (HU-DIN-04) y se confirma de nuevo con las mismas reglas (HU-DIN-05).
- Es el camino para corregir un abono ya entregado registrado al cliente equivocado (AF-06).

## Alcance
- **Incluye:** reabrir con motivo e historial.
- **No incluye:** la corrección y la nueva confirmación (reutilizan HU-DIN-04 y HU-DIN-05).

## Contrato para el front
### Acciones
- `reopenDeposit(depositId, reason)` → `Result<void>` · errores: `REASON_REQUIRED`, `DEPOSIT_NOT_CONFIRMED`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** El motivo DEBE tener texto.
- **R2.** En una transacción: el Abibono DEBE pasar a `draft`; sus abonos de `delivered` a `collected` (siguen vinculados a él); registrar `leader_deposit_event reopened` con el motivo y un `payment_event reopened` por abono.
- **R3.** Solo un Abibono `confirmed` DEBE poder reabrirse.
- **R4.** Sus fotos de recibo DEBEN conservarse; al volver a borrador, se pueden quitar o reemplazar.

## Criterios de aceptación
- **CA-1.** **Dado** "Abibono – 25/10/2026" confirmado con 5 abonos por 380.000, **cuando** se reabre con "Incluí por error el abono de Óscar Iván Mejía", **entonces** queda en borrador, sus 5 abonos vuelven a cobrados y cuentan otra vez en "Por entregar".
- **CA-2.** **Dado** ese borrador, **cuando** se desmarca el abono de Óscar y se confirma de nuevo con recibo y nota por la diferencia, **entonces** queda confirmado con 4 abonos, y el de Óscar sigue cobrado y libre.
- **CA-3.** **Dado** un motivo vacío, **cuando** se reabre, **entonces** `REASON_REQUIRED` y nada cambia.
- **CA-4.** **Dado** un borrador, **cuando** se intenta reabrir, **entonces** `DEPOSIT_NOT_CONFIRMED`.
- **CA-5.** **Dado** el Abibono reabierto y confirmado de nuevo, **cuando** se lee su historial, **entonces** tiene, en orden: confirmado, reabierto (con el motivo), confirmado.

## Casos borde y errores
- Reabrir dos veces seguidas: la segunda devuelve `DEPOSIT_NOT_CONFIRMED`.

## Datos
Función SQL `reopen_leader_deposit(p_deposit_id, p_reason)` (la única que puede pasar abonos de `delivered` a `collected`).

## Cómo se verifica
- **Integración:** CA-1 a CA-5.

## Terminado cuando
Se cumple §10 de las reglas comunes.
