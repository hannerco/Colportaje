# Hoja de ruta

**Objetivo y plazo:** la **fase 1 completa en 14 días** (decisión del dueño: "intentemos hacer esto en las dos semanas; lo voy a construir con IA"), lista para la próxima campaña (~3 meses). Fases en orden; `[B]` = backlog sin fase.

## Fase 0 — Preparación (esta etapa)
- [x] Entrevista de diseño y decisiones (`DECISION-LOG.md`).
- [x] Documentación base y revisión de cabos sueltos (`docs/`).
- [ ] **SG-03** Repositorio GitHub privado `colportor` con el commit inicial.
- [ ] **SG-04** Diseño en Claude Design (2–3 variantes) y elección del dueño (días 1–3).
- [ ] **SG-02** Cuentas nuevas de Supabase y Vercel (`GUIA-DESPLIEGUE-PASO-A-PASO.md`).
- [ ] **SG-01** Repetir la medición de latencia desde un celular.

## Fase 1 — PWA online con lectura sin conexión (14 días)
Plan sugerido (cada hito con pruebas; el orden es también el **orden de recorte** si el tiempo aprieta, de abajo hacia arriba):

| Días | Hito | Contenido |
|---|---|---|
| 1–2 | **Cimientos** | Cuentas, scaffolding Next+TS por capas, linter de límites, CI, Supabase local, migraciones del esquema (`DATABASE.md`), RLS + `tests/rls`, auth por invitación, PWA instalable. En paralelo (dueño): **diseño** |
| 3–4 | **Dominio y admin** | Reglas `BR-*` con pruebas unitarias (saldo, precio, antigüedad, abonos, alerta BR-PAY-13, Abibono, minibooks, totalizadores); `/admin` (Catálogo, ajustes, usuarios, invitar por enlace, restablecer, desactivar); script de carga del catálogo |
| 5–6 | **Inventario y clientes** | Agregar (lista, favoritos, "+" y pastilla numérica, fecha pasada, deshacer), libros en físico, antigüedad, vistas de ejemplares, "Con novedad", devolver al líder, clientes/prospectos, búsqueda difusa, ficha, archivar, duplicados, llamar/WhatsApp, fotos (compresión + miniaturas) |
| 7–8 | **Vender y abonos** | Asistente **+ Vender**, abonos (cuota inicial, programado, extra, cobrar, parcial, prórroga), **alerta de abonos que no cuadran**, devolución con motivo, saldo a favor |
| 9–10 | **Dinero y minibooks** | Dinero (por entregar, por método), Abibono (autocálculo, diferencia, recibo, confirmar, **reabrir**), minibooks (ventas, stock, asignación, `client_credit`) |
| 11 | **Hoy y calendario** | Hoy (tarjeta **Por entregar**, cobros, vencidos), calendario (abonos, visitas, capacitaciones), recordatorios en app, semana desde domingo, formato 12/24 h |
| 12 | **Hacer inventario y metas** | Tabla, 8 totalizadores + perdidos + A responder, selector de categoría, **Copiar resumen**, barra de meta |
| 13 | **Calidad** | Tooltips, estilo Notion pulido, lectura sin conexión, estados vacíos/error, E2E completos, backups (cada 2 días) + ping anti-pausa, aviso de datos |
| 14 | **Piloto** | Uso real del dueño, correcciones, preparar a los demás colportores |

**Orden de recorte sugerido si el tiempo aprieta** (se recorta primero lo de abajo): selector de categoría en totalizadores → vista "Con descuentos y aumentos" → recordatorios personalizados → barra de meta → "Devolver al líder" en lote → formato 12/24 h. **Nunca se recortan:** RLS y sus pruebas, pruebas del dominio de dinero, recibo obligatorio, backups.

## Fase 2 — Offline y notificaciones
- Base local (Dexie) tras las interfaces de `repositories`; cola de escrituras idempotente; cola de fotos; indicadores de sincronización; sesión sin conexión; número de ejemplar **provisional con marca** (puede cambiar al sincronizar).
- Push de recordatorios (PWA instalada; iOS ≥ 16.4); iOS sincroniza al abrir.

## Fase 3 — Vista de Líder
- Rol `leader`; el líder transfiere libros de su bodega; el colportor los **acepta en el sistema** y solo firma si (1) los recibió en físico y (2) los aceptó (estado `pending_receipt`).
- Vistas de equipo; sustituye a "el colportor se agrega sus propios libros".

## Backlog `[B]`
- **Campañas** (tabla, filtros, metas por campaña, apartado de Metas ampliado).
- **Exportar "Hacer inventario" a PDF y CSV.**
- Cortes históricos de "Hacer inventario".
- Reembolsos a clientes.
- Fusión de clientes duplicados.
- Edición masiva de "Recibido el".
- Seguimiento de personas interesadas en minibooks (hoy basta la nota).
- Eliminar totalizadores que ya no se usen (cada uno es una pieza registrada).
- Migrar fotos a Cloudflare R2 al 70 % del almacenamiento.
- Vista de clientes vencidos.
- Invitaciones por correo (requiere dominio + SMTP propio).
- Pasar a Supabase Pro cuando la app maneje dinero real de varios usuarios (SG-06).
- Presentar la marca "Colportor" a Emprendum (SG-07).
