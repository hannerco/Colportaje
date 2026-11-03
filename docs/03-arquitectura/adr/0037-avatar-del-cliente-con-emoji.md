# ADR-0037: Avatar del cliente con emoji opcional
Estado: Aceptado · Fecha: 2026-11-03

## Contexto
El dueño quiere que el colportor pueda personalizar a cada cliente con un ícono, con un valor por defecto. Se compararon tres tipos (iniciales, ícono de un set propio, emoji) y se concluyó que el emoji es lo más sencillo de construir (se guarda un texto y el selector ya existe hecho) y da mucha más variedad, a costa de cierta coherencia visual. El primer diseño de Claude Design ya mostraba clientes con emoji. Decisión del dueño: **"el cliente nuevo puede tener un emoji como avatar, eso ya está decidido."**

## Decisión
- Cada cliente puede tener un **emoji** como avatar (`customer.avatar_emoji`, un solo emoji). Sin emoji, se muestra el **avatar por defecto**, que es un valor **derivado** y no se guarda (iniciales o ícono de persona: **por confirmar, OQ-38**).
- **No** hay set de íconos propios para clientes en la v1 (Lucide queda para la interfaz). **Fotos de perfil**: backlog.
- El emoji se elige con un **selector** (candidato: `frimousse`, sin estilos propios y ligero; SG-10) que **se carga solo al abrirse**; se puede **quitar** para volver al avatar por defecto.
- Se dibuja con los **emojis del sistema** (cero peso y funciona sin conexión); que se vean distinto entre iPhone, Android y Windows es **aceptado**. El fondo del avatar es **neutro**: el color del emoji es contenido del usuario, no decoración de la interfaz (no contradice la lista negra anti-IA).
- Validación en el dominio: debe ser **exactamente un emoji** (un solo grafema pictográfico). El emoji **no** entra en la búsqueda.
- Se muestra en la lista de clientes (móvil), la tabla (escritorio) y la cabecera de la ficha.

## Alternativas descartadas
- *Íconos de Lucide como avatar*: curar y mantener un set, y construir un selector propio.
- *Solo iniciales*: sin personalización.
- *Fotos*: más peso de almacenamiento y de privacidad; backlog.

## Consecuencias
- Campo nuevo `avatar_emoji` en `customer`; función pura `isValidAvatarEmoji`.
- En iPhone/Android el mismo emoji se ve distinto; si algún día importa la uniformidad, se añade un set propio (Twemoji/Noto).
- Los datos del selector deben quedar guardados tras la primera apertura para que funcione sin conexión (SG-10).

## Referencias
BR-CUS-15 · RQ-CUS-10 · DECISION-LOG ronda 18 · OPEN-QUESTIONS OQ-38, SG-10 · ADR-0029, ADR-0032
