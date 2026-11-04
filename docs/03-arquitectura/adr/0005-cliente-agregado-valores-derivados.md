# ADR-0005: Cliente como agregado y valores derivados
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
El texto original ponía en el Cliente: teléfono, libros, suma de abonos, deuda, saldo, fecha de venta y abonos. El asistente propuso una entidad **Venta**; el dueño la rechazó: "un cliente solo es un cliente… si compra otro libro, se agrega al cliente y cambia su saldo".

## Decisión
- **No hay entidad Venta.** El Cliente es el agregado raíz: tiene ejemplares vendidos, abonos, facturas y visitas.
- **Deuda, suma de abonos, saldo, saldo a favor, fecha de venta, prospecto, precio distinto, diferencia, total del Abibono son valores derivados**; nunca columnas editables. Se calculan en el dominio (TypeScript puro) y, opcionalmente, en vistas SQL.
- "Fecha de la venta" se deriva de las fechas de venta de los ejemplares (primera y última). "Factura inicial" admite **varias fotos**.

## Alternativas descartadas
- *Entidad Venta*: rechazada por el dueño; añadiría una capa sin aportar al flujo real.
- *Guardar totales desnormalizados*: riesgo de desincronización; el rendimiento no lo justifica con cientos de clientes. Si algún día hace falta, vista materializada, **nunca** columnas manuales.

## Consecuencias
- Las derivaciones tienen una sola implementación probada (`domain/`).
- Las listas calculan saldos en el cliente/consulta; con ~10 usuarios no hay problema de rendimiento.

## Referencias
BR-CUS-03/04, BR-GEN-03 · DOMAIN-MODEL "Derivaciones" · DECISION-LOG Q5, Q6
