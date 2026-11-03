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
| SG-03 | **Crear el repositorio GitHub** (privado, nombre `colportor`) y subir el commit inicial (el modo automático bloqueó el comando; lo corre el dueño con `! `) | Dueño | Antes de comenzar a programar |
| SG-04 | **Fecha de diseño en Claude Design**: el diseño debe estar elegido en los primeros 2–3 días del plazo de 14 | Dueño | Día 1–3 |
| SG-05 | **Aviso de tratamiento de datos (Ley 1581)**: el agente redacta la **plantilla con huecos** (responsable y correo de contacto) en `docs/05-operacion/AVISO-DATOS-PLANTILLA.md`; el dueño define responsable y alguien con criterio legal la revisa antes de abrir a otros colportores | Agente / dueño | Antes del piloto con otros |
| SG-06 | **Decidir el paso a Supabase Pro (~25 USD/mes)** cuando el equipo use la app con dinero real (copias diarias, sin pausa) | Dueño | Tras validar con los colportores |
| SG-07 | **Presentar la app a Emprendum** (marca "Colportor") cuando se valide con los colportores | Dueño | Tras validar |
| SG-09 | **Elegir el proveedor de teselas del mapa** (plan gratuito; **no** el servidor público de OpenStreetMap) y **probar la geolocalización en un iPhone real** (el permiso puede repetirse en cada apertura) | Agente + dueño | Al implementar la ficha de cliente |
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

## 3. Decisiones de diseño
Ver `04-diseno/DESIGN-BRIEF.md` §13: DT-01 (total de deuda en Clientes), DT-02 (barra de meta), DT-03 ("Con novedad"), DT-04 (íconos), DT-05 (antigüedad), DT-06 (barra de vista), DT-07 (tonos de los microíconos de tipo de evento), **DT-08 (ubicación de "Nuevo cliente" en escritorio: 4 opciones)**.

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

## 6. Supuestos tomados al implementar el dominio (2026-10-29)
No bloquean nada y el código ya los aplica; se anotan aquí para que el dueño los confirme o los cambie. Resueltas por el dueño ese día: orden de recorte, motivo de cancelación, prórroga y minibooks perdidos (ADR-0033).

| ID | Supuesto | Dónde vive | Estado |
|---|---|---|---|
| OQ-30 | Desempates deterministas: dos abonos programados con la misma fecha se recortan por orden de creación y luego por id; en el FIFO de minibooks, ejemplares recibidos el mismo día salen por número y luego por id | `payment.ts` (`compareByDueDate`), `minibook.ts` (`compareFifo`) | Por confirmar |
| OQ-31 | Los "2 meses" de la prórroga se cuentan **desde hoy**, en meses calendario (31/12 + 2 meses = 28/02) y el límite exacto sí se acepta sin confirmar | `payment.ts` (`RESCHEDULE_CONFIRMATION_MONTHS`) | Por confirmar |
| OQ-32 | "Entregado al líder" en los totalizadores de minibooks suma solo asignaciones de Abibonos **confirmados** (un borrador aún no se entregó), igual que "Total abonado" | `minibook.ts` (`minibookTotals`) | Por confirmar |
| OQ-33 | Editar un abono **por cobrar** solo cambia su valor acordado; las fechas se cambian únicamente con una prórroga (así siempre queda historial y `original_due_date` no cambia) | `payment.ts` (`editScheduledAmount`) | Por confirmar |
| OQ-34 | La fecha de una entrada de minibooks acepta cualquier día válido (no se restringe a no futura) y una venta normal ignora el cliente que se envíe | `minibook.ts` | Por confirmar |
| OQ-35 | Al borrar una entrada de minibooks, el historial de cada ejemplar registra `returned` con motivo `wrong_registration` (no cuenta como devolución de un cliente) | `minibook.ts` (`deleteMinibookSale`) | Por confirmar |
| OQ-36 | Borrar un abono cobrado se trata como disparador de BR-PAY-13 con orden "más próximo" y motivo `manual` | `schedule-excess.ts` | Por confirmar |
| OQ-37 | Pendiente de pedir: la cantidad "+ / pastilla" (BR-COPY-02), el calendario (visitas, capacitaciones y recordatorios) y la validación de Títulos (BR-TIT-02/04) aún no están en el dominio | — | Pendiente |
