# HU-ABO-06 · Cobrar un abono programado

> **Épica:** Abonos · **Depende de:** HU-ABO-07 · **Reglas:** BR-PAY-04/05/07/13, BR-CUS-16, AF-21, AF-22, AF-23 · **Diseño:** "Dinero · Por cobrar · Cobrar (modal)" y "cobro parcial (aviso)" ("Cobrado $30.000 · Faltan $10.000 · Programar"); botón "Cobrar" de la ficha

## Historia
**Como** colportor **quiero** marcar como cobrado un abono, con lo que realmente me pagaron, la fecha y el medio **para** que el saldo del cliente y mi dinero por entregar queden al día.

## Contexto
- Se cobra desde **tres lugares** con el mismo formulario: la ficha, Dinero ▸ Por cobrar y Hoy (este último llega con su módulo) (BR-PAY-05).
- Valores por defecto: el valor acordado, la fecha de hoy y **Transferencia** (ronda 26).
- **Parcial:** si paga menos, el abono queda cobrado con lo pagado y la app **sugiere** programar lo que falta; **nunca** lo crea sola (BR-PAY-07).
- **Mayor:** si paga más, se permite y se evalúan los abonos que no cuadran (modal, AF-21).

## Alcance
- **Incluye:** cobrar un abono programado (vencido o no) con valor, fecha y método.
- **No incluye:** registrar cuotas iniciales o extras (HU-ABO-02), programar lo que falta (HU-ABO-04, el front lo ofrece).

## Contrato para el front
### Acciones
- `collectPayment(paymentId, { paidAmount = acordado, paidAt = hoy, method = 'transfer' })` → `Result<{ account; shortfall: number | null; excess: ExcessEvaluation | null }>` · errores: `PAYMENT_NOT_SCHEDULED`, `VALIDATION` (`paidAmount` entero > 0; `paidAt` no futura), `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** Solo un abono `scheduled` DEBE poder cobrarse; pasa a `collected` con valor real, fecha real y método; su valor y fecha acordados se conservan.
- **R2.** CUANDO `paidAmount < agreedAmount`, `shortfall` DEBE ser la diferencia y NO DEBE crearse ningún abono nuevo (BR-PAY-07).
- **R3.** CUANDO `paidAmount > agreedAmount`, la respuesta DEBE traer la evaluación con disparador `overpayment` si hay sobrante.
- **R4.** Cobrar DEBE actualizar `updated_at` del cliente.
- **R5.** El abono cobrado DEBE empezar a contar en "Por entregar" (Dinero).

## Criterios de aceptación
- **CA-1.** **Dado** un abono de 40.000 de Jhon Fredy Ospina, **cuando** se cobra con los valores por defecto el 05/11, **entonces** queda cobrado por 40.000 el 05/11 por Transferencia.
- **CA-2.** **Dado** un abono de 40.000, **cuando** se cobran 30.000, **entonces** queda cobrado por 30.000, `shortfall = 10.000`, el saldo conserva esos 10.000 y no existe un abono nuevo.
- **CA-3.** **Dado** un abono de 10.000 con otros programados que suman lo que falta, **cuando** se cobran 15.000, **entonces** `excess` trae sobrante 5.000, modal, orden "más próximo" (AF-21).
- **CA-4.** **Dado** una fecha real de ayer, **cuando** se cobra, **entonces** se guarda (AF-23); con fecha de mañana, `VALIDATION`.
- **CA-5.** **Dado** un abono ya cobrado, **cuando** se intenta cobrar, **entonces** `PAYMENT_NOT_SCHEDULED`.

## Casos borde y errores
- Cobrar un abono vencido lo saca de "vencidos" y puede cambiar el estado del cliente de Vencido a Pagando o Saldado.

## Datos
Función SQL `collect_payment(p_payment_id, p_paid_amount, p_paid_at, p_method)`.

## Cómo se verifica
- **Integración:** CA-1 a CA-5.

## Terminado cuando
Se cumple §10 de las reglas comunes.
