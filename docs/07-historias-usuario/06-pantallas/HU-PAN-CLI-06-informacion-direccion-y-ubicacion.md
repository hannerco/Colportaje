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
`LocationPicker` y `MapPreview` (Leaflet; proveedor de teselas por decidir, **SG-09**: hasta que se decida, el mapa usa un proveedor de pruebas solo en desarrollo y la HU no se da por terminada en producción). El lienzo los tiene como componentes (`Mapa.dc.html`, `Ubicacion.dc.html`), no en la biblioteca: se anotan para subirlos.

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
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y SG-09 está decidido.
