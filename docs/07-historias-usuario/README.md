# Historias de usuario: back y front de Clientes, Inventario y Dinero

Este archivo tiene dos partes:
- **Back** (carpetas `00-base` a `04-dinero`): toda la lógica que no es UI de los tres módulos diseñados, más unos cimientos mínimos (ADR-0041). Las escribió un asistente de IA el 2026-11-08 (DECISION-LOG ronda 26).
- **Front · iteración 1** (carpetas `05-ui` y `06-pantallas`): el Storybook, los componentes de la biblioteca del diseño y las pantallas, escritas el 2026-11-17 (ronda 31, ADR-0050). Ver la sección [«Front · iteración 1»](#front--iteración-1).

Las secciones siguientes, hasta «Fuera de alcance de todas estas HU», son del back.

## Cómo están escritas (y por qué)
El formato sigue lo que coinciden en recomendar las guías de desarrollo guiado por especificaciones para agentes de IA:
- **Una HU por archivo, pequeña e implementable sola**, con prioridad y dependencias explícitas (como las *user stories* priorizadas e independientemente comprobables de GitHub Spec Kit).
- **Contexto que la IA no puede ver** (el porqué, las reglas `BR-*`, los ADR y la pantalla del diseño), porque un agente rinde mejor cuando se le dice lo que no está en el código.
- **"Qué", no "cómo"**: se fija el **contrato** que el front llamará (nombres, entradas, salidas y errores) y las reglas; el cómo interno queda libre salvo cuando protege dinero (operaciones atómicas en SQL).
- **Reglas en forma "el sistema DEBE…"** (estilo EARS) y **criterios de aceptación Dado / Cuando / Entonces con números concretos**, cada uno convertible en una prueba.
- **Fuera de alcance explícito**, porque los agentes tienden a hacer de más.
- **Una forma de verificarse**: cada HU dice qué pruebas deben existir y pasar; "parece terminado" no cuenta.

Fuentes: [GitHub Spec Kit · plantilla de especificación](https://github.com/github/spec-kit/blob/main/templates/spec-template.md), [Claude Code · buenas prácticas](https://code.claude.com/docs/en/best-practices), [Kiro · especificaciones con notación EARS](https://kiro.dev/docs/specs/concepts), [JetBrains · desarrollo guiado por especificaciones con IA](https://blog.jetbrains.com/junie/2025/10/how-to-use-a-spec-driven-approach-for-coding-with-ai/), [Microsoft Learn · escribir un spec.md efectivo](https://learn.microsoft.com/en-us/training/modules/spec-driven-development-github-spec-kit-enterprise-developers/5-write-effective-spec-file).

## Cómo pedirle a una IA que implemente una HU
Pega esto en una sesión **nueva** (un contexto limpio por HU):

```text
Implementa la HU docs/07-historias-usuario/<carpeta>/<archivo>.md.
Antes de escribir código, lee AGENTS.md, docs/07-historias-usuario/00-REGLAS-COMUNES.md y la HU completa,
y las reglas BR-* y ADR que cite. Respeta el "No incluye". Escribe primero las pruebas de los criterios
de aceptación y luego el código hasta que pasen; corre pnpm lint && pnpm typecheck && pnpm test
(y pnpm test:rls si la HU toca la base de datos). Si algo de la HU contradice los docs o falta un dato,
detente y pregúntame; no inventes reglas. Al terminar, recorre cada criterio de aceptación y dime cómo
quedó verificado.
```

Luego, en **otra** sesión, pide una revisión independiente: *"Revisa el cambio contra la HU <archivo>: comprueba que cada regla y cada criterio esté implementado y probado; reporta solo huecos de corrección."*

## Archivos comunes
| Archivo | Para qué |
|---|---|
| `00-REGLAS-COMUNES.md` | Reglas que aplican a **todas** las HU (capas, errores, sin conexión, idempotencia, configuración, extensibilidad, definición de terminado). Cada HU las da por incluidas |
| `PLANTILLA.md` | Plantilla para escribir HU nuevas (p. ej. Minibooks o Calendario cuando se diseñen) |
| `INTERPRETACIONES.md` | Detalles que los docs no fijaban y que el asistente decidió al escribir las HU. **El dueño puede vetar cualquiera** antes de implementar |

## Orden de implementación y dependencias
Implementar en este orden. Una HU solo empieza cuando sus dependencias están terminadas. Las HU de un mismo bloque sin dependencia entre sí pueden ir en paralelo.

| Orden | HU | Título | Depende de |
|---|---|---|---|
| 1 | [HU-BASE-01](00-base/HU-BASE-01-proyecto-por-capas.md) | Proyecto por capas, calidad y utilidades del dominio | — |
| 2 | [HU-BASE-02](00-base/HU-BASE-02-base-de-datos-y-rls.md) | Base de datos local, convenciones y aislamiento por usuario (RLS) | BASE-01 |
| 3 | [HU-BASE-03](00-base/HU-BASE-03-sesion.md) | Inicio de sesión, perfil y rol | BASE-02 |
| 3 | [HU-BASE-04](00-base/HU-BASE-04-catalogo.md) | Catálogo de títulos: carga y lectura | BASE-02 |
| 3 | [HU-BASE-05](00-base/HU-BASE-05-fotos.md) | Fotos: compresión, almacenamiento privado y acceso | BASE-02 |
| 3 | [HU-BASE-06](00-base/HU-BASE-06-conexion.md) | Lectura sin conexión y bloqueo de escrituras | BASE-01 |
| 4 | [HU-BASE-07](00-base/HU-BASE-07-despliegue.md) | Despliegue: migraciones a la nube, entornos, backups y Vercel | BASE-01, BASE-02 |
| 4 | [HU-CLI-01](02-clientes/HU-CLI-01-cliente-y-cuenta.md) | Cliente: modelo y cuenta derivada | BASE-02 |
| 5 | [HU-INV-01](01-inventario/HU-INV-01-ejemplar-modelo.md) | Ejemplar: modelo, numeración, estados e historial | BASE-04, CLI-01 |
| 5 | [HU-ABO-01](03-abonos/HU-ABO-01-abono-modelo.md) | Abono: modelo, estados y vencido | CLI-01 |
| 6 | [HU-INV-02](01-inventario/HU-INV-02-agregar-por-lote.md) | Agregar ejemplares al inventario por lote | INV-01 |
| 6 | [HU-INV-03](01-inventario/HU-INV-03-libros-en-fisico.md) | Libros en físico y Por resolver | INV-01 |
| 6 | [HU-ABO-07](03-abonos/HU-ABO-07-abonos-que-no-cuadran.md) | Alerta de abonos que no cuadran | ABO-01 |
| 6 | [HU-DIN-01](04-dinero/HU-DIN-01-abibono-modelo.md) | Abibono: modelo, cuadre y bloqueos | ABO-01, BASE-05 |
| 7 | [HU-CLI-02](02-clientes/HU-CLI-02-crear-y-editar.md) | Crear y editar un cliente (ficha viva) | CLI-01 |
| 7 | [HU-INV-04](01-inventario/HU-INV-04-lista-de-ejemplares.md) | Lista de ejemplares | INV-01, CLI-01 |
| 7 | [HU-INV-05](01-inventario/HU-INV-05-detalle-de-ejemplar.md) | Detalle de un ejemplar, historial y fecha de recibido | INV-01, CLI-01 |
| 8 | [HU-CLI-09](02-clientes/HU-CLI-09-agregar-y-quitar-libros.md) | Agregar y quitar libros en la ficha | CLI-02, INV-01, ABO-07 |
| 8 | [HU-ABO-02](03-abonos/HU-ABO-02-cuota-inicial-y-extra.md) | Cuota inicial, abono extra y corrección de cobros | ABO-07, DIN-01, CLI-02 |
| 8 | [HU-ABO-03](03-abonos/HU-ABO-03-plan-de-abonos.md) | Plan de abonos automático | ABO-01, CLI-02 |
| 8 | [HU-ABO-04](03-abonos/HU-ABO-04-programar-y-corregir.md) | Programar, editar, corregir, borrar y cancelar abonos programados | ABO-07, CLI-02 |
| 8 | [HU-ABO-05](03-abonos/HU-ABO-05-prorroga.md) | Prórroga | ABO-01 |
| 8 | [HU-ABO-06](03-abonos/HU-ABO-06-cobrar.md) | Cobrar un abono programado | ABO-07 |
| 9 | [HU-CLI-03](02-clientes/HU-CLI-03-descartar.md) | Descartar un cliente recién creado | CLI-09, ABO-02, DIN-01 |
| 9 | [HU-CLI-04](02-clientes/HU-CLI-04-lista-de-clientes.md) | Lista de clientes | CLI-01, ABO-01 |
| 9 | [HU-CLI-05](02-clientes/HU-CLI-05-busqueda.md) | Búsqueda de clientes | CLI-04 |
| 9 | [HU-CLI-06](02-clientes/HU-CLI-06-direccion-y-ubicacion.md) | Dirección, ubicación y "Abrir en Maps" | CLI-02 |
| 9 | [HU-CLI-07](02-clientes/HU-CLI-07-fotos-de-informacion.md) | Fotos de información del cliente | CLI-02, BASE-05 |
| 9 | [HU-CLI-08](02-clientes/HU-CLI-08-facturas.md) | Facturas | CLI-02, BASE-05 |
| 9 | [HU-CLI-10](02-clientes/HU-CLI-10-devolver-libro.md) | Devolver un libro de un cliente guardado | CLI-09 |
| 9 | [HU-CLI-11](02-clientes/HU-CLI-11-archivar-y-restaurar.md) | Archivar y restaurar un cliente | CLI-01, ABO-01 |
| 9 | [HU-INV-06](01-inventario/HU-INV-06-precio-acordado.md) | Precio acordado de un ejemplar vendido | INV-05, ABO-07 |
| 9 | [HU-INV-07](01-inventario/HU-INV-07-novedad.md) | Marcar con novedad, resolver y deshacer | INV-03 |
| 9 | [HU-INV-08](01-inventario/HU-INV-08-eliminar.md) | Eliminar un ejemplar y deshacer | INV-07 |
| 9 | [HU-INV-09](01-inventario/HU-INV-09-devolver-al-lider.md) | Devolver al líder y deshacer | INV-03 |
| 10 | [HU-CLI-12](02-clientes/HU-CLI-12-ficha.md) | Ficha del cliente (consulta completa) | CLI-02..11, ABO-02..07 |
| 10 | [HU-DIN-02](04-dinero/HU-DIN-02-resumen.md) | Resumen de Dinero | DIN-01, CLI-01 |
| 10 | [HU-DIN-03](04-dinero/HU-DIN-03-lista-de-abonos.md) | Lista de abonos de clientes | DIN-01 |
| 10 | [HU-DIN-04](04-dinero/HU-DIN-04-nuevo-abibono-y-borradores.md) | Nuevo Abibono precargado y borradores | DIN-01 |
| 10 | [HU-DIN-06](04-dinero/HU-DIN-06-lista-de-abibonos.md) | Lista de Abibonos | DIN-01 |
| 11 | [HU-DIN-05](04-dinero/HU-DIN-05-confirmar.md) | Confirmar un Abibono | DIN-04 |
| 12 | [HU-DIN-07](04-dinero/HU-DIN-07-reabrir.md) | Reabrir un Abibono confirmado | DIN-05 |
| 13 | [HU-CLI-13](02-clientes/HU-CLI-13-fecha-de-venta.md) | Fecha de venta del libro editable (ADR-0049) | CLI-09, INV-05 |
| 13 | [HU-ABO-08](03-abonos/HU-ABO-08-abonos-con-fecha-pasada.md) | Abonos programados con fecha pasada (ADR-0049) | ABO-03, ABO-04, ABO-05 |
| 13 | [HU-ABO-09](03-abonos/HU-ABO-09-fecha-de-la-cuota-inicial.md) | Fecha de la cuota inicial en la ficha nueva (ADR-0049) | ABO-02 |
| 14 | [HU-ABO-10](03-abonos/HU-ABO-10-deshacer-cobro.md) | Deshacer un cobro (para HU-PAN-DIN-02) | ABO-06 |

## Avance
| HU | Estado | Dónde |
|---|---|---|
| HU-BASE-01 | Terminada (2026-11-11) | `main` |
| HU-BASE-02 | Terminada (2026-11-13) | `will-dev` |
| HU-BASE-03 | Terminada (2026-11-13) | `will-dev` |
| HU-BASE-04 | Terminada (2026-11-13); falta cargar el catálogo real (punto de entrega) | `will-dev` |
| HU-BASE-05 | Terminada (2026-11-13); falta probar la compresión en un iPhone real (OQ-43) | `will-dev` |
| HU-BASE-06 | Terminada (2026-11-13); la E2E con Playwright queda para cuando exista la primera pantalla o el primer despliegue (no hay UI que recorrer) | `will-dev` |
| HU-CLI-01 | Terminada (2026-11-13) | `will-dev` |
| HU-INV-01 | Terminada (2026-11-13) | `will-dev` |
| HU-ABO-01 | Terminada (2026-11-13) | `will-dev` |
| HU-INV-02 | Terminada (2026-11-13) | `will-dev` |
| HU-INV-03 | Terminada (2026-11-13) | `will-dev` |
| HU-ABO-07 | Terminada (2026-11-13) | `will-dev` |
| HU-DIN-01 | Terminada (2026-11-13) | `will-dev` |
| HU-CLI-02 | Terminada (2026-11-13) | `will-dev` |
| HU-INV-04 | Terminada (2026-11-13) | `will-dev` |
| HU-INV-05 | Terminada (2026-11-13) | `will-dev` |
| HU-CLI-09 | Terminada (2026-11-13) | `will-dev` |
| HU-ABO-02 | Terminada (2026-11-13) | `will-dev` |
| HU-ABO-03 | Terminada (2026-11-13) | `will-dev` |
| HU-ABO-04 | Terminada (2026-11-13) | `will-dev` |
| HU-ABO-05 | Terminada (2026-11-13) | `will-dev` |
| HU-ABO-06 | Terminada (2026-11-14) | `will-dev` |
| HU-CLI-07 | Terminada (2026-11-14) | `will-dev` |
| HU-CLI-08 | Terminada (2026-11-14) | `will-dev` |
| HU-CLI-03 | Terminada (2026-11-15) | `will-dev` |
| HU-CLI-04 | Terminada (2026-11-15) | `will-dev` |
| HU-CLI-05 | Terminada (2026-11-15) | `will-dev` |
| HU-CLI-06 | Terminada (2026-11-15) | `will-dev` |
| HU-CLI-10 | Terminada (2026-11-15) | `will-dev` |
| HU-CLI-11 | Terminada (2026-11-15) | `will-dev` |
| HU-INV-06 | Terminada (2026-11-15) | `will-dev` |
| HU-INV-07 | Terminada (2026-11-15) | `will-dev` |
| HU-INV-08 | Terminada (2026-11-15) | `will-dev` |
| HU-INV-09 | Terminada (2026-11-15) | `will-dev` |
| HU-CLI-12 | Terminada (2026-11-15) | `will-dev` |
| HU-DIN-02 | Terminada (2026-11-15) | `will-dev` |
| HU-DIN-03 | Terminada (2026-11-15) | `will-dev` |
| HU-DIN-04 | Terminada (2026-11-15) | `will-dev` |
| HU-DIN-06 | Terminada (2026-11-15) | `will-dev` |
| HU-DIN-05 | Terminada (2026-11-15) | `will-dev` |
| HU-DIN-07 | Terminada (2026-11-15) | `will-dev` |
| HU-CLI-13 | Terminada (2026-11-18) | `will-dev` |
| HU-ABO-08 | Terminada (2026-11-18) | `will-dev` |
| HU-ABO-09 | Terminada (2026-11-18) | `will-dev` |
| HU-ABO-10 | Terminada (2026-11-19) | `will-dev` |

**Flujo de trabajo del back (desde 2026-11-13):** las HU se programan en la rama `will-dev`, con un commit por HU y la CI corriendo en cada push. No se abre un PR a `main` por cada HU; `main` se actualiza con un PR desde `will-dev` cuando se acuerde con el dueño. Antes de cada commit: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:rls && pnpm build`.

## Puntos de entrega: cuándo avisar al dueño
Cada vez que se termina una de estas HU, quien la hizo **avisa al dueño** con el mensaje indicado. El dueño hace su parte y responde "listo". Nadie pide ni pega claves en el chat: los valores los carga el dueño directamente en GitHub, Vercel o su `.env.local`.

| Cuando se termina… | Se avisa al dueño | El dueño hace |
|---|---|---|
| **HU-BASE-01** (CI corrió al menos una vez en GitHub) | "BASE-01 lista, la CI ya corrió" | En GitHub: *Settings → Rules → proteger-main → Require status checks* y agrega `ci`. Prueba con un PR que la CI en rojo no se pueda fusionar |
| **HU-BASE-03** (sesión con usuarios locales) | "BASE-03 lista" | Completa su `.env.local` con los valores de **staging** (guía 2.7) y crea su usuario admin: `pnpm user:create --email <correo> --name "<nombre>" --admin` (sin `--password` genera una clave y la muestra una vez; ver README del repositorio) |
| **HU-BASE-04** (catálogo y script de carga) | "BASE-04 lista" | Entrega la lista real de títulos (nombre, autor, categoría, precios) en el formato de `scripts/data/catalog.example.json`, como `scripts/data/catalog.json`; se carga con `pnpm catalog:load scripts/data/catalog.json`, primero a staging y después a producción |
| **Antes de empezar HU-BASE-07** | "Voy a empezar BASE-07" | Crea el repositorio privado de backups (OQ-42 ya decidido: GitHub; migrar a Cloudflare R2 al llegar a 3 GB) |
| **HU-BASE-07**, workflows escritos | "BASE-07 lista, faltan los secrets" | Carga los secrets en GitHub y Vercel; importa el proyecto en Vercel (guía 3.3); pone la URL en Supabase (3.5); verifica la restauración del backup |
| **HU-BASE-06** (PWA y sin conexión) y primer despliegue | "BASE-06 lista y desplegada" | Instala la app en su celular y prueba con y sin internet |

Mientras tanto, el dueño diseña lo que falta (Hoy, Calendario, Minibooks, Hacer inventario, Admin): no bloquea al back.

## Fuera de alcance de todas estas HU (back)
UI y componentes visibles; textos de pantalla; Hoy; Calendario, visitas, capacitaciones y recordatorios; ventas de minibooks, asignaciones a Abibonos y canje de saldo a favor; Hacer inventario y totalizadores; invitaciones, restablecimiento de contraseña y panel de admin; escritura sin conexión y push (fase 2); vista de líder (fase 3). Lo que falta por diseñar está en `04-diseno/pendientes/`.

---

## Front · iteración 1

> **Primera iteración (2026-11-17).** Estas HU describen la primera versión del front, hecha con la **Biblioteca de componentes v1.1** del lienzo. El diseño **va a cambiar**: las correcciones se hacen por *issues* y los cambios de diseño se anotan en la sección «Cambios por iteración» de cada HU (`00-REGLAS-COMUNES-FRONT.md` §2). La decisión de fondo está en ADR-0050.

### Empieza aquí (William)
1. **Trae los documentos a tu rama:** `git switch will-dev && git pull && git merge origin/main`. Resuelve conflictos si los hay; el código del back no cambia.
2. **Lee, en este orden:**
   1. ADR-0050;
   2. `00-REGLAS-COMUNES-FRONT.md`;
   3. la sección «Cómo iteramos» de abajo.
   Luego abre el lienzo (`https://claude.ai/artifact/RgxEeQ7BZExzaJVcih3AZV`), página **«Biblioteca de componentes»**: cada HU cita la ficha (`Lib-…`) que debe copiar.
3. **Programa en el orden de la tabla**, empezando por **HU-UI-01**, con una HU por sesión y un *commit* por HU en `will-dev`. Si usas una IA, pégale el texto de «Cómo pedirle a una IA…».
4. **El proyecto del Storybook en Vercel ya existe** (`colportor-storybook`). Se publica solo en cuanto HU-UI-01 agregue el script `build-storybook`; desde entonces, cada *push* a `will-dev` publica el Storybook.
5. **Al terminar cada bloque** (A, B, C…), mándale al dueño el enlace del Storybook y actualiza la tabla «Avance del front».
6. **Las correcciones llegan como *issues* «Corrección de diseño».** Ciérralas con el *commit* que las arregla (`fix(ui): … (#N)`). Si una corrección cambia una prop, un estado o una regla, anótala en «Cambios por iteración» de la HU.
7. **Si el diseño y una HU no coinciden, o falta algo, no inventes:** pregúntale al dueño y anótalo en `06-planificacion/OPEN-QUESTIONS.md`.

### Archivos comunes del front
| Archivo | Para qué |
|---|---|
| `00-REGLAS-COMUNES-FRONT.md` | Reglas de **todas** las HU del front: fuentes de verdad, iteración, capas de `src/ui`, tema y plataforma, tokens, íconos, textos, accesibilidad, stories obligatorias, pruebas y definición de terminado |
| `PLANTILLA-FRONT.md` | Plantilla para HU nuevas del front (un componente o una pantalla) |
| `INTERPRETACIONES.md` | Desde I-34: detalles del front que decidió el asistente (vetables) |

### Cómo iteramos (William y el dueño)
El ciclo más sencillo, sin instalar nada del lado del dueño:

1. **William termina una HU** y hace *push* a `will-dev`. El Storybook se publica solo, en la misma URL de siempre: `colportor-storybook-git-will-dev-emprendum.vercel.app` (pide iniciar sesión en Vercel).
2. **William avisa al terminar cada bloque** (no cada componente): «Átomos listos: <enlace>». Así el dueño revisa de una vez un grupo de piezas parecidas.
3. **El dueño revisa** cada componente:
   - cambia **Tema** (claro/oscuro), **Plataforma** (móvil/escritorio, o las dos lado a lado) y **Letra** en la barra superior;
   - lo compara con su ficha en el lienzo (el nombre de la ficha está en la página del componente).
4. **Por cada cosa que corregir**, pulsa **«Reportar corrección»** en la página del componente. Se abre un *issue* en GitHub con el componente ya escrito, y elige el tipo:
   - **«No se parece al diseño»:** William lo corrige; nada más cambia.
   - **«Quiero cambiar el diseño»:** primero se cambia la ficha en el lienzo (con Claude Design), para que el diseño siga siendo la fuente. Si es un color o un tamaño, basta cambiar el token. William actualiza la HU («Cambios por iteración») y lo programa.
5. **William cierra el *issue*** con el *commit* que lo arregla (`fix(ui): … (#12)`). El dueño lo verifica en el mismo enlace.

Regla práctica: **una corrección por *issue***, con captura si se puede. Lo que se decide en una conversación también se anota en el *issue*, para que no se pierda.

### Cómo pedirle a una IA que implemente una HU del front
```text
Implementa la HU docs/07-historias-usuario/<05-ui|06-pantallas>/<archivo>.md.
Antes de escribir código, lee AGENTS.md, docs/07-historias-usuario/00-REGLAS-COMUNES-FRONT.md, la HU completa,
ADR-0050 y la ficha del diseño que cita (lienzo, página «Biblioteca de componentes»). Respeta el "No incluye".
Usa solo tokens, <Icon> y textos de copy/es.ts. Escribe las stories de la sección «Stories» y las pruebas
de los criterios de aceptación; corre pnpm lint && pnpm typecheck && pnpm test && pnpm build-storybook.
Si el diseño y la HU no coinciden, o falta un dato, detente y pregúntame; no inventes. Al terminar, recorre
cada criterio de aceptación y dime cómo quedó verificado, con el enlace de cada story.
```

### Orden de implementación
Una HU empieza cuando sus dependencias están terminadas. Las del mismo bloque sin dependencia entre sí pueden ir en paralelo.

| Bloque | HU | Título | Depende de |
|---|---|---|---|
| A · Cimientos | [HU-UI-01](05-ui/HU-UI-01-storybook-y-ciclo-de-revision.md) | Storybook, estructura de `src/ui` y ciclo de revisión | BASE-01 |
| A | [HU-UI-02](05-ui/HU-UI-02-tokens-y-fundamentos.md) | Tokens y fundamentos | UI-01 |
| A | [HU-UI-03](05-ui/HU-UI-03-icono.md) | Ícono (Lucide) | UI-02 |
| B · Átomos | [HU-UI-04](05-ui/HU-UI-04-boton.md) | Botón | UI-03 |
| B | [HU-UI-05](05-ui/HU-UI-05-pastilla-de-estado.md) | Pastilla de estado | UI-03 |
| B | [HU-UI-06](05-ui/HU-UI-06-chip.md) | Chip | UI-03 |
| B | [HU-UI-07](05-ui/HU-UI-07-etiqueta.md) | Etiqueta | UI-03 |
| B | [HU-UI-08](05-ui/HU-UI-08-avatar.md) | Avatar | UI-03 |
| B | [HU-UI-09](05-ui/HU-UI-09-campo.md) | Campo de formulario | UI-03 |
| B | [HU-UI-10](05-ui/HU-UI-10-seleccion.md) | Selección (casilla, radio, interruptor) | UI-03 |
| C · Moléculas | [HU-UI-11](05-ui/HU-UI-11-pestanas.md) | Pestañas | UI-02 |
| C | [HU-UI-12](05-ui/HU-UI-12-buscador.md) | Buscador | UI-04 |
| C | [HU-UI-13](05-ui/HU-UI-13-fila-de-dato.md) | Fila de dato | UI-03 |
| C | [HU-UI-14](05-ui/HU-UI-14-fila-de-lista.md) | Fila de lista | UI-05..08 |
| C | [HU-UI-15](05-ui/HU-UI-15-aviso.md) | Aviso (con Deshacer) | UI-04 |
| C | [HU-UI-16](05-ui/HU-UI-16-franja.md) | Franja | UI-03 |
| C | [HU-UI-17](05-ui/HU-UI-17-tarjeta-de-metrica.md) | Tarjeta de métrica | UI-02 |
| C | [HU-UI-18](05-ui/HU-UI-18-medidor.md) | Medidor | UI-02 |
| C | [HU-UI-19](05-ui/HU-UI-19-historial.md) | Historial | UI-04 |
| C | [HU-UI-20](05-ui/HU-UI-20-menu.md) | Menú y campo de selección | UI-09 |
| D · Organismos | [HU-UI-21](05-ui/HU-UI-21-encabezado.md) | Encabezado | UI-04 |
| D | [HU-UI-22](05-ui/HU-UI-22-isla.md) | Isla | UI-13, UI-19 |
| D | [HU-UI-23](05-ui/HU-UI-23-navegacion.md) | Navegación | UI-04, UI-08 |
| D | [HU-UI-24](05-ui/HU-UI-24-dialogo.md) | Diálogo | UI-04 |
| D | [HU-UI-25](05-ui/HU-UI-25-resumen-de-dinero.md) | Resumen de dinero | UI-17, UI-18, UI-24 |
| D | [HU-UI-26](05-ui/HU-UI-26-estado-vacio.md) | Estado vacío y de carga | UI-04 |
| D | [HU-UI-27](05-ui/HU-UI-27-ventana-de-detalle.md) | Ventana de detalle | UI-11, UI-21, UI-22 |
| E · Plantillas | [HU-UI-28](05-ui/HU-UI-28-plantilla-de-lista.md) | Plantilla de lista y Barra de vista | C y D |
| E | [HU-UI-29](05-ui/HU-UI-29-plantilla-de-detalle.md) | Plantilla de detalle en islas | UI-16, UI-22, UI-27 |
| F · App | [HU-PAN-BASE-01](06-pantallas/HU-PAN-BASE-01-armazon-de-la-app.md) | Armazón: rutas, navegación, avisos y textos | UI-23, UI-15, UI-16, UI-26 |
| F | [HU-PAN-BASE-02](06-pantallas/HU-PAN-BASE-02-iniciar-sesion.md) | Iniciar sesión | **Bloqueada: espera diseño (OQ-44)** |
| G · Clientes | [HU-PAN-CLI-01](06-pantallas/HU-PAN-CLI-01-lista-de-clientes.md) | Lista de clientes | UI-28, PAN-BASE-01 |
| G | [HU-PAN-CLI-02](06-pantallas/HU-PAN-CLI-02-ficha-de-cliente.md) | Ficha de cliente | UI-29, PAN-CLI-01 |
| G | [HU-PAN-CLI-03](06-pantallas/HU-PAN-CLI-03-crear-y-editar-cliente.md) | Crear cliente (ficha viva), guardar y descartar | PAN-CLI-02 |
| G | [HU-PAN-CLI-04](06-pantallas/HU-PAN-CLI-04-agregar-y-quitar-libros.md) | Agregar libro, quitarlo y devolverlo | PAN-CLI-02 |
| G | [HU-PAN-CLI-05](06-pantallas/HU-PAN-CLI-05-abonos-en-la-ficha.md) | Abonos en la ficha: cambiar fecha | PAN-CLI-03 |
| G | [HU-PAN-CLI-06](06-pantallas/HU-PAN-CLI-06-informacion-direccion-y-ubicacion.md) | Información, dirección y ubicación | PAN-CLI-02 |
| H · Inventario | [HU-PAN-INV-01](06-pantallas/HU-PAN-INV-01-libros-en-fisico-y-por-resolver.md) | Libros en físico y Por resolver | UI-28, PAN-BASE-01 |
| H | [HU-PAN-INV-02](06-pantallas/HU-PAN-INV-02-lista-de-ejemplares.md) | Lista de ejemplares | UI-28 |
| H | [HU-PAN-INV-03](06-pantallas/HU-PAN-INV-03-detalle-de-ejemplar.md) | Detalle de un ejemplar y sus acciones | UI-29, PAN-INV-02 |
| H | [HU-PAN-INV-04](06-pantallas/HU-PAN-INV-04-agregar-al-inventario.md) | Agregar al inventario | PAN-INV-01 |
| H | [HU-PAN-INV-05](06-pantallas/HU-PAN-INV-05-devolver-al-lider.md) | Devolver al líder | PAN-INV-01 |
| I · Dinero | [HU-PAN-DIN-01](06-pantallas/HU-PAN-DIN-01-dinero-y-abonos-de-clientes.md) | Dinero: resumen y abonos de clientes | UI-25, UI-28, PAN-BASE-01 |
| I | [HU-PAN-DIN-02](06-pantallas/HU-PAN-DIN-02-detalle-de-abono-cobrar-y-mas-plazo.md) | Detalle de un abono: cobrar y dar más plazo | UI-29, PAN-DIN-01 |
| I | [HU-PAN-DIN-03](06-pantallas/HU-PAN-DIN-03-lista-de-abibonos.md) | Lista de Abibonos | PAN-DIN-01 |
| I | [HU-PAN-DIN-04](06-pantallas/HU-PAN-DIN-04-nuevo-abibono-y-borradores.md) | Nuevo Abibono, borradores y confirmar | PAN-DIN-03, UI-27 |
| I | [HU-PAN-DIN-05](06-pantallas/HU-PAN-DIN-05-abibono-entregado-y-reabrir.md) | Abibono entregado y reabrir | PAN-DIN-04 |

Los bloques G, H e I pueden ir en paralelo cuando terminan A–F. HU-PAN-CLI-03, CLI-04 y CLI-05 usan HU del back aún pendientes (CLI-13, ABO-08, ABO-09): la parte que depende de ellas se activa cuando el back esté listo.

### Lo que la biblioteca aún no tiene
Piezas que las **pantallas** del lienzo dibujan pero que no están en la **biblioteca**. Se programan como piezas del módulo (`00-REGLAS-COMUNES-FRONT.md` §1) y se le piden al diseño para subirlas a la biblioteca:

| Pieza | Dónde aparece | HU |
|---|---|---|
| Calendario para elegir fecha | Cambiar fecha de abono; Dar más plazo | PAN-CLI-05 (hecho: piezas `DatePickerCalendar` y `ChangeDueDateDialog`), PAN-DIN-02 |
| Plan de abonos (frecuencia, valor, lista previa) | Crear cliente | PAN-CLI-03 (hecho: pieza `PaymentPlanFields`) |
| Botones segmentados (Medio de pago, Frecuencia) | Crear cliente | PAN-CLI-03 (se usó la Selección radio de la biblioteca) |
| **Factura en la ficha nueva** (fotos, N.º y fecha) — dibujada, **sin HU de pantalla** | Crear cliente | Ninguna: decidir dónde va |
| Mapa y selector de ubicación | Información y dirección; Elegir ubicación | PAN-CLI-06 (hecho: piezas `MapCanvas`, `MapPreview`, `LocationPicker` y `CustomerLocationBlock`; proveedor de teselas pendiente, SG-09) |
| Íconos de mapa, abrir afuera, cámara, recentrar y GPS tachado | Información y dirección; Elegir ubicación | PAN-CLI-06 (se usaron los de la biblioteca) |
| Fila que se desliza (móvil) | Dinero (Cobrar / Más plazo); Por resolver | PAN-DIN-02, PAN-INV-01 (hecho: pieza `SwipeRow`, con las acciones también por teclado) |
| Botón de título con contador (escritorio) y control de cantidad que se escribe (móvil) | Agregar al inventario | PAN-INV-04 (hecho: piezas `TitleTile` y `QuantityControl`) |
| Fila de ejemplar con **Diferencia**, fecha de venta, número y cliente en móvil; Pastilla **Perdido** y **Devuelto al líder**; ranura `sections` de la Plantilla de lista | Ejemplares | PAN-INV-02 (ya en `ui/`: subirlo a Lib-FilaLista, Lib-Pastilla y Lib-Plantilla-Lista) |
| Fila de título en físico (portada, nombre, precio, cantidad) y lista Por resolver con acciones | Libros en físico; Por resolver | PAN-INV-01 (hecho: filas en la pantalla y pieza `FlaggedCopiesList`) |
| Botón de título con imagen y contador; cantidad | Agregar al inventario | PAN-INV-04 |
| Fotos (miniaturas, agregar, quitar) | Recibos del Abibono; facturas; fotos de información | PAN-DIN-04, PAN-CLI-02, PAN-CLI-06 (hecho para información: pieza `InfoPhotoStrip`, miniaturas y agregar) |
| Tabla de abonos con Valor acordado, Fecha real, Valor real y Método (la Fila «payment» solo trae Cuota y Monto) | Dinero · Abonos de clientes | PAN-DIN-01 (hecho: pieza `PaymentsTable`; se pide subirla a la biblioteca) |
| Tipo «abibono» en la Fila de lista | Lista de Abibonos | PAN-DIN-03 (se pide antes de programar) |
| Barra de avance «Abonado el N %» (pieza `CustomerAccountSummary`) | Ficha de cliente | PAN-CLI-02 |
| Isla de identidad sin Pastilla (prospecto) y con contenido a todo el ancho (`details`) | Ficha de cliente | PAN-CLI-02 (ya en `ui/`: subirlo a Lib-Plantilla-Detalle) |
| Segunda salida del Estado vacío (enlace debajo de la acción); botón flotante deshabilitado sin conexión | Búsqueda de clientes sin resultados (HU-CLI-05); Clientes sin conexión | PAN-CLI-01 (ya en `ui/`: subirlo a las fichas Lib-EstadoVacio y Lib-Navegacion) |

Sin dibujo en ninguna parte (no se programan hasta su diseño): **Iniciar sesión** (OQ-44), selector de emoji (FC-02), los formularios de abonos de FC-09 a FC-12, y lo demás de `04-diseno/pendientes/FALTA-*.md`.

### Avance del front
| HU | Estado | Dónde |
|---|---|---|
| HU-UI-01 | Terminada (2026-11-17); falta que el dueño abra el enlace y pruebe «Reportar corrección» | `will-dev` |
| HU-UI-02 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-03 | Terminada (2026-11-18); bloque A listo para revisión | `will-dev` |
| HU-UI-04 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-05 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-06 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-07 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-08 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-09 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-10 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-11 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-12 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-13 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-14 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-15 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-16 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-17 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-18 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-19 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-20 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-21 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-22 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-23 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-24 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-25 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-26 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-27 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-28 | Terminada (2026-11-18) | `will-dev` |
| HU-UI-29 | Terminada (2026-11-18) | `will-dev` |
| HU-PAN-BASE-01 | Terminada (2026-11-18); falta probar en el celular del dueño (necesita HU-PAN-BASE-02) | `will-dev` |
| HU-PAN-BASE-02 | Bloqueada (espera diseño, OQ-44) | — |
| HU-PAN-CLI-01 | Terminada (2026-11-18); la ficha que abre llega con HU-PAN-CLI-02 | `will-dev` |
| HU-PAN-CLI-02 | Terminada (2026-11-18); los botones que escriben llegan con CLI-03 a 06 y DIN-02 | `will-dev` |
| HU-PAN-CLI-03 | Terminada (2026-11-19); libros, dirección e información llegan con CLI-04 y CLI-06 | `will-dev` |
| HU-PAN-CLI-04 | Terminada (2026-11-19); devolver con motivo espera FC-06 | `will-dev` |
| HU-PAN-CLI-05 | Terminada (2026-11-19); registrar, programar, editar y cancelar esperan FC-09 a FC-12 | `will-dev` |
| HU-PAN-CLI-06 | Programada (2026-11-19); no se da por terminada hasta que el dueño decida el proveedor del mapa y la pruebe en su iPhone (SG-09) | `will-dev` |
| HU-PAN-INV-01 | Terminada (2026-11-19); «Devolver al líder» llega con INV-05 y el panel Agregar con INV-04 | `will-dev` |
| HU-PAN-INV-02 | Terminada (2026-11-19); abrir una fila espera INV-03 | `will-dev` |
| HU-PAN-INV-03 | Terminada (2026-11-19); sin Franja ni «Devolver al líder» (INV-05) | `will-dev` |
| HU-PAN-INV-04 | Terminada (2026-11-19) | `will-dev` |
| HU-PAN-INV-05 | Terminada (2026-11-19) | `will-dev` |
| HU-PAN-DIN-01 | Terminada (2026-11-19) | `will-dev` |
| HU-PAN-DIN-02 | Terminada (2026-11-19) | `will-dev` |
| HU-PAN-DIN-03 a 05 | Pendientes | — |

**Flujo de trabajo del front:** igual que el back, en `will-dev`, un *commit* por HU. Antes de cada *commit*: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm build-storybook`.

### Puntos de entrega del front
| Cuando se termina… | Se avisa al dueño | El dueño hace |
|---|---|---|
| **HU-UI-01** | «UI-01 lista: <enlace del Storybook>» | Abre el enlace (inicia sesión en Vercel con la cuenta Emprendum), prueba Tema, Plataforma y Letra, y abre un *issue* de prueba. El proyecto `colportor-storybook` ya está creado (2026-11-17) |
| **Cada bloque (A a I)** | «Bloque <X> listo: <enlace>» | Revisa en el Storybook y reporta correcciones (ver «Cómo iteramos») |
| **HU-PAN-CLI-06** | «Falta el proveedor del mapa» | Decide SG-09 y prueba la ubicación en su iPhone |
| **HU-PAN-BASE-01 y primer despliegue** | «La app ya se puede abrir» | Prueba en su celular (necesita HU-PAN-BASE-02, que espera su diseño) |

### Fuera de alcance del front (iteración 1)
Pantallas sin diseño (Hoy, Calendario, Minibooks, Hacer inventario, Admin, Iniciar sesión, Ajustes); escritura sin conexión (fase 2); vista de líder (fase 3); revisión visual automatizada por capturas.
