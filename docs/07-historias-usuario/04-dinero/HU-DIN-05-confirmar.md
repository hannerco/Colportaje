# HU-DIN-05 · Confirmar un Abibono

> **Épica:** Dinero · **Depende de:** HU-DIN-04 · **Reglas:** BR-DEP-05/06/07/09/12, BR-PAY-10, BR-PHO-03, AF-40, AF-41, AF-45, AF-92 · **Diseño:** "Dinero · Nuevo Abibono · listo para confirmar", "Abibono confirmado" (nota editable y "Añadir foto")

## Historia
**Como** colportor que ya entregó el dinero **quiero** confirmar el Abibono con la foto del recibo **para** que esos abonos queden como entregados al líder y nadie los pueda alterar.

## Contexto
- Para confirmar se exige: **al menos una foto de recibo**, **total > 0** y **nota** si la diferencia no es 0 ("me faltaron $5.000", "incluí una donación de $20.000") (BR-DEP-06/09).
- Se puede confirmar **directamente desde Nuevo Abibono** sin haber guardado antes un borrador: guardar y confirmar ocurren en la misma operación.
- Un Abibono **sin abonos** (donación) es válido: esperado 0, por eso exige nota (BR-DEP-07).
- Ya confirmado, solo se puede **editar la nota** y **agregar fotos** (BR-DEP-12).

## Alcance
- **Incluye:** confirmar (desde un borrador o desde la propuesta); editar la nota y agregar fotos a un confirmado.
- **No incluye:** reabrir (HU-DIN-07).

## Contrato para el front
### Acciones
- `confirmDeposit({ depositId, title (string | null), depositDate, paymentIds, cash, transfer, note, stagedReceipts })` → `Result<{ depositId }>` · errores: `NO_RECEIPT`, `TOTAL_ZERO`, `NOTE_REQUIRED`, `PAYMENT_NOT_AVAILABLE`, `DEPOSIT_NOT_DRAFT`, `OFFLINE`. (Desde una propuesta sin guardar, las fotos llegan como `stagedReceipts` de `addDepositReceipt`, HU-DIN-04; desde un borrador, ya están guardadas.)
- `updateDepositNote(depositId, note)` → `Result<void>` (borrador o confirmado; en confirmado no puede quedar vacía si la diferencia ≠ 0).
- `addDepositReceipt` (HU-DIN-04) también funciona en un confirmado.

## Reglas (el sistema DEBE…)
- **R1.** Confirmar DEBE, en una transacción: guardar el borrador con los datos enviados (creándolo si no existía, junto con las filas de sus `stagedReceipts`), validar los bloqueos (`confirmBlockers`, HU-DIN-01), pasar el Abibono a `confirmed` con `confirmed_at`, pasar sus abonos a `delivered` y registrar `leader_deposit_event confirmed`.
- **R6.** CUANDO se confirma **por primera vez**, el sistema DEBE asignar `deposit_number = mayor número del colportor + 1` en la misma transacción y de forma atómica (dos confirmaciones simultáneas NO DEBEN obtener el mismo número). Un Abibono reabierto conserva su número al confirmarse otra vez (BR-DEP-02).
- **R2.** CUANDO falla cualquier validación, NO DEBE cambiar nada.
- **R3.** Los abonos DEBEN seguir `collected` y ser de este Abibono o libres al momento de confirmar; si no, `PAYMENT_NOT_AVAILABLE`.
- **R4.** Un recibo cuya subida falló NO cuenta: sin fila `photo` activa no hay recibo (AF-92).
- **R5.** En un confirmado, solo nota y fotos nuevas DEBEN poder cambiar; no se pueden borrar recibos.

## Criterios de aceptación
- **CA-1.** **Dado** abonos por 100.000 y entregado 95.000 sin nota, **cuando** se confirma, **entonces** `NOTE_REQUIRED` (diferencia −5.000) (RQ-DEP-03).
- **CA-2.** **Dado** lo mismo con nota "Me faltaron $5.000" y sin foto, **entonces** `NO_RECEIPT`.
- **CA-3.** **Dado** lo mismo con nota y una foto, **cuando** se confirma, **entonces** el Abibono queda confirmado, los abonos entregados y bloqueados, y dejan de estar "por entregar".
- **CA-4.** **Dado** una donación de 20.000 en efectivo, sin abonos, con nota y foto, **cuando** se confirma, **entonces** queda confirmada con esperado 0 y diferencia +20.000 (AF-40).
- **CA-5.** **Dado** efectivo 0 y transferencia 0, **cuando** se confirma, **entonces** `TOTAL_ZERO`.
- **CA-6.** **Dado** un Abibono confirmado, **cuando** se agrega otra foto o se cambia la nota, **entonces** se guarda; **cuando** se intenta borrar un recibo, **entonces** `RECEIPT_LOCKED`.
- **CA-7.** **Dado** una confirmación directa desde la propuesta (sin borrador previo, con la foto ya subida), **cuando** se confirma, **entonces** queda un solo Abibono confirmado.

- **CA-8.** **Dado** dos borradores A y B sin título propio, ambos mostrados como "Abibono (1)", **cuando** se confirma B y después A, **entonces** B es "Abibono (1)" y A pasa a ser "Abibono (2)".
- **CA-9.** **Dado** un borrador con el título "Entrega de Navidad", **cuando** se confirma como el tercero, **entonces** conserva su nombre, recibe el número 3 y el siguiente nuevo se muestra como "Abibono (4)".
- **CA-10.** **Dado** una confirmación que falla (sin recibo), **cuando** se reintenta con éxito, **entonces** no se pierde ni se salta ningún número (la secuencia sigue sin huecos).

## Casos borde y errores
- Confirmar dos veces el mismo Abibono devuelve `DEPOSIT_NOT_DRAFT` sin efectos.

## Datos
Función SQL `confirm_leader_deposit(p_deposit jsonb)`.

## Cómo se verifica
- **Integración:** CA-1 a CA-10, incluido el "todo o nada".

## Terminado cuando
Se cumple §10 de las reglas comunes.
