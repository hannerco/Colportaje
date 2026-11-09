# HU-BASE-05 · Fotos: compresión, almacenamiento privado y acceso

> **Épica:** Cimientos · **Depende de:** HU-BASE-02 · **Reglas:** BR-PHO-01/02/03/04, ADR-0013, AF-92 · **Diseño:** sin pantalla propia (las fotos aparecen en la ficha, la factura y el Abibono)

## Historia
**Como** colportor **quiero** subir fotos (de la casa, de la factura, del recibo) que pesen poco y que solo yo pueda ver **para** no agotar el espacio gratuito ni exponer datos de mis clientes.

## Contexto
- El plan gratuito tiene 1 GB: sin comprimir se agotaría en un mes (ADR-0013). La compresión es **obligatoria y en el dispositivo**.
- Esta HU construye la pieza genérica. Las reglas propias de cada tipo de foto viven en su HU: información del cliente (HU-CLI-07), factura (HU-CLI-08), recibo del Abibono (HU-DIN-04/05).

## Alcance
- **Incluye:** compresión en el navegador (WebP, lado mayor ≤ 1.280 px, objetivo ~150 KB) y miniatura (~15 KB); bucket privado `user-photos` con políticas por carpeta del usuario; tabla `photo` y su RLS; `StorageRepository` (subir, URL firmada, borrar archivo); `PhotoRepository` genérico; medición de bytes.
- **No incluye:** la alerta al admin al 70 % de uso (BR-PHO-04 es del panel de admin; aquí solo se guarda `bytes` y existe la consulta de uso total), la cola de subida sin conexión (fase 2), la migración a Cloudflare R2.

## Contrato para el resto del código
- `compressImage(file: File)` → `Result<{ full: Blob; thumb: Blob; fullBytes: number; thumbBytes: number }>` · errores: `IMAGE_UNREADABLE`.
- `StorageRepository.upload(path, blob)` (idempotente: subir de nuevo el mismo `path` no duplica), `StorageRepository.signedUrl(path, segundos)`, `StorageRepository.remove(paths)`.
- Ruta: `{owner_id}/{kind}/{photo_id}.webp` y `{owner_id}/{kind}/{photo_id}.thumb.webp`.
- `PhotoRepository.create({ id, kind, customerId?, invoiceId?, leaderDepositId?, path, thumbPath, bytes })`, `PhotoRepository.softDelete(id)`, `PhotoRepository.totalBytes()`.
- Flujo de subida que usan las HU de cada tipo: comprimir → subir archivo y miniatura → **solo si ambas subidas terminan** se inserta la fila `photo` (o la función SQL de su HU la inserta).

## Reglas (el sistema DEBE…)
- **R1.** Toda foto DEBE comprimirse antes de subir; nunca se sube el original (BR-PHO-01).
- **R2.** El bucket `user-photos` DEBE ser privado: un usuario solo lee y escribe bajo su carpeta `{owner_id}/` (BR-PHO-02).
- **R3.** Las fotos DEBEN mostrarse con **URL firmadas** de corta duración; las listas usan la miniatura.
- **R4.** CUANDO falla una subida, NO DEBE quedar una fila `photo` apuntando a un archivo inexistente, y el error DEBE ser reintentable (AF-92).
- **R5.** `photo.kind` DEBE coincidir con su dueño: `customer_info` → cliente; `customer_invoice` → cliente y factura; `deposit_receipt` → Abibono (checks de DATABASE.md). Como esas tablas aún no existen, esta HU crea `photo` con sus columnas comunes y **cada HU dueña agrega su columna de vínculo y su check** con una migración aditiva: `customer_id` (HU-CLI-07), `invoice_id` (HU-CLI-08), `leader_deposit_id` (HU-DIN-01).

## Criterios de aceptación
- **CA-1.** **Dado** una foto de 4.000 × 3.000 px y 4 MB, **cuando** se comprime, **entonces** el resultado es WebP con lado mayor 1.280 px y ≤ ~200 KB, y la miniatura ≤ ~25 KB.
- **CA-2.** **Dado** el usuario A, **cuando** intenta leer o subir bajo la carpeta de B, **entonces** falla.
- **CA-3.** **Dado** que la subida del archivo falla, **cuando** termina la operación, **entonces** no existe la fila `photo` y el error es `NETWORK_ERROR` con `retryable = true`.
- **CA-4.** **Dado** una fila `photo` con un `kind` que no existe, **cuando** se inserta, **entonces** falla. (Los checks de vínculo por tipo se prueban en HU-CLI-07, HU-CLI-08 y HU-DIN-01.)
- **CA-5.** **Dado** dos fotos de 150 y 140 KB, **cuando** se pide el uso total, **entonces** incluye la suma de sus bytes.

## Casos borde y errores
- Un archivo que no es imagen devuelve `IMAGE_UNREADABLE` sin subir nada.
- Sin conexión: `OFFLINE` antes de comprimir.
- Borrar una foto es **lógico** (`deleted_at`); el archivo se conserva. La única excepción es borrar un borrador de Abibono (HU-DIN-04).

## Datos
Tabla `photo` con sus columnas comunes (`id`, `owner_id`, `kind`, `path`, `thumb_path`, `bytes`, `created_at`, `deleted_at`) y RLS; bucket `user-photos` y sus políticas de Storage. Las columnas de vínculo las agregan las HU dueñas (R5).

## Cómo se verifica
- **Unitarias (con un canvas de prueba):** tamaño y formato del resultado.
- **Integración:** políticas de Storage por carpeta, checks de `photo`, subida fallida sin fila.

## Terminado cuando
Se cumple §10 de las reglas comunes.
