# Hoja de ruta

Prioridad: tener la **fase 1** lista para la próxima campaña (~3 meses de duración). Las fases se entregan en orden; lo marcado `[B]` es backlog sin fase asignada.

## Fase 0 — Preparación (esta etapa)
- [x] Entrevista de diseño y decisiones (`DECISION-LOG.md`).
- [x] Documentación base (`docs/`).
- [ ] Repositorio GitHub, proyecto Vercel y proyecto Supabase creados y enlazados (`DEPLOYMENT.md`).
- [ ] **Diseño en Claude Design** (2–3 variantes; ver `DESIGN-BRIEF.md`); el dueño elige.
- [ ] Revisión de `OPEN-QUESTIONS.md` 🔴 con el dueño.

## Fase 1 — PWA online, instalable (objetivo: antes de la próxima campaña)
Hitos sugeridos (cada uno con pruebas):
1. **Cimientos:** scaffolding Next+TS, capas, linter de límites, CI, entorno Supabase local, migraciones del esquema (`DATABASE.md`), RLS + `tests/rls`, auth por invitación, roles, PWA instalable.
2. **Dominio:** reglas de `BUSINESS-RULES.md` con pruebas unitarias (saldo, precio, antigüedad, abonos, Abibono, minibooks, totalizadores).
3. **Catálogo y admin:** `/admin` (Títulos, ajustes, usuarios, "Cómo invitar"), script de carga de catálogo.
4. **Inventario:** agregar (lista + favoritos), libros en físico, antigüedad, vistas de ejemplares, "Con novedad", devolución.
5. **Clientes y +Vender:** clientes/prospectos, búsqueda difusa, ficha, flujo de venta, fotos (compresión + miniaturas + `StorageRepository`).
6. **Dinero:** abonos (tipos, cobro, parcial, prórroga), "En mi poder", Abibono (borrador→confirmado, recibo, diferencia).
7. **Minibooks:** entradas, stock, asignación a Abibono, `client_credit`.
8. **Calendario y Hoy:** abonos/visitas/capacitaciones, recordatorios en app, barra de meta.
9. **Hacer inventario:** tabla, totalizadores, selector de categoría, imprimir/compartir.
10. **Calidad:** tooltips, accesibilidad, rendimiento percibido (medir en móvil real), backups semanales, E2E completos.
11. **Piloto:** uso real del dueño; correcciones; luego los demás colportores.

## Fase 2 — Offline y notificaciones
- Base local (Dexie) tras las interfaces de `repositories`; cola de escrituras idempotente; cola de fotos; indicadores de sincronización; sesión sin conexión.
- Resolver **OQ-20** (numeración de ejemplares offline).
- Push de recordatorios (PWA instalada; iOS ≥ 16.4); iOS sincroniza al abrir.

## Fase 3 — Vista de Líder
- Rol `leader`; el líder transfiere libros de su bodega; el colportor los **acepta en el sistema** y solo firma si (1) los recibió en físico y (2) los aceptó (estado `pending_receipt`).
- Vistas de equipo; el Líder sustituye a "el colportor se agrega sus propios libros".

## Backlog `[B]`
- **Campañas** (tabla, filtros por campaña, metas por campaña, apartado de **Metas** ampliado).
- Cortes históricos de "Hacer inventario".
- Reembolsos a clientes.
- Seguimiento de personas interesadas en minibooks (hoy basta la nota).
- Eliminar totalizadores que ya no se usen (cada uno es una pieza registrada).
- Migrar fotos a Cloudflare R2 al 70 % del almacenamiento.
- Vista de clientes vencidos (abonos con fecha pasada).
- Formulario de invitaciones dentro de la app (hoy son instrucciones).
- Catálogo de Títulos administrado por Emprendum a escala (hoy: el admin).
