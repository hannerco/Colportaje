# HU-DIN-02 · Resumen de Dinero

> **Épica:** Dinero · **Depende de:** HU-DIN-01, HU-CLI-01 · **Reglas:** BR-DEP-11/14, BR-CAL-08 (reglas de "Por entregar"), BR-GOAL-03, ADR-0046, AF-105 · **Diseño:** "Dinero · Exploración elegida · Por entregar (Cobrado) y Dinero total en una sola tarjeta"; "Dinero · Por cobrar · lista Sin programar"

## Historia
**Como** colportor en el cuadre de la noche **quiero** ver cuánto tengo por entregar (en efectivo y transferencia), cuánto ya entregué, cuánto está por cobrar y el total **para** saber qué le debo llevar al líder y cómo va la campaña.

## Contexto
- La exploración elegida (ronda 26) muestra: tarjeta **Por entregar (Cobrado)** con efectivo y transferencia y el botón "Entregar al líder"; un **medidor** con el % entregado; tres tarjetas **Entregado / Cobrado / Por cobrar** con monto y %; y **Dinero total**.
- **Dinero total** = suma de los abonos **no cancelados** (entregado + cobrado + programado); **no** incluye lo sin programar. Es la base de los porcentajes (ADR-0046).
- **Por cobrar** (la tarjeta) = **programado**: la suma literal de los valores acordados por cobrar, aunque un cliente tenga programado de más (ronda 26).
- **Por entregar** cuenta los cobrados aunque estén en un Abibono **borrador**; deja de contarlos al confirmar y vuelve a contarlos al reabrir (AF-105). Excluye cancelados (y el dinero de minibooks, que aún no existe).

## Alcance
- **Incluye:** el resumen; la lista "Sin programar · N clientes".
- **No incluye:** la lista de abonos (HU-DIN-03), Hoy.

## Contrato para el front
### Lecturas
- `useMoneySummary()` →
  `{ toDeliver: { total, cash, transfer }, delivered: { amount, pct }, collected: { amount, pct }, toCollect: { amount, pct }, moneyTotal, deliveredPct, scheduledTotal, unscheduledTotal, unscheduledCustomers, totalDeliveredToLeader }`
- `useUnscheduledCustomers()` → `[{ customerId, name, avatarEmoji, unscheduled }]` ordenados por monto descendente.
- Dominio `computeMoneySummary(payments, accounts, deposits)` y `percentagesSummingTo100(amounts)`.

## Reglas (el sistema DEBE…)
- **R1.** `delivered.amount` = Σ valor real de abonos entregados; `collected.amount` = Σ valor real de cobrados (incluidos los de borradores); `toCollect.amount` = Σ valor acordado de por cobrar; cancelados y borrados nunca cuentan.
- **R2.** `moneyTotal` = suma de los tres; los porcentajes DEBEN ser enteros que sumen 100 (método del resto mayor); con `moneyTotal = 0`, todos 0.
- **R3.** `toDeliver` DEBE ser igual a `collected`, desglosado por método.
- **R4.** `unscheduledTotal` = Σ lo sin programar de cada cliente; `unscheduledCustomers` = cuántos clientes tienen sin programar > 0.
- **R5.** `totalDeliveredToLeader` = Σ total (efectivo + transferencia) de Abibonos **confirmados** (BR-DEP-11).
- **R6.** Los abonos de clientes **archivados** DEBEN contar; los de clientes **descartados**, no.

## Criterios de aceptación
- **CA-1.** **Dado** entregado 1.420.000, cobrado 385.000 (efectivo 280.000, transferencia 105.000) y por cobrar 935.000, **entonces** `moneyTotal` 2.740.000, porcentajes 52 / 14 / 34 y `toDeliver` 385.000 (280.000 + 105.000).
- **CA-2.** **Dado** un abono cobrado de 50.000 en un Abibono borrador, **entonces** cuenta en `toDeliver`; **cuando** el Abibono se confirma, **entonces** pasa a `delivered`.
- **CA-3.** **Dado** un abono cancelado de 50.000, **entonces** no cuenta en ningún valor.
- **CA-4.** **Dado** 4 clientes con sin programar 120.000, 90.000, 80.000 y 50.000, **entonces** `unscheduledTotal` 340.000, `unscheduledCustomers` 4 y la lista en ese orden.
- **CA-5.** **Dado** un cliente que debe 20.000 con programados por 40.000, **entonces** aporta 40.000 a `toCollect` y 0 a `unscheduledTotal`.
- **CA-6.** **Dado** Abibonos confirmados por 380.000, 420.000, 310.000, 20.000 y 310.000, y un borrador de 50.000, **entonces** `totalDeliveredToLeader` 1.440.000.

## Casos borde y errores
- Sin abonos: todo en 0 ("Nada por entregar" lo muestra el front).

## Datos
Sin cambios de esquema.

## Cómo se verifica
- **Dominio:** CA-1 a CA-6 y la propiedad "los porcentajes siempre suman 100 (o todos 0)".

## Terminado cuando
Se cumple §10 de las reglas comunes.
