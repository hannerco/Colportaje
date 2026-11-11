# HU-CLI-02 · Crear y editar un cliente (ficha viva)

> **Épica:** Clientes · **Depende de:** HU-CLI-01 · **Reglas:** BR-CUS-01/02/11/14/15/16, BR-GEN-10, ADR-0035, ADR-0037, ADR-0038, AF-70, AF-108 · **Diseño:** "Crear cliente · escritorio" (llena y vacía), "Ficha · página completa" (Datos · Editar)

## Historia
**Como** colportor en la calle **quiero** escribir el nombre del cliente y que todo lo que vaya llenando se guarde solo **para** no perder nada aunque me interrumpan.

## Contexto
- **Ficha viva:** el cliente **existe desde que tiene nombre**; no hay "borrador" ni campo de "guardado" (ADR-0038, ronda 24). Sin nombre no se crea nada (AF-108).
- "Guardar cliente" no escribe nada nuevo: solo cierra la creación (el front). "Descartar" es HU-CLI-03.
- El botón es "Descartar" y no hay indicador "Borrador guardado" (BR-CUS-14).
- Avatar: **un solo emoji** opcional; sin él, ícono de persona (BR-CUS-15). Nunca iniciales.
- Aviso de posible duplicado: no bloqueante (BR-CUS-11); no está diseñado (FC-03).

## Alcance
- **Incluye:** crear con nombre; actualizar cada dato de forma independiente (nombre, teléfono, información, dirección en texto, emoji, enlace de Maps pegado a mano); validaciones; búsqueda de posibles duplicados.
- **No incluye:** ubicación con coordenadas (HU-CLI-06), fotos (HU-CLI-07), facturas (HU-CLI-08), libros (HU-CLI-09), abonos (épica Abonos), descartar (HU-CLI-03), archivar (HU-CLI-11).

## Contrato para el front
### Acciones
- `createCustomer({ id, name })` → `Result<{ id }>` · errores: `VALIDATION` (nombre vacío), `OFFLINE`. Idempotente por `id`.
- `updateCustomer(id, patch)` → `Result<void>`; `patch` admite `name`, `phone`, `info`, `address`, `avatarEmoji` (o `null` para quitarlo), `mapsUrl` (o `null`) · errores: `VALIDATION` (`details.field`: `name`, `avatarEmoji`, `mapsUrl`), `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `OFFLINE`.
### Lecturas
- `findPossibleDuplicates({ name, phone, excludeId })` → `[{ id, name, phone, archived, reason: 'phone' | 'name' }]`.
- `isValidAvatarEmoji(texto)` (dominio).

## Reglas (el sistema DEBE…)
- **R1.** El nombre DEBE tener texto después de quitar espacios; todo lo demás es opcional (BR-CUS-01).
- **R2.** `avatarEmoji` DEBE ser exactamente un emoji (un grafema con pictograma, incluidos los compuestos con tono de piel o unidos con ZWJ); se rechaza texto, varios emojis o emoji + texto (BR-CUS-15).
- **R3.** `mapsUrl` DEBE apuntar a `google.com/maps`, `maps.google.com` o `maps.app.goo.gl` con `https` (SECURITY.md); vacío equivale a `null`.
- **R4.** Cada actualización DEBE cambiar `updated_at` del cliente (BR-CUS-16).
- **R5.** Un posible duplicado DEBE detectarse si otro cliente no borrado tiene el **mismo teléfono** (comparando solo dígitos, ignorando un prefijo `57`) o un **nombre casi idéntico** (mismo nombre normalizado, o similitud difusa por encima del umbral `duplicates.nameThreshold`). Incluye archivados, marcados como tales. Es solo informativo (BR-CUS-11).
- **R6.** Un cliente archivado NO DEBE editarse hasta restaurarlo.

## Criterios de aceptación
- **CA-1.** **Dado** "Natalia Andrea Cárdenas", **cuando** se crea, **entonces** existe un cliente prospecto con ese nombre, visible en la búsqueda y oculto en la lista por defecto (BR-CUS-05).
- **CA-2.** **Dado** el nombre "   ", **cuando** se crea o se actualiza, **entonces** `VALIDATION` con `field = name` y no cambia nada.
- **CA-3.** **Dado** el teléfono "312 448 0917", **cuando** se guarda, **entonces** queda tal cual y `updated_at` cambió.
- **CA-4.** **Dado** "🌻", "👍🏽" o "👨‍👩‍👧", **entonces** son emojis válidos; **dado** "ab", "🌻🌻" o "🌻a", **entonces** `VALIDATION` con `field = avatarEmoji`.
- **CA-5.** **Dado** "https://maps.app.goo.gl/abc", **entonces** se acepta; **dado** "https://evil.com/maps", **entonces** `VALIDATION` con `field = mapsUrl`.
- **CA-6.** **Dado** un cliente "María Gómez" con teléfono "3125551234", **cuando** se buscan duplicados para "maria gomez" o para el teléfono "+57 312 555 1234", **entonces** aparece con su razón.
- **CA-7.** **Dado** que la creación se reintenta con el mismo `id`, **entonces** sigue habiendo un solo cliente.

## Casos borde y errores
- Sin conexión: `OFFLINE` (el front deshabilita "Nuevo cliente", BR-CUS-14).
- Un cliente sin teléfono es válido; los botones de llamar y WhatsApp no aplican (AF-73, HU-CLI-12).

## Datos
Sin tablas nuevas (usa `customer` de HU-CLI-01).

## Cómo se verifica
- **Dominio:** `isValidAvatarEmoji`, validación de `mapsUrl`, normalización de teléfono y detección de duplicados (incluido el umbral, que se fija aquí con su prueba).
- **Integración:** CA-1, CA-2, CA-3 y CA-7.

## Terminado cuando
Se cumple §10 de las reglas comunes.
