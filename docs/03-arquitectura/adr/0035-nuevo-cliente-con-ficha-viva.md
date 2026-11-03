# ADR-0035: "Nuevo cliente" con ficha viva (reemplaza al asistente "+ Vender")
Estado: Aceptado · Fecha: 2026-11-03 · Reemplaza la decisión de la ronda 14 (RV-06)

## Contexto
El dueño ratificó el asistente de 5 pasos "+ Vender" (ronda 14) pese a que en Notion vendía "creando un cliente y agregándole a este un libro". Después **habló con quienes usaron el Notion** y coincidieron en que **no debería haber un "Vender" distinto de crear un cliente nuevo**. Decidió convertir el botón flotante "+ Vender" en **"Nuevo cliente"**.

## Decisión
- La acción global pasa a llamarse **"Nuevo cliente"**, con ícono de **persona con "+"**. **"Vender" deja de existir** como acción, ruta y etiqueta. En móvil: botón flotante. En escritorio: la ubicación se decide viendo cuatro opciones (**DT-08**: navegación global / solo en Clientes / flotante / ícono en la cabecera del sidebar).
- El cliente nuevo es una **ficha viva**: se **guarda sola**; el **nombre** es lo único obligatorio y, si se sale sin nombre, no queda nada. Las secciones **Libros → Abonos → Factura** se llenan en línea, en el orden habitual pero **sin orden obligatorio**; la información, la dirección y las fotos se completan después.
- Un **prospecto** es una ficha sin libros (F-11 se fusiona con F-10). Un cliente que recompra se abre desde **Clientes → ficha → "Agregar libro"**.
- **Avisos informativos en línea, sin bloqueo** ("el usuario va a poder seguir haciendo lo que quiera"): (a) abonos sin libros → **"Aún no tiene libro"**; (b) lo programado supera lo que falta → franja con **"Revisar"**, que abre el modal de BR-PAY-13. El modal también se abre **directamente** ante una devolución, un abono extra o una baja de precio.

## Alternativas descartadas
- *Asistente de 5 pasos "+ Vender"* (decisión anterior): pesado en el celular, orden obligatorio y ajeno al modelo mental de los usuarios.
- *Evaluar la alerta solo al salir de la ficha*: el dueño prefiere que avise de inmediato, sin bloquear.

## Consecuencias
- Se reescriben F-10 y F-11, BR-GEN-10, BR-PAY-13, RQ-SAL-01 y el brief; se añaden BR-CUS-14 y BR-PAY-14.
- Rutas: `/clientes/nuevo` en lugar de `/vender`.
- Se cierra RV-06. Queda abierta **DT-08** (ubicación en escritorio).

## Referencias
BR-GEN-10, BR-CUS-14, BR-PAY-13/14 · FLOWS F-10, F-11 · RQ-SAL-01 · DECISION-LOG ronda 16 · ADR-0018, ADR-0026
