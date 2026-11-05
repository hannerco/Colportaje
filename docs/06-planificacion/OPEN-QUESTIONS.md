# Preguntas abiertas, supuestos y seguimientos

**Estado actual: no queda ninguna pregunta abierta de producto ni de arquitectura.** Todas las dudas del documento original se resolvieron en la entrevista (ver `00-contexto/DECISION-LOG.md`, rondas 7–9). Este archivo conserva:

1. **Seguimientos (SG-*)** — cosas ya decididas que requieren una acción concreta, con responsable.
2. **Cosas por revisar (RV-*)** — decisiones que el dueño quiere reevaluar con uso real.
3. **Decisiones de diseño (DT-*)** — se toman con el diseño (ver `04-diseno/DESIGN-BRIEF.md` §11).
4. **Backlog declarado.**
5. **Tabla de resolución** de las preguntas abiertas anteriores (para trazabilidad).

Si aparece una duda nueva, se agrega aquí con ID `OQ-*` y un supuesto por defecto, y se pregunta al dueño.

---

## 1. Seguimientos (decididos, con acción pendiente)

| ID | Qué | Quién | Cuándo |
|---|---|---|---|
| SG-01 | Repetir la **medición de latencia desde un celular con datos móviles** para confirmar us-east-1 (medido ~85 ms vs ~146 ms de São Paulo, desde Medellín, línea fija) | Agente + dueño | Antes de crear los proyectos |
| SG-02 | **Crear las cuentas nuevas** de Supabase y Vercel y hacer login por CLI (`supabase login`, `vercel login`) siguiendo `05-operacion/GUIA-DESPLIEGUE-PASO-A-PASO.md` | Dueño | Cuando llegue el momento de desplegar |
| SG-03 | **Repositorio GitHub `Colportaje`**: creado y con la documentación subida (2026-11-04). Es **público** (sin las imágenes de referencia); pasarlo a **privado** antes de subir código, claves o datos | Dueño | Antes de comenzar a programar |
| SG-04 | **Fecha de diseño en Claude Design**: el diseño debe estar elegido en los primeros 2–3 días del plazo de 14 | Dueño | Día 1–3 |
| SG-05 | **Aviso de tratamiento de datos (Ley 1581)**: el agente redacta la **plantilla con huecos** (responsable y correo de contacto) en `docs/05-operacion/AVISO-DATOS-PLANTILLA.md`; el dueño define responsable y alguien con criterio legal la revisa antes de abrir a otros colportores | Agente / dueño | Antes del piloto con otros |
| SG-06 | **Decidir el paso a Supabase Pro (~25 USD/mes)** cuando el equipo use la app con dinero real (copias diarias, sin pausa) | Dueño | Tras validar con los colportores |
| SG-07 | **Presentar la app a Emprendum** (marca "Colportor") cuando se valide con los colportores | Dueño | Tras validar |
| SG-09 | **Elegir el proveedor de teselas del mapa** (plan gratuito; **no** el servidor público de OpenStreetMap) y **probar la geolocalización en un iPhone real** (el permiso puede repetirse en cada apertura) | Agente + dueño | Al implementar la ficha de cliente |
| SG-10 | **Elegir y probar el selector de emojis** (candidato `frimousse`; verificar mantenimiento activo), asegurar que sus datos queden guardados para funcionar **sin conexión** y revisar cómo se ve cada emoji en Android e iPhone | Agente | Al implementar el avatar |
| SG-08 | Nombre de dominio propio y correo SMTP para enviar invitaciones por correo (hoy: enlace por WhatsApp) | Dueño | Opcional, futuro |

## 2. Cosas por revisar con uso real

| ID | Tema | Estado actual | Condición para reabrir |
|---|---|---|---|
| RV-01 | **Nombres "Catálogo / Libros / Ejemplar / Título"** en la interfaz | Decisión del agente (el dueño propuso "Títulos y Ejemplares" por considerarlos menos ambiguos, pero prefirió confiar en la recomendación): *Catálogo* en el admin, *Libros* para el colportor, *Ejemplar* para la unidad, *Título* sobre todo en código y tooltips | Si el dueño ve **confusión** en uso, pide el cambio |
| RV-02 | **Ubicación y existencia de la barra de meta** | En Hoy | Si no le gusta (DT-02) |
| RV-03 | **Nombre "Abibono"** | Se conserva (chiste interno), tooltip "Entrega al líder" | Si confunde a nuevos colportores |
| RV-04 | Orden de recorte de abonos programados (BR-PAY-13: más próximo tras abono extra, más lejano tras devolución) | Sugerencia modificable por el usuario en el modal | Si resulta incómodo |
| RV-05 | **Tamaño de la letra en móvil** | Escala inicial: texto principal 17 px, secundario 15, mínimo 13 (basada en iOS/Material). El dueño siente que en los diseños el móvil se ve grande | Al ver la app en un dispositivo real: ajustar `--font-scale` o los tokens por rol (BR-GEN-13); cambiarlo es una sola variable |
| RV-06 | ~~Flujo de venta: asistente vs ficha viva~~ | **Resuelto (2026-11-03):** el dueño habló con usuarios del Notion y decidió **ficha viva** ("Nuevo cliente"); ya no hay "Vender" (ADR-0035) | — |
| RV-07 | **Pestañas del cliente solapadas con el filtro de estado** (Todos / Deudores / Saldados / Archivados vs. filtro Pagando / Vencido / Saldado) | Se conservan por ser lo más sencillo y visual (ronda 19) | Si resultan redundantes o confusas en la siguiente versión |

## 3. Decisiones de diseño
Ver `04-diseno/DESIGN-BRIEF.md` §13: DT-01 (total de deuda en Clientes), DT-02 (barra de meta), DT-03 ("Con novedad"), DT-04 (íconos), DT-05 (~~antigüedad~~, cancelada en la ronda 21), DT-06 (barra de vista), DT-07 (tonos de los microíconos de tipo de evento), **DT-09 (redefinir "Hoy": ver abajo)**, **DT-10 (identificador visual del Título)**, **DT-11 (color de «Entregado»: dorado o azul)**. **DT-08 cerrada** (ronda 19): ítem del sidebar bajo Hoy + botón en Clientes.

**DT-09 · Redefinir "Hoy" (2026-11-04).** El dueño quiere que Hoy sea un **resumen general**. A grandes rasgos debe tener: (1) lo que hay en el **calendario para hoy**; (2) una **vista fácil de abonos** para chequearlos y **cobrarlos rápido**; (3) un **resumen de los libros en físico**; (4) otras cosas **sin definir**. Esto **reemplaza en parte** la spec minimalista de BR-CAL-07/08 y del prompt («Spec de HOY»); no está decidido el detalle, se define cuando se diseñe Hoy. **Agregar al inventario NO va en Hoy**: vive en Inventario. Detalle y preguntas pendientes: `04-diseno/HOY-BORRADOR.md`.

**DT-10 · Identificador visual del Título (2026-11-04).** Cada título debe poder reconocerse en las listas. Candidatos: **ícono** de un solo color gestionado por el admin (la inclinación del dueño), **portada** (BR-TIT-02 ya tiene `imagen`) o **emoji** (lo que usaba en Notion). Se decide **cuando las listas ya estén diseñadas**, viendo variantes de Claude Design con las tres opciones. Las portadas de ejemplo están en `04-diseno/referencias/portadas/` y tienen proporciones distintas (673×995, 600×600, 500×667, 373×551), así que cualquier uso de la portada exige recorte a una proporción fija.

## 4. Backlog declarado (explícito por el dueño)
- **Campañas** (tabla, filtros, metas por campaña, apartado de Metas ampliado: "en la nueva etapa tendrá muchas cosas").
- **Exportar "Hacer inventario" a PDF y CSV** ("en el futuro se podrá descargar"). Hoy: solo **Copiar resumen**.
- Cortes históricos de "Hacer inventario".
- Reembolsos a clientes.
- **Fusión de clientes duplicados.**
- Edición masiva de "Recibido el".
- Recordatorios/seguimiento de personas interesadas en minibooks.
- Posible eliminación de totalizadores (cada uno es una pieza registrada).
- Migración de fotos a Cloudflare R2 al 70 % de uso.
- Vista de clientes vencidos.
- **Filtro de clientes por libro** (hoy la búsqueda ya encuentra por título, BR-CUS-07).
- Buscador "Agregar libro del inventario" de la ficha: definir con el diseño de Inventario (datos por libro, agotados, precio de inventario, búsqueda y orden).
- Invitaciones por correo automáticas (con dominio + SMTP propio).
- Offline de escritura y push (**fase 2**) y vista de líder (**fase 3**).

## 5. Tabla de resolución de preguntas anteriores

| ID previo | Tema | Resolución |
|---|---|---|
| OQ-01 | "Recientes" | Fecha de creación descendente + selector de orden (BR-CUS-05) |
| OQ-02 | Barra de meta | En Hoy; sujeta a diseño (DT-02) |
| OQ-03 | "Con novedad" | Resolución Apareció / Perdido (lo asumo yo) / Eliminar; diseño abierto (DT-03); sin mención al líder (BR-COPY-11) |
| OQ-04 | Máx. favoritos | 6, editable por admin (BR-INV-02) |
| OQ-05 | `received_at` editable | Sí: fecha pasada al agregar y edición en línea (BR-COPY-04) |
| OQ-06 | Hora de inicio del día | 07:00; sin recordatorios por defecto (BR-CAL-04) |
| OQ-07 | Tope saldo a favor | Monto ≤ saldo a favor vigente (BR-MBK-07) |
| OQ-08 | Fotos de recibo | Una por defecto, "Añadir otra" (BR-DEP-09) |
| OQ-09 | Compartir "Hacer inventario" | Solo "Copiar resumen"; PDF/CSV futuro (BR-GOAL-05) |
| OQ-10 | Borrado de cliente | Se reemplaza por **Archivar** (BR-CUS-09) |
| OQ-11 | Abono entre varios Abibonos | No; completo en uno (BR-DEP-08) |
| OQ-12 | Libros perdidos | El colportor asume; "A responder al líder" (BR-COPY-11, BR-GOAL-07) |
| OQ-13 | Nombres definitivos | Cerrados en `00-contexto/GLOSSARY.md`; revisión RV-01/RV-03 |
| OQ-14 | Ordenamientos de ejemplares | Recibido, vendido, título, precio acordado, diferencia |
| OQ-15 | Visibilidad de cifras | BR-GOAL-06 |
| OQ-16 | Abonos programados tras devolución | Alerta y recorte; `canceled` conservado (BR-PAY-13) |
| OQ-20 | Número de ejemplar offline (F2) | Provisional con marca; puede cambiar al sincronizar (BR-COPY-05) |
| OQ-21 | Búsqueda | Fuse.js |
| OQ-22 | UI | Tailwind + shadcn/ui, estilo Notion |
| OQ-23 | Captura de fotos | `<input type=file capture>` |
| OQ-24 | Invitaciones | Desde el panel de admin: enlace copiable (BR-USR-05) |
| OQ-25 | Nombre de la app | **Colportor** (marca de Emprendum) |
| OQ-26 | Ley 1581 | Plantilla con huecos; SG-05 |
| OQ-27 | Región | **us-east-1** (medido) — ADR-0002 |
| OQ-28 | Plan de Supabase | Cuenta nueva, dos proyectos, ping anti-pausa, backups cada 2 días; Pro más adelante (SG-06) |
| OQ-29 | Vercel Hobby | Cuenta nueva, plan gratuito; decidido sobre Render |

## 6. Supuestos de reglas pendientes de confirmar (surgidos al preparar el dominio, 2026-10-29)
El código que los aplicaba se descartó el 2026-11-04; los supuestos quedan como valor por defecto para cuando se programe. El dueño ya resolvió ese día: orden de recorte, motivo de cancelación, prórroga y minibooks perdidos (ADR-0033).

| ID | Supuesto | Dónde vive | Estado |
|---|---|---|---|
| OQ-30 | Desempates deterministas: dos abonos programados con la misma fecha se recortan por orden de creación y luego por id; en el FIFO de minibooks, ejemplares recibidos el mismo día salen por número y luego por id | — | Por confirmar |
| OQ-31 | Los "2 meses" de la prórroga se cuentan **desde hoy**, en meses calendario (31/12 + 2 meses = 28/02) y el límite exacto sí se acepta sin confirmar | — | Por confirmar |
| OQ-32 | "Entregado al líder" en los totalizadores de minibooks suma solo asignaciones de Abibonos **confirmados** (un borrador aún no se entregó), igual que "Total abonado" | — | Por confirmar |
| OQ-33 | Editar un abono **por cobrar** solo cambia su valor acordado; las fechas se cambian únicamente con una prórroga (así siempre queda historial y `original_due_date` no cambia) | — | Por confirmar |
| OQ-34 | La fecha de una entrada de minibooks acepta cualquier día válido (no se restringe a no futura) y una venta normal ignora el cliente que se envíe | — | Por confirmar |
| OQ-35 | Al borrar una entrada de minibooks, el historial de cada ejemplar registra `returned` con motivo `wrong_registration` (no cuenta como devolución de un cliente) | — | Por confirmar |
| OQ-36 | Borrar un abono cobrado se trata como disparador de BR-PAY-13 con orden "más próximo" y motivo `manual` | — | Por confirmar |
| OQ-38 | **Avatar por defecto sin emoji:** ícono de persona (es derivado, el dominio no lo almacena) | `BR-CUS-15` | **Resuelto (ronda 19)** |
| OQ-39 | El diseño no pinta el monto en rojo cuando el cliente está vencido (lo marca el ícono de estado); BR-CUS-13 lo anota como pendiente | `BR-CUS-13` | **Por confirmar con el dueño** |
