# HU-PAN-CLI-06 · Información, dirección y ubicación

> **Iteración 1** · **Nivel:** pantalla · **Código:** piezas en `src/features/customers/components/` · **Storybook:** `Pantallas/Clientes/Dirección y ubicación` · **Depende de:** HU-PAN-CLI-02 · **Back:** HU-CLI-06, HU-CLI-07 · **Diseño:** secciones «7 · Información y dirección» (Direccion-estados-escritorio; Direccion-movil-sin, -con) y «8 · Elegir ubicación» (escritorio y móvil: buscando, encontrada, aproximada, guardada, negado, sin señal, sin conexión) · **Reglas:** BR-CUS-08, ADR-0036, SG-09, I-21

## Historia
**Como** colportor **quiero** guardar la dirección de mi cliente y su ubicación en el mapa **para** volver a su casa sin perderme.

## Contrato que usa
`useUpdateCustomer` (dirección, información, enlace de Maps), `useSetCustomerLocation`, `useClearCustomerLocation`, `useInitialPickerCenter`, `useRememberLastChosenPoint`, y `mapsLinkFor` / `isApproximate` (puros); fotos de información con `useCustomerInfoPhotos`, `useAddCustomerInfoPhoto` y `useDeleteCustomerInfoPhoto` si el lienzo las dibuja en esta sección.

## Pantalla
- **Información y dirección:** sin ubicación y con ubicación (mapa pequeño que carga solo al tocar, ADR-0036), «Abrir en Maps» y «Elegir en mapa».
- **Elegir ubicación:** selector con pin al centro y los siete estados del lienzo:
  - buscando;
  - encontrada;
  - aproximada (más de 50 m);
  - cambiar una ubicación guardada;
  - permiso negado;
  - sin señal de GPS;
  - sin conexión.

## Piezas del módulo
`LocationPicker` y `MapPreview` (Leaflet con teselas vectoriales de **OpenFreeMap** dibujadas por MapLibre GL, **SG-09** resuelta: ADR-0036). El lienzo los tiene como componentes (`Mapa.dc.html`, `Ubicacion.dc.html`), no en la biblioteca: se anotan para subirlos.

## Estados (stories)
Los dos de Información y dirección y los siete de Elegir ubicación, en escritorio y móvil (con la geolocalización simulada).

## No incluye
FC-16 (pegar el enlace de Maps a mano) si no está dibujado; probar en iPhone real (SG-09, lo hace el dueño).

## Criterios de aceptación
- **CA-1.** **Dado** una precisión de 120 m, **entonces** se ve el estado «aproximada» con el aviso del lienzo.
- **CA-2.** **Dado** permiso negado, **entonces** el selector se centra en el último punto elegido en el dispositivo (I-21) o en Colombia, y se ve el texto del estado «negado».
- **CA-3.** **Dado** una ubicación guardada, **cuando** pulso «Abrir en Maps», **entonces** se abre el enlace con las coordenadas (prioridad de BR-CUS-08).
- **CA-4.** **Dado** sin conexión, **entonces** «Guardar ubicación» está deshabilitado.

## Cambios por iteración
- **2026-11-19 (al programarla; lienzo leído en `DireccionEstados`, `CrearV5`, `CrearV5Movil`, `FichaV`, `Ubicacion` y `Mapa`):**
  - **Piezas del módulo** en `src/features/customers/components/`: `MapCanvas` (Leaflet, se carga solo en el navegador; el pin no es un marcador, va fijo al centro con `MapPin`), `MapPreview` (mapa pequeño que carga **al tocarlo**, «Ver mapa»; sin conexión, «Mapa sin conexión»), `LocationPicker` (selector), `CustomerLocationBlock` (sin ubicación «Elegir en mapa»; con ubicación mapa, «Abrir en Maps», «Cambiar» y «Quitar») e `InfoPhotoStrip` (miniaturas y «Agregar imagen», que abre la cámara o la galería).
  - **Información y dirección:** en la ficha nueva, la isla «Información del cliente» lleva Teléfono, Dirección, la ubicación, Información e Imágenes, como el lienzo; dirección, información y ubicación se guardan solas cuando el cliente existe (ficha viva). Antes de escribir el nombre, «Agregar imagen» queda deshabilitado con «Escribe el nombre» (la foto necesita el cliente). En la ficha guardada, la isla «Datos» suma el mapa con «Abrir en Maps», «Cambiar» y «Quitar» (o «Elegir en mapa») y «Agregar imagen»; un archivado no tiene esos botones.
  - **Selector:** va en la Ventana de detalle de la biblioteca, **centrada en escritorio y hoja en móvil** (el lienzo dibuja el móvil a pantalla completa, con «Volver» y el título flotando sobre el mapa). «Elegir en mapa» pide el GPS al abrir (el permiso se pide al tocar, ADR-0036); «Cambiar» abre en la ubicación guardada y solo pide el GPS al recentrar. Mover el mapa deja el pin «a mano»: se guarda sin precisión. El círculo de precisión va anclado al punto del GPS. Siete estados del lienzo; sin conexión, «Confirmar» deshabilitado y el aviso debajo de las coordenadas.
  - **Botón «Confirmar»** (lienzo) y no «Guardar ubicación» (texto del CA-4): manda el lienzo.
  - **Íconos:** el lienzo usa mapa, abrir afuera, cámara, recentrar y GPS tachado; la biblioteca no los tiene y se usaron `location`, `open-page`, `add` y `alert`. Se anotan para subirlos.
  - **Teselas (SG-09):** en dev y en producción el mapa usa OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`, sin cuenta ni clave); `NEXT_PUBLIC_MAP_STYLE_URL` y `NEXT_PUBLIC_MAP_ATTRIBUTION` permiten alojar el estilo propio. Sin conexión o sin WebGL el mapa se ve liso (el pin, las coordenadas, guardar y «Abrir en Maps» funcionan). Las stories corren sin imágenes del mapa.
  - **Fuera:** FC-16 (pegar el enlace de Maps, no dibujado), ver o quitar una imagen (no dibujado en esta sección), «Editar» de la isla Datos en la ficha guardada (no está en esta HU) y probar en un iPhone real (SG-09, el dueño).

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y SG-09 está decidido (OpenFreeMap) y el dueño la prueba en su iPhone.
