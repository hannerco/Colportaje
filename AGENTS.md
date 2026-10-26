# AGENTS.md — Instrucciones para agentes de IA y colaboradores

Este proyecto es una PWA mobile-first para colportores (venta de libros a cuotas). **Hoy el repositorio contiene solo documentación**: el código empieza después del diseño en Claude Design.

## Antes de hacer cualquier cosa
1. Lee `docs/README.md` y sigue su orden de lectura. Es obligatorio leer `docs/CONTEXT.md`, `docs/BUSINESS-RULES.md`, `docs/GLOSSARY.md`, `docs/DOMAIN-MODEL.md` y `docs/CONVENTIONS.md`.
2. Respeta la jerarquía de la verdad de `docs/README.md`.
3. Mira `docs/OPEN-QUESTIONS.md`: usa el supuesto indicado, y **pregunta al dueño** en los 🔴.

## Reglas inquebrantables
- **No inventes reglas de negocio.** Si no está en `BUSINESS-RULES.md`/`DECISION-LOG.md`, pregunta.
- **Idioma:** UI y docs en español; código en inglés; nombres según `docs/GLOSSARY.md`.
- **Capas:** la UI nunca habla con Supabase; todo pasa por `repositories` (ver `docs/ARCHITECTURE.md`).
- **Valores derivados** (saldo, deuda, total del Abibono, etc.) **nunca** se guardan como campos editables.
- **Dinero:** COP enteros. **Fechas de negocio:** America/Bogota.
- **Seguridad:** RLS en toda tabla con datos de usuario; `service_role` solo en servidor; **nunca** commitear secretos ni datos reales de clientes.
- **Pruebas:** escribe pruebas junto con el código; el dominio primero. Cada regla `BR-*` tiene prueba.
- **No hay "parche sobre parche":** si una regla no encaja, corrige el diseño y escribe un ADR.
- **Alcance:** no implementes fase 2/3 ni el backlog sin que se pida.
- **Acciones externas** (crear recursos, borrar, publicar, gastar dinero): confirma con el dueño primero.

## Estado y siguientes pasos
- Fase 0 (documentación y conexiones): ver `docs/ROADMAP.md` y `docs/DEPLOYMENT.md` §2.
- Siguiente: el dueño lleva `docs/DESIGN-BRIEF.md` a Claude Design y elige variante. Luego, scaffolding Next.js+TS por capas.

## Comandos (cuando exista el código)
```bash
pnpm install        # dependencias
pnpm dev            # desarrollo
pnpm lint && pnpm typecheck && pnpm test      # calidad (obligatorio antes de PR)
supabase start      # Supabase local (Docker)
pnpm test:rls       # pruebas de seguridad contra Supabase local
pnpm test:e2e       # Playwright
```

## Herramientas instaladas en la máquina del dueño
`git`, `gh` (autenticado como `hannerco`), `node`, `pnpm`, `vercel` (requiere `vercel login`), `supabase` (requiere `supabase login`).

## Estilo de trabajo con el dueño
Directo, en español, le gustan las recomendaciones concretas y que se le explique el porqué. Valora la rigurosidad y odia las ambigüedades. Cuando tenga dudas de diseño, prefiere ver alternativas antes de decidir.
