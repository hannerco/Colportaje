# HU-UI-08 · Avatar

> **Iteración 1** · **Nivel:** átomo · **Código:** `Avatar` en `src/ui/atoms/Avatar/` · **Storybook:** `Átomos/Avatar` · **Depende de:** HU-UI-03 · **Diseño:** ficha `Lib-Avatar`, fuente `Avatar.dc.html` · **Reglas:** BR-CUS-15, ADR-0037, DT-10 (imagen del título)

## Historia
**Como** colportor **quiero** reconocer a un cliente por su emoji y a un libro por su portada **para** encontrarlos rápido en las listas.

## Qué es (de la ficha)
Identifica a un cliente (persona o el emoji que eligió el colportor), a un libro (portada) o a la marca. Su tamaño cambia según la plataforma.
- **Usarlo:** al inicio de filas de clientes, abonos y ejemplares; en el encabezado de una ficha (xl); marca en la cabecera de la barra lateral.
- **No usarlo:** como botón por sí solo; con fotos reales de clientes sin su permiso.

## Props
| Prop | En el diseño | Tipo | Por defecto | Notas |
|---|---|---|---|---|
| `kind` | `tipo` | `'person' \| 'emoji' \| 'cover' \| 'brand'` | `'person'` | |
| `emoji` | `emoji` | `string` | — | Solo en `emoji` |
| `coverUrl` | — | `string` | — | Solo en `cover`. Imagen del título (DT-10); sin ella se dibuja el ícono `books` |
| `size` | `tamano` | `'auto' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'auto'` | sm 24 · md 32 · lg 40 · xl 56. Auto: md en escritorio, lg en móvil (la marca siempre md) |
| `name` | `nombre` | `string` | — | Nombre accesible. En portada y marca sale de `copy/es.ts` («Portada», «Colportor») |

## Comportamiento
- **R1.** Persona: círculo con fondo `avatar-bg` e ícono `person` en `avatar-fg` al 50 % del lado.
- **R2.** Emoji: círculo transparente con el emoji al 72 % del lado.
- **R3.** Portada: rectángulo de ancho 80 % del lado.
  - Alto igual al lado; 125 % en xl.
  - Radio 6; 10 en xl.
  - Fondo `avatar-bg` e ícono `books` al 42 % si no hay imagen.
  - Con imagen: `object-fit: cover`.
- **R4.** Marca: cuadrado con fondo `accent` e ícono `books` en `on-accent`. Radio 9; 12 desde 40 px.
- **R5.** Trazo del ícono 2 cuando el lado es ≤ 28; 1,8 en los demás.

## Stories
«Explorar» · Escritorio: «Persona», «Emoji» (🌻), «Portada», «Marca», «Persona · xl», «Portada · xl» · Móvil: «Persona», «Emoji» (📚), «Portada», «Persona · xl» · «Matriz».

## Accesibilidad
`role="img"` con el nombre del cliente o «Portada». Si el nombre ya está al lado, el avatar es decorativo para no leerlo dos veces (prop `decorative`).

## No incluye
El **selector de emoji** (FC-02, SG-10): no está en la biblioteca. Tampoco fotos de perfil (backlog).

## Criterios de aceptación
- **CA-1.** **Dado** `kind="person"` y `size="auto"`, **entonces** mide 32 en escritorio y 40 en móvil.
- **CA-2.** **Dado** `kind="cover" size="xl"` sin `coverUrl`, **entonces** mide 45 × 70 con radio 10 y el ícono de libro.
- **CA-3.** **Dado** `kind="emoji" emoji="🌻" name="Luz Marina"`, **entonces** su nombre accesible es «Luz Marina».
- **CA-4.** **Dado** `decorative`, **entonces** tiene `aria-hidden="true"`.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
