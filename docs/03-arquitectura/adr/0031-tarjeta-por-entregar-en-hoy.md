# ADR-0031: Tarjeta "Por entregar" en Hoy
Estado: Aceptado · Fecha: 2026-10-28

## Contexto
El dueño propuso que en **Hoy** el colportor sepa cuánto tiene recaudado para entregárselo después al líder. Contradecía la regla "en Hoy no se muestran cifras de dinero" (BR-GOAL-06), pensada para no restar emoción al cuadre con el líder. El dueño aclaró que esto **no** quita emoción: es un dato operativo importante. No le gustó el nombre "En mi poder" y pidió uno profesional.

## Decisión
- Tarjeta **"Por entregar"** en Hoy (**sin subtítulo**: el significado va en un ⓘ; revisado en ADR-0032). Nombre elegido porque completa el ciclo del dinero: **Por cobrar → Por entregar → Entregado**.
- Cifra principal: **total** (`to_deliver_total`); como ayuda, **una línea gris** con el desglose Efectivo · Transferencia (sin barra de colores).
- **Ícono de ojo** para ocultar los montos (preferencia local al dispositivo, visible por defecto).
- Cuenta abonos `collected` (incluso en Abibonos borrador); **excluye minibooks y abonos cancelados**; deja de contar al confirmar el Abibono y vuelve a contar al reabrirlo.
- Tarjeta **destacada en color de acento** (Referencia 4) con **un botón "Entregar"** que abre **Nuevo Abibono precargado** con los abonos cobrados (BR-DEP-13); tocar el resto de la tarjeta abre **Dinero**; sin enlace "Ir a Dinero"; con total 0 dice "Nada por entregar".
- Es la **única cifra de dinero** permitida en Hoy (BR-GOAL-06 actualizada). El estado de abono `collected` se muestra como "Cobrado" (se retira la expresión "en mi poder" de toda la app).

## Alternativas descartadas
- *"En mi poder"*: informal, a juicio del dueño.
- *"Recaudado"*: correcto, pero no indica la acción pendiente.
- *Mostrar solo el desglose*: el dueño pidió el total como dato principal.
- *Incluir minibooks*: su dinero es inestable y es una cuenta aparte (BR-MBK-05).

## Consecuencias
Se añaden BR-CAL-08, RQ-CAL-07, AF-104/AF-105 y pruebas de dominio. La preferencia de ocultar no se sincroniza con el servidor.

## Referencias
BR-CAL-07/08, BR-GOAL-06 · RQ-CAL-07, RQ-DEP-01 · F-15, F-20 · DECISION-LOG ronda 10
