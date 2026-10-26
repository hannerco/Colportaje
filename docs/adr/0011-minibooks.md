# ADR-0011: Minibooks
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Los minibooks son libros pequeños que se ofrecen cuando un cliente rechaza uno grande. Se pagan de contado, sin cliente, a precio libre (~1.500 el precio colportor o gratis). El líder hace firmar su recepción, así que tienen inventario físico. Su dinero es inestable: a veces se entrega al líder, a veces se usa para otra cosa. Antes el dueño los llevaba creando un cliente llamado "minibooks".

## Decisión
- Un minibook es un **Título** con `category = minibook`; sus unidades son **Ejemplares** que entran al inventario normalmente, mostrados **aparte, al final**.
- La venta se registra como **entrada** (`minibook_sale`): título, cantidad ≥ 1, monto ≥ 0, **método** (`cash`/`transfer`), fecha, nota; **sin cliente**. Consume ejemplares `in_stock` (más antiguos primero); sin stock se **bloquea** con atajo a "Agregar al inventario".
- **Cuenta aparte:** no afecta libros vendidos, compra, venta al público, diferencia, dinero en la calle ni saldos. Su única conexión: **Total abonado** cuando se asigna a un Abibono.
- **Asignación a Abibono** (`leader_deposit_minibook_allocation`): se elige cuánto de cada entrada se entrega (parcial permitido).
- **Entrega por saldo a favor:** entrada con `customer_id` y `payment_source = client_credit`; reduce el saldo a favor, no es ingreso, no va a Abibono, sí descuenta stock.
- Totalizadores propios: vendidos, ingresos, costo, ganancia neta, entregado al líder, stock.

## Alternativas descartadas
- *Cliente "minibooks"* (truco previo): contamina el conteo y los saldos.
- *Minibooks sin inventario*: el líder exige firma de recepción.
- *Tabla de ventas por unidad*: lento de registrar en la calle; el lote cubre general e individual.

## Consecuencias
El método en la entrada es necesario para autocalcular efectivo/transferencia del Abibono.

## Referencias
BR-MBK-01..09 · FLOWS F-21 · RQ-MBK-01..05 · DECISION-LOG Q16, Q24–Q26, Q28, Q29, Q40, Q46
