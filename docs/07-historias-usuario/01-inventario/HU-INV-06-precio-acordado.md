# HU-INV-06 · Precio acordado de un ejemplar vendido

> **Épica:** Inventario · **Depende de:** HU-INV-05, HU-ABO-07 · **Reglas:** BR-COPY-07, BR-PRC-01..03, BR-PAY-13 (baja de precio), BR-CUS-16, AF-29, AF-30 · **Diseño:** "Inventario · Ejemplar · vendido" (campo de precio con botón "Restaurar" y precio público tachado)

## Historia
**Como** colportor **quiero** cambiar el precio en que le dejé un libro a un cliente y poder volver al precio público **para** registrar descuentos o aumentos y que su saldo quede bien.

## Contexto
- El precio acordado nace igual al precio público copiado (BR-COPY-06) y se edita **entrando al ejemplar** (BR-COPY-07).
- Bajar el precio puede hacer que los abonos programados del cliente sumen más de lo que debe: entonces se abre **directamente** el modal de abonos que no cuadran (BR-PAY-13, orden "desde el más lejano", motivo `manual`). Subirlo solo aumenta lo "sin programar" (AF-30).

## Alcance
- **Incluye:** editar el precio acordado; restaurarlo al precio público; recalcular la cuenta del cliente; devolver la evaluación de abonos que no cuadran.
- **No incluye:** resolver el sobrante (HU-ABO-07), precio de minibooks.

## Contrato para el front
### Acciones
- `updateAgreedPrice(copyId, price)` → `Result<{ account: CustomerAccount; excess: ExcessEvaluation | null }>` · errores: `COPY_NOT_SOLD`, `VALIDATION` (precio entero ≥ 0), `OFFLINE`.
- `restorePublicPrice(copyId)` → igual que la anterior con el precio público copiado del ejemplar.
- `CustomerAccount` y `ExcessEvaluation` son los de HU-CLI-01 y HU-ABO-07.

## Reglas (el sistema DEBE…)
- **R1.** Solo un ejemplar vendido y que no sea minibook DEBE aceptar precio acordado.
- **R2.** El precio DEBE ser entero ≥ 0; puede ser mayor o menor que el público (BR-COPY-07).
- **R3.** Cada cambio DEBE registrar `price_changed` con precio anterior y nuevo, y actualizar `updated_at` del cliente (BR-CUS-16).
- **R4.** CUANDO el precio baja y lo programado del cliente supera lo que debe, la respuesta DEBE incluir la evaluación con disparador `price_decrease` (presentación `modal`).
- **R5.** CUANDO el precio nuevo es igual al actual, NO DEBE registrarse evento.

## Criterios de aceptación
- **CA-1.** **Dado** un ejemplar a 50.000 (público 50.000) de un cliente que debe 50.000 sin abonos programados, **cuando** se cambia a 45.000, **entonces** la deuda queda en 45.000, diferencia −5.000, y `excess = null`.
- **CA-2.** **Dado** el mismo cliente con 2 abonos programados de 25.000, **cuando** se baja a 30.000, **entonces** `excess` trae sobrante 20.000, orden sugerido "más lejano", presentación `modal`.
- **CA-3.** **Dado** un ejemplar a 93.000 con público 98.000, **cuando** se restaura, **entonces** queda en 98.000 sin diferencia.
- **CA-4.** **Dado** un cliente que pagó 50.000 por un libro de 50.000, **cuando** el precio baja a 40.000, **entonces** su saldo queda en −10.000 (saldo a favor 10.000) (AF-29).
- **CA-5.** **Dado** un ejemplar en físico, **cuando** se intenta cambiar su precio acordado, **entonces** `COPY_NOT_SOLD`.

## Casos borde y errores
- Subir el precio nunca genera `excess`.

## Datos
Función SQL `update_agreed_price(p_copy_id, p_price)` (actualiza, registra evento y toca al cliente en una transacción).

## Cómo se verifica
- **Dominio:** recalculo de la cuenta y evaluación con disparador `price_decrease`.
- **Integración:** CA-1, CA-2, CA-5 y el evento registrado.

## Terminado cuando
Se cumple §10 de las reglas comunes.
