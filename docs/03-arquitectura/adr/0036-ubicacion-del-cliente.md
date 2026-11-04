# ADR-0036: Ubicación del cliente (coordenadas, selector con pin y mapa interactivo)
Estado: Aceptado · Fecha: 2026-11-03 · Reemplaza en parte a ADR-0014 (mapa embebido de Google)

## Contexto
El dueño pidió un botón "agregar ubicación actual" que cargue la ubicación sin copiar enlaces de Maps a mano, y luego que el colportor pueda **escoger dónde se pone el pin**, "como en Didi". Además quiere una opción que **lleve esas coordenadas a Maps** para verlo mejor. El mapa embebido de Google (iframe) solo sirve para ver y no devuelve dónde se coloca un pin.

## Decisión
- El cliente guarda **coordenadas** (`latitude`, `longitude`) y la **precisión** del GPS al capturarlas. La **dirección en texto sigue siendo manual** (no se rellena sola); el enlace de Maps pegado a mano sigue siendo opcional.
- **"Elegir en mapa"** es el **único botón** (ronda 19; antes "Usar mi ubicación actual" + "Elegir en el mapa"): usa la API de geolocalización del navegador (solo HTTPS), pide el permiso **solo al tocar el botón** y abre el **selector de ubicación** centrado en la ubicación actual, donde el usuario puede moverla. Sin permiso o sin GPS, el selector se abre igual (último punto elegido o vista de Colombia).
- **Selector con pin al centro** (patrón Didi/Uber): mapa interactivo a pantalla completa, pin fijo y mapa que se mueve; círculo de precisión; botón para recentrar en el GPS; **Confirmar** guarda las coordenadas del centro. Si la precisión es peor de ~50 m, aviso "Ubicación aproximada" y opción de repetir.
- **Un solo mapa interactivo** (Leaflet; proveedor de teselas por decidir) sirve para elegir y para **ver** la ubicación en la ficha (carga al tocar). El **iframe de Google ya no se usa**.
- **"Abrir en Maps"** lleva las coordenadas a la app de mapas del celular (`https://www.google.com/maps/search/?api=1&query=lat,lng`). Prioridad: coordenadas → enlace pegado → búsqueda por la dirección en texto.
- **Proveedor de mapas:** se decide al implementar (SG-09) con un plan gratuito; **no** el servidor público de OpenStreetMap (su política prohíbe que una app distribuida cargue sus teselas sin permiso).

## Alternativas descartadas
- *Solo botón de GPS sin ajuste de pin*: el GPS puede ser impreciso, sobre todo en interiores.
- *Seguir con el iframe de Google para ver*: dos tecnologías de mapa y no sirve para colocar el pin.
- *Rellenar la dirección en texto automáticamente* (geocodificación inversa): el servicio de Google cobra y tiene clave; el gratuito de OSM tiene reglas de uso y es flojo con direcciones colombianas. Backlog.
- *Pedir el permiso al abrir la app*: en iPhone las apps web pueden volver a pedirlo en cada apertura; se pide solo al tocar.

## Consecuencias
- Campos nuevos en `customer`; funciones de dominio puras para validar coordenadas y construir el enlace de "Abrir en Maps".
- Sin conexión no cargan las imágenes del mapa; el GPS sí funciona. En F1 guardar exige conexión; en F2 se podrá capturar el punto sin señal y ajustar el pin después.
- La ubicación de un domicilio es un dato personal: se captura solo al tocar, sin seguimiento, y entra en el aviso de la Ley 1581.
- Seguimiento SG-09: elegir el proveedor de teselas y probar la geolocalización en un iPhone real.

## Referencias
BR-CUS-08 · RQ-CUS-05, RQ-CUS-09 · FLOWS F-30 · AF-109..AF-111 · DECISION-LOG ronda 17 · ADR-0014
