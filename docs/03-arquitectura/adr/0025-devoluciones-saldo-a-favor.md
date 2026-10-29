# ADR-0025: Devoluciones, saldo a favor y sin reembolsos
Estado: Aceptado · Fecha: 2026-10-26 · Revisado: 2026-10-28

## Contexto
Un cliente puede devolver un libro que ya empezó a pagar, y ese dinero seguramente ya se entregó al líder. No hay forma de reembolsar. Los abonos programados de ese libro no se van a pagar y no deben contar como dinero en la calle. A veces el colportor también se equivoca de cliente al registrar un libro.

## Decisión
- Una sola acción **"Devolver a inventario"** (también para "quitar de un cliente") con **motivo**: *El cliente lo devolvió* o *Me equivoqué de cliente / de registro* (este no cuenta como devolución en estadísticas). No existe "cambiar de cliente".
- El ejemplar vuelve a `in_stock` **conservando `received_at`** (misma antigüedad); pierde cliente, precio y fecha de venta.
- **No toca** abonos cobrados ni Abibonos.
- Los abonos **programados** se revisan con la **alerta de abonos que no cuadran** (ADR-0009): recorte sugerido desde el más lejano; los cancelados se conservan.
- Si lo pagado excede lo que ahora debe, aparece **Saldo a favor** con nota; **sin flujo de reembolso**; se puede canjear por un **minibook** (ADR-0011), con tope en el saldo a favor.
- Un cliente sin libros vuelve a ser prospecto, conservando su historial.

## Alternativas descartadas
- *Reembolso en la v1*: "no sé de dónde tendría que sacar esta plata… mejor obviar esta parte".
- *Anular los abonos cobrados*: contradice el dinero ya entregado.
- *Cambiar de cliente directamente*: el dueño prefiere quitar y volver a agregar, que ya cambia el estado del ejemplar.

## Consecuencias
Todos los casos están documentados en `01-negocio/FLOWS-ALTERNATIVOS.md` A (AF-01..AF-12) y cubiertos por pruebas.

## Referencias
BR-COPY-09, BR-PAY-13, BR-CUS-06, BR-MBK-07 · RQ-INV-07 · DECISION-LOG Q4, Q22, Q23, Q33, Q35, Q40, Q46
