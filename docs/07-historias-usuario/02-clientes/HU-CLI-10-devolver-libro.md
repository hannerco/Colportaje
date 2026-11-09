# HU-CLI-10 · Devolver un libro de un cliente guardado

> **Épica:** Clientes · **Depende de:** HU-CLI-09 · **Reglas:** BR-COPY-09, BR-CUS-02/06, BR-PAY-13 (disparador "devolución"), ADR-0025, AF-01..AF-12 · **Diseño:** sin pantalla (`FALTA-CLIENTES.md` FC-06; botón "−" y "Más acciones: devolver libro")

## Historia
**Como** colportor **quiero** registrar que un cliente me devolvió un libro (o que me equivoqué de cliente) **para** que el libro vuelva a mi inventario y su saldo quede bien, sin tocar el dinero que ya cobré o entregué.

## Contexto
- Con el cliente ya guardado, quitar un libro **es una devolución** y se pregunta el **motivo**: *El cliente lo devolvió* (por defecto) o *Me equivoqué de cliente o de registro*; con el segundo no cuenta como devolución en estadísticas (BR-COPY-09, ronda 22).
- **Los abonos cobrados o entregados y los Abibonos no cambian.** Lo pagado de más es **saldo a favor**; no hay reembolsos (ADR-0025).
- Si los abonos programados ya no cuadran, se abre **directamente** el modal (orden "más lejano", motivo `book_returned`).
- Para cambiar un libro de cliente: devolver con *Me equivoqué* y agregarlo al otro cliente (AF-06). No existe "cambiar de cliente".

## Alcance
- **Incluye:** devolver un ejemplar vendido con motivo, desde la ficha o desde el detalle del ejemplar.
- **No incluye:** resolver el sobrante (HU-ABO-07), canjear saldo a favor por minibook (módulo Minibooks).

## Contrato para el front
### Acciones
- `returnCopyFromCustomer(copyId, reason: 'customer_returned' | 'wrong_registration')` → `Result<{ account: CustomerAccount; becameProspect: boolean; excess: ExcessEvaluation | null }>` · errores: `COPY_NOT_SOLD`, `COPY_IS_MINIBOOK`, `OFFLINE`.

## Reglas (el sistema DEBE…)
- **R1.** Solo ejemplares vendidos DEBEN poder devolverse.
- **R2.** El efecto DEBE ser: `in_stock`, sin cliente, sin precio acordado y sin fecha de venta; `received_at` intacto; evento `returned` con el motivo; `updated_at` del cliente; todo en una transacción (BR-COPY-09).
- **R3.** NO DEBE modificar abonos cobrados o entregados ni Abibonos.
- **R4.** La respuesta DEBE traer la evaluación con disparador `return` (presentación `modal`, orden "más lejano", motivo `book_returned`) si hay sobrante.
- **R5.** Las estadísticas de devoluciones DEBEN contar solo el motivo `customer_returned`.

## Criterios de aceptación
- **CA-1.** **Dado** un cliente con un libro de 50.000 sin abonos, **cuando** se devuelve, **entonces** deuda 0 y `becameProspect = true` (AF-01).
- **CA-2.** **Dado** un libro de 50.000 y 30.000 cobrados sin entregar, **cuando** se devuelve, **entonces** saldo a favor 30.000 y esos 30.000 siguen "por entregar" (AF-02).
- **CA-3.** **Dado** esos 30.000 ya en un Abibono confirmado, **cuando** se devuelve, **entonces** el Abibono y los abonos no cambian y hay saldo a favor de 30.000 (AF-03).
- **CA-4.** **Dado** libros de 50.000 y 20.000 y 30.000 pagados, **cuando** se devuelve el de 50.000, **entonces** deuda 20.000 y saldo a favor 10.000 (RQ-INV-07).
- **CA-5.** **Dado** saldo 10.000 tras la devolución y 3 programados de 10.000, **entonces** `excess` tiene sobrante 20.000, presentación `modal`, orden "más lejano" (AF-05).
- **CA-6.** **Dado** un libro vendido con descuento (45.000 sobre 50.000), **cuando** se devuelve, **entonces** el ejemplar ya no tiene precio acordado y, al venderlo de nuevo, vuelve a nacer en 50.000 (AF-07).

## Casos borde y errores
- Devolver el último libro deja al cliente como prospecto, conservando abonos y fotos (AF-09).

## Datos
Función SQL `return_copy_from_customer(p_copy_id, p_reason)` (compartida con HU-CLI-09).

## Cómo se verifica
- **Integración:** CA-1 a CA-6 (casos AF de FLOWS-ALTERNATIVOS §A).

## Terminado cuando
Se cumple §10 de las reglas comunes.
