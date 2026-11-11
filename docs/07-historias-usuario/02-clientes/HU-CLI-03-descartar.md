# HU-CLI-03 · Descartar un cliente recién creado

> **Épica:** Clientes · **Depende de:** HU-CLI-09, HU-ABO-02, HU-DIN-01 · **Reglas:** BR-CUS-14, BR-GEN-02, BR-COPY-09 (AF-114), ADR-0038, AF-112 · **Diseño:** sin pantalla (`04-diseno/pendientes/FALTA-CLIENTES.md` FC-01)

## Historia
**Como** colportor **quiero** descartar un cliente que estaba creando por error **para** que desaparezca y sus libros vuelvan a mi inventario sin dejar rastros en mis cuentas.

## Contexto
- "Descartar" existe **solo durante la creación**; salir de la creación de cualquier forma sin "Guardar cliente" equivale a descartar (ronda 24). La base **no** sabe si el cliente está en creación: el front decide cuándo llamar (ADR-0038).
- Es un **borrado lógico y atómico** del cliente, sus abonos, facturas y fotos; los libros vuelven a físico (ronda 24).
- **Excepción (ronda 26):** si algún abono ya está en un Abibono (borrador o confirmado, p. ej. desde otro dispositivo), el descarte se **rechaza** y el cliente queda guardado.

## Alcance
- **Incluye:** resumen de lo que se perderá; descartar.
- **No incluye:** archivar (HU-CLI-11), la confirmación visual.

## Contrato para el front
### Lecturas
- `getDiscardSummary(customerId)` → `{ books, payments, invoices, photos, blockedByDeposit }` (cantidades para "Se quitarán 2 libros y 1 abono").
### Acciones
- `discardNewCustomer(customerId)` → `Result<void>` · errores: `CUSTOMER_DISCARD_BLOCKED`, `NOT_FOUND`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** CUANDO algún abono del cliente tiene Abibono, DEBE rechazar con `CUSTOMER_DISCARD_BLOCKED` sin cambiar nada.
- **R2.** En otro caso, en **una transacción**: cada ejemplar vendido al cliente DEBE volver a `in_stock` (sin cliente, precio acordado ni fecha de venta; `received_at` intacto) registrando `returned` con motivo `wrong_registration`; abonos, facturas y fotos DEBEN quedar con `deleted_at`; y el cliente también.
- **R3.** Un cliente descartado NO DEBE aparecer en ninguna lectura (listas, búsqueda, Dinero).
- **R4.** Los libros devueltos NO DEBEN contar como devolución en estadísticas (motivo `wrong_registration`, AF-114).

## Criterios de aceptación
- **CA-1.** **Dado** un cliente nuevo con 2 libros, 1 cuota inicial y 1 foto, **cuando** se pide el resumen, **entonces** `{ books: 2, payments: 1, invoices: 0, photos: 1, blockedByDeposit: false }`.
- **CA-2.** **Dado** ese cliente, **cuando** se descarta, **entonces** los 2 ejemplares están en físico con su fecha de recibido original, y ni el cliente ni su cuota aparecen en Clientes ni en Dinero.
- **CA-3.** **Dado** su cuota inicial incluida en un Abibono borrador, **cuando** se descarta, **entonces** `CUSTOMER_DISCARD_BLOCKED` y nada cambia.
- **CA-4.** **Dado** un cliente solo con nombre, **cuando** se descarta, **entonces** desaparece y el resumen había sido todo en 0.
- **CA-5.** **Dado** un fallo a mitad (simulado), **cuando** termina, **entonces** no cambió nada (todo o nada).

## Casos borde y errores
- Descartar dos veces devuelve `NOT_FOUND`.

## Datos
Función SQL `discard_new_customer(p_customer_id)`.

## Cómo se verifica
- **Integración:** CA-1 a CA-5.

## Terminado cuando
Se cumple §10 de las reglas comunes.
