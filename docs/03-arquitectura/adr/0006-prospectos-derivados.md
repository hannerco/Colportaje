# ADR-0006: Prospectos derivados
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
Al inicio el dueño creaba clientes sin libro porque pedían que volviera otro día; casi nunca dieron fruto. No deben afectar los totalizadores, pero el colportor quiere poder verlos y agendar visitas.

## Decisión
Un **prospecto** es un cliente **sin ejemplares vendidos** (derivado, sin campo). Las listas y "Total clientes" lo excluyen por defecto; un interruptor **"Incluir prospectos"** muestra a todos. Al venderle un libro deja de serlo.

## Alternativas descartadas
- *Campo `is_prospect`/estado*: puede desincronizarse.
- *Tabla separada*: duplica datos y complica el paso a cliente.

## Consecuencias
Consulta barata (`exists` de ejemplares). La conversión es automática.

## Referencias
BR-CUS-02/05 · RQ-CUS-01 · DECISION-LOG Q27, Q30
