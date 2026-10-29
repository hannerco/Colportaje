# ADR-0014: Búsqueda y dirección
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
El dueño quiere un buscador "lo más dinámico que se pueda", no solo por nombre sino por la información del cliente. La dirección puede ser texto o URL de Maps embebida (como en Notion).

## Decisión
- **Búsqueda local y difusa** (tolera errores y acentos) sobre nombre, teléfono, información y dirección, con los clientes cargados en el dispositivo. Reutilizable sin cambios en offline (F2).
- **Dirección:** texto + enlace opcional de Maps + botón **"Abrir en Maps"** (en el celular abre la app) + **mapa embebido** (iframe) que **solo se carga al tocarlo**. Sin conexión, el error del mapa lo muestra Google (aceptado por el dueño).
- Validar `maps_url` contra dominios permitidos; `sandbox` y CSP `frame-src` restringida.

## Alternativas descartadas
- *Búsqueda en servidor (full-text/trigram)*: mejor para miles de clientes, innecesario; peor offline.
- *Embed siempre cargado*: gasta datos y ralentiza la ficha.
- *Afirmación inicial errónea*: se dijo que el embed requería clave de pago; el iframe de "Compartir → Insertar mapa" funciona sin clave.

## Consecuencias
Elegir librería (Fuse.js o MiniSearch) con la prueba RQ-CUS-04. Las fotos no son buscables.

## Referencias
BR-CUS-07/08 · RQ-CUS-04/05 · DECISION-LOG Q34, Q38
