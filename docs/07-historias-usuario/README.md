# Historias de usuario del back: Clientes, Inventario y Dinero

Historias de usuario (HU) para construir **toda la lógica** (todo lo que no es UI) de los tres módulos diseñados: **Clientes, Inventario y Dinero**, más unos cimientos mínimos (ADR-0041). Las escribió un asistente de IA el 2026-11-08, después de cruzar el diseño exportado con los docs (DECISION-LOG ronda 26).

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

**Flujo de trabajo del back (desde 2026-11-13):** las HU se programan en la rama `will-dev`, con un commit por HU y la CI corriendo en cada push. No se abre un PR a `main` por cada HU; `main` se actualiza con un PR desde `will-dev` cuando se acuerde con el dueño. Antes de cada commit: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:rls && pnpm build`.

## Puntos de entrega: cuándo avisar al dueño
Cada vez que se termina una de estas HU, quien la hizo **avisa al dueño** con el mensaje indicado. El dueño hace su parte y responde "listo". Nadie pide ni pega claves en el chat: los valores los carga el dueño directamente en GitHub, Vercel o su `.env.local`.

| Cuando se termina… | Se avisa al dueño | El dueño hace |
|---|---|---|
| **HU-BASE-01** (CI corrió al menos una vez en GitHub) | "BASE-01 lista, la CI ya corrió" | En GitHub: *Settings → Rules → proteger-main → Require status checks* y agrega `ci`. Prueba con un PR que la CI en rojo no se pueda fusionar |
| **HU-BASE-03** (sesión con usuarios locales) | "BASE-03 lista" | Completa su `.env.local` con los valores de **staging** (guía 2.7) y crea su usuario admin: `pnpm user:create --email <correo> --name "<nombre>" --admin` (sin `--password` genera una clave y la muestra una vez; ver README del repositorio) |
| **HU-BASE-04** (catálogo y script de carga) | "BASE-04 lista" | Entrega la lista real de títulos (nombre, autor, categoría, precios) en el formato de `scripts/data/catalog.example.json`, como `scripts/data/catalog.json`; se carga con `pnpm catalog:load scripts/data/catalog.json`, primero a staging y después a producción |
| **Antes de empezar HU-BASE-07** | "Voy a empezar BASE-07" | Decide el destino de los backups (OQ-42) |
| **HU-BASE-07**, workflows escritos | "BASE-07 lista, faltan los secrets" | Carga los secrets en GitHub y Vercel; importa el proyecto en Vercel (guía 3.3); pone la URL en Supabase (3.5); verifica la restauración del backup |
| **HU-BASE-06** (PWA y sin conexión) y primer despliegue | "BASE-06 lista y desplegada" | Instala la app en su celular y prueba con y sin internet |

Mientras tanto, el dueño diseña lo que falta (Hoy, Calendario, Minibooks, Hacer inventario, Admin): no bloquea al back.

## Fuera de alcance de todas estas HU
UI y componentes visibles; textos de pantalla; Hoy; Calendario, visitas, capacitaciones y recordatorios; ventas de minibooks, asignaciones a Abibonos y canje de saldo a favor; Hacer inventario y totalizadores; invitaciones, restablecimiento de contraseña y panel de admin; escritura sin conexión y push (fase 2); vista de líder (fase 3). Lo que falta por diseñar está en `04-diseno/pendientes/`.
