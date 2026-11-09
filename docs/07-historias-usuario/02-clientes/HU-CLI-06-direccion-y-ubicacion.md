# HU-CLI-06 · Dirección, ubicación y "Abrir en Maps"

> **Épica:** Clientes · **Depende de:** HU-CLI-02 · **Reglas:** BR-CUS-08, ADR-0036, AF-109..111, SECURITY.md · **Diseño:** "Información y dirección", "Elegir ubicación" (buscando, encontrada, aproximada, permiso negado, sin señal, sin conexión, cambiar ubicación guardada)

## Historia
**Como** colportor **quiero** guardar dónde vive el cliente con un pin en el mapa y abrir esa ubicación en la app de mapas del celular **para** llegar a cobrarle sin perderme.

## Contexto
- Dirección en **texto manual** (HU-CLI-02) + **ubicación** en coordenadas con la precisión del GPS. El enlace de Maps pegado a mano sigue existiendo (ronda 26), aunque el diseño no tiene campo para pegarlo (FC-16).
- El permiso de ubicación se pide **solo** al tocar "Elegir en mapa" (privacidad, Ley 1581). Eso es del front; el back valida y guarda.
- Sin GPS o sin permiso, el selector abre en el **último punto elegido** o, si no hay, en Colombia.
- El proveedor de teselas del mapa se elige al implementar (SG-09); no es parte de esta HU.

## Alcance
- **Incluye:** guardar y quitar la ubicación; validar coordenadas; marcar "Ubicación aproximada"; construir el enlace "Abrir en Maps" con su prioridad; recordar el último punto elegido en el dispositivo.
- **No incluye:** el mapa interactivo, el selector con pin y la geolocalización del navegador (front), la dirección sugerida desde coordenadas (backlog).

## Contrato para el front
### Acciones
- `setCustomerLocation(customerId, { latitude, longitude, accuracyMeters })` → `Result<void>` · errores: `VALIDATION` (`field`: `latitude`, `longitude`, `accuracyMeters`), `CUSTOMER_ARCHIVED`, `OFFLINE`.
- `clearCustomerLocation(customerId)` → `Result<void>`.
### Lecturas y dominio
- `isApproximate(accuracyMeters)` → `accuracyMeters > location.approximateAccuracyMeters` (50).
- `mapsLinkFor({ latitude, longitude, mapsUrl, address })` → URL o `null`.
- `getInitialPickerCenter({ customerLocation })` → la ubicación guardada del cliente (para "Cambiar"); si no hay, `lastChosenPoint` del dispositivo; si no hay, `location.defaultCenter`.
- `rememberLastChosenPoint(point)` (almacenamiento local del dispositivo).

## Reglas (el sistema DEBE…)
- **R1.** Latitud y longitud DEBEN ser números en −90..90 y −180..180, **ambas o ninguna**; la precisión, entero ≥ 0 (BR-CUS-08).
- **R2.** El enlace DEBE seguir la prioridad: coordenadas → `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`; si no, el enlace pegado (ya validado); si no, la búsqueda por la dirección en texto (`…/maps/search/?api=1&query=<dirección codificada>`); si no hay nada, `null` (el botón no aparece).
- **R3.** El enlace con coordenadas DEBE construirse solo con números, nunca con texto del usuario (SECURITY.md).
- **R4.** Guardar o quitar la ubicación DEBE actualizar `updated_at` del cliente.

## Criterios de aceptación
- **CA-1.** **Dado** 6,2518 y −75,5915 con precisión 12 m, **cuando** se guarda, **entonces** queda guardada, `isApproximate` es falso y el enlace es `https://www.google.com/maps/search/?api=1&query=6.2518,-75.5915`.
- **CA-2.** **Dado** una precisión de 80 m, **entonces** `isApproximate` es verdadero.
- **CA-3.** **Dado** latitud 91, **cuando** se guarda, **entonces** `VALIDATION` con `field = latitude`.
- **CA-4.** **Dado** un cliente sin coordenadas, sin enlace y con dirección "Cl. 48 #79-25, Laureles, Medellín", **entonces** el enlace busca esa dirección codificada; **dado** que tampoco tiene dirección, **entonces** `null`.
- **CA-5.** **Dado** un cliente con ubicación guardada, **cuando** se quita, **entonces** las dos coordenadas y la precisión quedan vacías.
- **CA-6.** **Dado** que el usuario eligió antes el punto (6,25; −75,59) en otro cliente, **cuando** abre el selector para un cliente sin ubicación y sin GPS, **entonces** el centro inicial es ese punto.

## Casos borde y errores
- Sin conexión: `OFFLINE`; si ya hay coordenadas guardadas, el enlace sigue disponible (AF-111).

## Datos
Columnas de `customer`: `latitude`, `longitude`, `location_accuracy_m`, `maps_url` (HU-CLI-01).

## Cómo se verifica
- **Dominio:** validación, `isApproximate`, `mapsLinkFor`, `getInitialPickerCenter`.
- **Integración:** CA-1, CA-3 y CA-5.

## Terminado cuando
Se cumple §10 de las reglas comunes.
