# HU-PAN-ADM-01 · Admin · Catálogo: crear y editar títulos, precios y portada

> **Iteración 1** · **Estado: hecha (2026-11-22), por pedido del dueño y sin diseño del lienzo** (como Iniciar sesión, OQ-44) · **Nivel:** pantalla · **Código:** `AdminCatalogScreen` en `src/features/catalog/screens/`; contenedor `src/app/(app)/admin/page.tsx` · **Storybook:** `Pantallas/Admin/Catálogo` · **Depende de:** HU-BASE-04, HU-PAN-BASE-01 · **Diseño:** no existe en el lienzo (Admin está en `04-diseno/pendientes/FALTA-TRANSVERSAL.md`); armado con la biblioteca · **Reglas:** BR-TIT-01..07, BR-USR-04, BR-PHO-01, DT-10, ADR-0007

## Historia
**Como** administrador **quiero** agregar títulos al catálogo, corregir sus nombres y precios, ponerles autor y portada, y desactivar los que ya no se venden **para** mantener el catálogo al día sin pedirle a nadie que corra un script.

## Contexto
- La carga inicial sigue siendo el script `pnpm catalog:load` (BR-TIT-06). La lista de precios de fin de año 2026-2027 (34 títulos) se cargó así el 2026-11-22 (`scripts/data/catalog.json`).
- La base ya permitía que solo el admin escriba títulos y portadas (RLS de `title` y del bucket público `title-images`), así que esta HU **no tiene migraciones**.
- «Borrar» no existe: un título se **desactiva** (BR-TIT-03) y conserva sus ejemplares e historia.

## Contrato
- **Lecturas:** `useAllTitles()` → todos los títulos (activos e inactivos), por categoría y nombre.
- **Acciones** (devuelven `Result`):
  - `useCreateTitle` → `createTitle({ id, fields })`;
  - `useUpdateTitle` → `updateTitle({ id, fields })`;
  - `useSetTitleCover` → `setTitleCover({ titleId, coverId, file })`;
  - `useRemoveTitleCover` → `removeTitleCover(titleId)`.
- **Errores:** `VALIDATION` (con `details.field`: `name`, `publicPrice`, `colportorPrice`), `OFFLINE`, `NETWORK_ERROR`, `FORBIDDEN`, `NOT_FOUND` y los de las fotos (`IMAGE_UNREADABLE`, `IMAGE_ENCODING_FAILED`).
- **Repositorio:** `TitleRepository` suma `listAll`, `create` (idempotente por id), `update` y `uploadCover`.

## Pantalla
- **Ruta y acceso:** `/admin`, en la navegación solo para administradores (BR-USR-04). Ya no muestra «Próximamente». Quien no es admin ve «Solo para administradores».
- **Lista:**
  - buscador por nombre o autor (sin tildes) y botón «Nuevo título»;
  - una isla «Catálogo» con los títulos agrupados en Cultural, Religioso y Minibooks (con su conteo);
  - cada título con su portada, nombre, autor (o «Sin autor»), precios y «Desactivado» si lo está.
- **Editor:** Ventana de detalle centrada en escritorio; página en móvil. Contiene:
  - Portada: «Poner / Cambiar portada» (cámara o galería; se comprime a WebP en el teléfono) y «Quitar portada». Un título nuevo primero se guarda; luego la ventana queda abierta para ponerle portada.
  - Nombre, Autor y Descripción corta.
  - Categoría (radio).
  - Precio al público (puede ir vacío solo en minibooks) y Precio colportor.
  - «Activo», con la aclaración de que un título no se borra, se desactiva.
  - Al editar, «Cambiar los precios no cambia los ejemplares que ya recibiste» (BR-TIT-07).
  - «Guardar» y «Cancelar».
- **Sin conexión:** se consulta; «Nuevo título», «Guardar» y la portada quedan deshabilitados.

## Criterios de aceptación
- **CA-1.** **Dado** el catálogo cargado, **entonces** veo los títulos por categoría con sus precios, y los desactivados marcados.
- **CA-2.** **Dado** «Nuevo título» con nombre y precios, **cuando** guardo, **entonces** el título queda en el catálogo y aparece al agregar al inventario si está activo. Reintentar no lo duplica.
- **CA-3.** **Dado** un cultural sin precio al público, **cuando** guardo, **entonces** el error sale junto al campo y no se guarda nada.
- **CA-4.** **Dado** un título existente, **cuando** cambio el autor o lo desactivo, **entonces** se guarda. Desactivado, deja de aparecer en Agregar al inventario pero sus ejemplares siguen.
- **CA-5.** **Dado** un título, **cuando** le pongo una foto, **entonces** se comprime, se sube y queda como portada. Si la subida falla, conserva la anterior. «Quitar portada» la deja sin imagen.
- **CA-6.** **Dado** un colportor que no es admin, **entonces** no ve Admin en la navegación, y la base le niega crear o editar títulos y subir portadas.
- **CA-7.** **Dado** que se vuelve a correr `pnpm catalog:load` con la lista de precios, **entonces** se actualizan nombres y precios, pero no se borran el autor, la descripción ni la portada puestos en Admin.

## No incluye
Usuarios, invitaciones, ajustes y meta (el resto de Admin espera su diseño); recortar la portada a una proporción fija (DT-10, la proporción está por decidir); borrar el archivo de una portada reemplazada.

## Cómo se verifica
- **Dominio:** `src/domain/title.test.ts` (`validateTitleFields`, `titleCoverPath`).
- **Casos de uso:** `src/features/catalog/manage-titles.test.ts`.
- **Integración** (Supabase local): `tests/integration/catalog.test.ts`, que cubre el admin crea/edita/sube, el no admin no puede y la recarga no borra lo de Admin.
- **Stories con `play`:** `Pantallas/Admin/Catálogo`.

## Cambios por iteración
*(vacío)*
