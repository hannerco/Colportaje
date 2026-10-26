# ADR-0025: Devoluciones y saldo a favor, sin reembolsos
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Un cliente puede devolver un libro que ya empezó a pagar, y ese dinero seguramente ya se entregó al líder. No hay forma de reembolsar.

## Decisión
- **Devolver a inventario** deja el ejemplar `in_stock` (sin cliente ni precio) y registra un evento; **no toca** abonos ni Abibonos.
- Si lo pagado excede lo que ahora debe el cliente, el sistema muestra **Saldo a favor** con una nota. **No hay flujo de reembolso**.
- El saldo a favor puede aplicarse **entregando un minibook** (ADR-0011).

## Alternativas descartadas
- *Reembolso en la v1*: "no sé de dónde tendría que sacar esta plata… mejor obviar esta parte".
- *Anular los abonos*: contradice el dinero ya entregado.

## Consecuencias
El modelo "prevé" el caso sin implementar lo que no se puede financiar. Reembolsos quedan en el backlog.

## Referencias
BR-COPY-09, BR-CUS-06, BR-MBK-07 · RQ-INV-07 · DECISION-LOG Q33, Q40, Q46
