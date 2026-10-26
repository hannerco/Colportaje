# ADR-0026: Elección de ejemplares uno por uno al vender
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
El asistente propuso vender eligiendo "título + cantidad" y asignar automáticamente los más antiguos. El dueño lo rechazó: "cuando vendes escoges un ejemplar específico… los vas añadiendo uno por uno. Si quieres venderlo a un precio diferente debes entrar al ejemplar individual y cambiar su precio acordado."

## Decisión
En **+ Vender**, el colportor elige **ejemplares concretos** de su stock físico, uno por uno (visible número y antigüedad). El precio acordado por defecto es el precio público del snapshot y se edita después en el ejemplar individual.

## Alternativas descartadas
Asignación automática por cantidad (rechazada por el dueño).

## Consecuencias
La lista de selección muestra número + antigüedad para facilitar el orden de venta; las entradas de minibooks, que son por lote, sí consumen FIFO (ADR-0011).

## Referencias
BR-COPY-06/07 · FLOWS F-10, F-08 · DECISION-LOG Q35
