# ADR-0049: Registrar el pasado (la app puede empezar a usarse a mitad de campaña)
Estado: Aceptado · Fecha: 2026-11-16 · Reemplaza parte de ADR-0045, ADR-0047 y ADR-0033 (solo la parte de «no anterior a hoy»)

## Contexto
El plazo de 14 días no alcanzó: los colportores van a empezar a usar la app **con la campaña ya iniciada** (ronda 30). Un colportor que lleva dos semanas vendiendo debe poder cargar lo que ya pasó con la **fecha real** de cada cosa: cuándo vendió cada libro, cuándo le pagaron y qué cuotas ya estaban vencidas. La revisión de los docs mostró que casi todo ya aceptaba fechas pasadas (fecha de recibido, cobros, cuota inicial extra, Abibono, minibooks), pero tres reglas lo impedían:

1. La **fecha de venta** del libro (`sold_at`) era siempre «ahora» (BR-COPY-06).
2. Los **abonos programados** no podían tener fecha anterior a hoy (ADR-0045, BR-PAY-06/15/16, trigger de HU-ABO-01 R5).
3. La **cuota inicial** de la ficha nueva quedaba con la fecha del momento de crear la ficha (decisión 24 del DECISION-LOG).

## Decisión
- **Principio (BR-GEN-16):** toda fecha de negocio que el colportor registra puede ser **pasada**. Nunca puede ser **futura** cuando es un hecho ya ocurrido (venta, recibido, cobro). Cuando la fecha es un **plan** (abono programado), puede ser pasada o futura.
- **Fecha de venta editable.** `sold_at` se elige al agregar el libro al cliente (**Hoy** por defecto, Ayer, Anteayer u «Otra fecha…») y se **puede cambiar después**. No puede ser futura ni anterior a la fecha de recibido del ejemplar (el día se compara en America/Bogota). Cada cambio queda en el historial del ejemplar. «Cliente desde» y las fechas de venta de la ficha usan esta fecha.
- **Abonos programados con fecha pasada.** Se quita la regla «ninguna fecha anterior a hoy» al **programar**, **corregir**, **prorrogar** y al fijar el **primer abono del plan**. El abono nace **vencido** (BR-PAY-08: derivado de la fecha), con «Venció el 15 de noviembre». **La app avisa** («Esta fecha ya pasó») pero **deja continuar**; el aviso lo muestra el front con la función de dominio `isPastDate`, y el back no bloquea ni exige confirmación.
- **La prórroga** sigue exigiendo una nueva fecha **posterior a la actual** (una prórroga solo da más plazo) y la confirmación de más de 2 meses; puede terminar en una fecha anterior a hoy (con el aviso).
- **El plan automático sigue siendo una ayuda:** sugiere fechas desde el siguiente día de pago después de hoy y el colportor las edita (ADR-0045/0047 siguen vigentes en lo demás).
- **Cuota inicial con fecha.** Al crear la ficha, la cuota inicial lleva un campo de **fecha** (Hoy por defecto, no futura); actualizarla cambia también la fecha.
- **No cambian:** el Abibono confirmado sigue exigiendo foto de recibo (el dueño confirmó que el caso «ya entregué sin recibo» no va a suceder); fecha de cobro no futura; fecha de recibido no futura ni posterior a la venta.

## Alternativas descartadas
- *Un «modo migración» aparte con pantallas propias:* duplica flujos; las mismas pantallas con fechas editables cubren el caso y siguen sirviendo después.
- *Bloquear y obligar a programar desde hoy:* pierde «Venció hace N días» y esconde cuánto lleva atrasado un cliente.
- *Que el back exija confirmar toda fecha pasada (como la prórroga a más de 2 meses):* agrega un viaje de ida y vuelta por cada abono de un plan; basta el aviso en pantalla.

## Consecuencias
- Tres HU nuevas, sin tocar las terminadas (cada una trae su migración): **HU-CLI-13** (fecha de venta del libro), **HU-ABO-08** (abonos programados con fecha pasada) y **HU-ABO-09** (fecha de la cuota inicial). Ver `07-historias-usuario/README.md`.
- El trigger de fechas de HU-ABO-01 (R5) y las validaciones de HU-ABO-03/04/05 se reemplazan por migraciones nuevas; las HU viejas llevan una nota «Ajustada por».
- La interpretación I-09 queda sin efecto en su parte de «no anterior a hoy».
- Riesgo asumido: una fecha pasada escrita por error (p. ej. año equivocado) ya no se rechaza; el aviso en pantalla es la defensa.

## Referencias
BR-GEN-16, BR-COPY-06, BR-PAY-06/15/16, BR-CUS-04 · ADR-0033, ADR-0045, ADR-0047 · DECISION-LOG ronda 30 · AF-23, AF-50
