# HU-DIN-01 · Abibono: modelo, cuadre y bloqueos

> **Épica:** Dinero · **Depende de:** HU-ABO-01, HU-BASE-05 · **Reglas:** BR-DEP-01..09/11/12, BR-PAY-09/10, BR-PHO-03, ADR-0010, ADR-0022, ADR-0041 · **Diseño:** "Dinero · Abibono confirmado", "Nuevo Abibono" (bloques Efectivo / Transferencia / Total y Esperado / Entregado / Diferencia)

## Historia
**Como** colportor que le entrega dinero al líder **quiero** que cada entrega (Abibono) compare lo que debía entregar con lo que realmente entregué **para** que cualquier faltante o sobrante quede explicado y el dinero entregado no se pueda alterar por error.

## Contexto
- Un **Abibono** ("Entrega al líder") agrupa abonos **cobrados** y registra el efectivo y la transferencia realmente entregados, con foto del recibo obligatoria (BR-DEP-01/09).
- **Esperado** = suma de lo que se entrega; **Total** = efectivo + transferencia (derivado); **Diferencia** = total − esperado (+ sobrante, − faltante) (BR-DEP-04/05).
- El esperado se calcula como **suma de aportes**: hoy solo abonos; mañana se sumará el dinero de minibooks sin reescribir el cálculo (ADR-0041).
- Al confirmar, los abonos pasan a **entregados** y quedan **bloqueados** (BR-PAY-10).

## Alcance
- **Incluye:** tablas `leader_deposit` y `leader_deposit_event` con RLS; columna `payment.leader_deposit_id` (migración aditiva); columna `photo.leader_deposit_id` con su check; triggers de bloqueo; cálculos del cuadre; número consecutivo y nombre automático.
- **No incluye:** las acciones (HU-DIN-04, 05, 07), las listas (HU-DIN-02, 03, 06), asignaciones de minibooks (módulo Minibooks).

## Contrato para el resto del código
- Dominio `LeaderDeposit = { id, title: string | null (null = automático), depositNumber: number | null, depositDate, cashAmount, transferAmount, note, status: 'draft' | 'confirmed', confirmedAt }`.
- `depositContributions(linkedPayments)` → `[{ source: 'payment', id, amount, method }]` (punto de extensión para minibooks).
- `depositSummary(deposit, contributions)` → `{ total, expected, difference }`.
- `autoAmounts(contributions)` → `{ cash, transfer }` sumando por método (BR-DEP-04).
- `confirmBlockers(deposit, contributions, receiptCount)` → lista de motivos: `NO_RECEIPT`, `TOTAL_ZERO`, `NOTE_REQUIRED` (diferencia ≠ 0 sin nota).
- `nextDepositNumber(assignedNumbers)` → el mayor número asignado + 1 (1 si no hay ninguno). No depende de los nombres (BR-DEP-02).
- `depositDisplayTitle(deposit, nextNumber)` → `deposit.title` si el usuario escribió uno; si no, `Abibono (n)` con `n = deposit.depositNumber` o, en un borrador sin número, `nextNumber`.

## Reglas (el sistema DEBE…)
- **R1.** `total` y `difference` NO DEBEN guardarse; `cash_amount` y `transfer_amount` sí (lo realmente entregado, enteros ≥ 0).
- **R2.** Un abono DEBE estar en **un solo** Abibono a la vez (BR-DEP-08); solo abonos `collected` pueden vincularse (BR-PAY-09).
- **R3.** Un abono `delivered` NO DEBE poder editarse ni borrarse (trigger), salvo por la función de reabrir (HU-DIN-07).
- **R4.** Un Abibono `confirmed` NO DEBE cambiar título, fecha, montos ni abonos (trigger); solo la **nota** y **agregar fotos** (BR-DEP-12).
- **R5.** Las fotos de recibo de un Abibono confirmado NO DEBEN borrarse (BR-PHO-03).
- **R7.** `deposit_number` DEBE asignarse **solo al confirmar por primera vez**, ser único por colportor y NO DEBE cambiar ni reutilizarse nunca (BR-DEP-02). Un borrador nuevo NO DEBE consumir número. Renombrar NO DEBE afectar la secuencia.
- **R6.** `status = delivered` en un abono DEBE ir siempre con su Abibono `confirmed`, y viceversa.

## Criterios de aceptación
- **CA-1.** **Dado** abonos de 40.000 (efectivo), 60.000 (transferencia), 85.000 (efectivo), 105.000 (efectivo) y 45.000 (transferencia), **entonces** `autoAmounts` = efectivo 230.000 y transferencia 105.000, y el esperado es 335.000.
- **CA-2.** **Dado** esperado 341.000 y entregado 236.000 + 100.000, **entonces** total 336.000 y diferencia −5.000; `confirmBlockers` incluye `NOTE_REQUIRED` si no hay nota.
- **CA-3.** **Dado** dos Abibonos confirmados (números 1 y 2) y dos borradores sin título propio, **cuando** se pide el nombre que se muestra de cada borrador, **entonces** ambos muestran "Abibono (3)" (los borradores no consumen número).
- **CA-3b.** **Dado** confirmados con números 1, 2 y 3, y el 2 renombrado "Entrega de octubre", **cuando** se pide `nextDepositNumber`, **entonces** es 4 y el 2 conserva su número.
- **CA-4.** **Dado** un abono entregado, **cuando** se intenta cambiar su valor por la API, **entonces** la base lo rechaza.
- **CA-5.** **Dado** un Abibono confirmado, **cuando** se intenta cambiar su efectivo, **entonces** se rechaza; **cuando** se cambia su nota, **entonces** se guarda.
- **CA-6.** **Dado** un abono vinculado a un Abibono, **cuando** se intenta vincular a otro, **entonces** se rechaza.

## Casos borde y errores
- Un Abibono sin abonos (donación) tiene esperado 0 (BR-DEP-07).

## Datos
`leader_deposit`, `leader_deposit_event` (DATABASE.md); migraciones aditivas `payment.leader_deposit_id` y `photo.leader_deposit_id` (con el check "`deposit_receipt` exige `leader_deposit_id`"); triggers de bloqueo.

## Cómo se verifica
- **Dominio:** CA-1 a CA-3b y `confirmBlockers`.
- **Integración:** CA-4 a CA-6 y RLS A/B.

## Terminado cuando
Se cumple §10 de las reglas comunes.
