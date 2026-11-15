# AGENTS.md — Instrucciones para agentes de IA y colaboradores

**Colportor** (marca de Emprendum) es una PWA mobile-first para colportores (venta de libros a cuotas). **El código empezó con HU-BASE-01 (2026-11-11)**: se programa el back de los módulos ya diseñados (Clientes, Inventario y Dinero); los demás esperan su diseño (decisión del dueño, 2026-11-04: no adelantar código mientras el diseño siga cambiando). **Plazo: 14 días** para la fase 1 completa (`docs/06-planificacion/ROADMAP.md`).

## Antes de hacer cualquier cosa
1. Lee `docs/README.md` y sigue su orden de lectura. Es obligatorio leer `docs/00-contexto/CONTEXT.md`, `docs/01-negocio/BUSINESS-RULES.md`, `docs/00-contexto/GLOSSARY.md`, `docs/02-datos/DOMAIN-MODEL.md` y `docs/03-arquitectura/CONVENTIONS.md`.
2. Respeta la jerarquía de la verdad de `docs/README.md`.
3. Mira `docs/06-planificacion/OPEN-QUESTIONS.md`: **no hay preguntas de producto abiertas**, salvo las decisiones de diseño (DT) y los supuestos OQ-30..36 por confirmar; contiene además seguimientos y cosas por revisar. Si surge una duda nueva, añádela allí con un supuesto y **pregunta al dueño**.

## Reglas inquebrantables
- **No inventes reglas de negocio.** Si no está en `01-negocio/BUSINESS-RULES.md`/`00-contexto/DECISION-LOG.md`, pregunta.
- **Idioma:** UI y docs en español; código en inglés; nombres según `docs/00-contexto/GLOSSARY.md`.
- **Capas:** la UI nunca habla con Supabase; todo pasa por `repositories` (ver `docs/03-arquitectura/ARCHITECTURE.md`).
- **Valores derivados** (saldo, deuda, total del Abibono, etc.) **nunca** se guardan como campos editables.
- **Dinero:** COP enteros. **Fechas de negocio:** America/Bogota.
- **Seguridad:** RLS en toda tabla con datos de usuario; `service_role` solo en servidor; **nunca** commitear secretos ni datos reales de clientes.
- **Pruebas:** escribe pruebas junto con el código; el dominio primero. Cada regla `BR-*` tiene prueba.
- **No hay "parche sobre parche":** si una regla no encaja, corrige el diseño y escribe un ADR.
- **Alcance:** no implementes fase 2/3 ni el backlog sin que se pida.
- **Acciones externas** (crear recursos, borrar, publicar, gastar dinero): confirma con el dueño primero. El dueño crea las cuentas nuevas de Supabase y Vercel y hace `supabase login` / `vercel login` él mismo (ver `docs/05-operacion/GUIA-DESPLIEGUE-PASO-A-PASO.md`); **nunca** pidas ni pegues claves en el chat.
- **Estilos solo con tokens (BR-GEN-13, ADR-0034):** nunca escribas tamaños de letra ni colores literales en un componente; usa los roles de `src/ui/tokens/tokens.css`. El tamaño de toda la letra se cambia con `--font-scale`.
- **Regla de contenido:** ningún texto de la app menciona que el líder pueda asumir una pérdida (BR-COPY-11).
- **Región:** Supabase **us-east-1** y Vercel **iad1** (medido desde Medellín; no uses São Paulo).

## Estado y siguientes pasos
- Fase 0: ver `docs/06-planificacion/ROADMAP.md` y `docs/05-operacion/DEPLOYMENT.md` §2 (repo, cuentas y diseño pendientes).
- **Diseño de Clientes, Inventario y Dinero cerrado** (ronda 26). Para programar su back, sigue `docs/07-historias-usuario/README.md`: una HU por sesión, en el orden del índice, con `00-REGLAS-COMUNES.md`. Lo que falta por diseñar está en `docs/04-diseno/pendientes/`.
- El repositorio `hannerco/Colportaje` ya es **privado** (SG-03, 2026-11-10).
- **Avance del back:** HU-BASE-01 en `main`; HU-BASE-02 a 06 terminadas en `will-dev`; HU-CLI-01, HU-INV-01, HU-ABO-01, HU-INV-02, HU-INV-03, HU-ABO-07, HU-DIN-01, HU-CLI-02, HU-INV-04, HU-INV-05, HU-CLI-09, HU-ABO-02 a 06, HU-CLI-07 e HU-CLI-08 terminadas (bloques 5 a 8 completos; del 9 sigue HU-CLI-03). Falta HU-BASE-07 (despliegue; antes, el dueño decide OQ-42). El trabajo se acumula en la rama `will-dev` (sin PR por HU); ver "Avance" en `docs/07-historias-usuario/README.md`. Los demás módulos (Hoy, Calendario, Minibooks, Hacer inventario, Admin) esperan su diseño.

## Comandos (cuando exista el código)
```bash
pnpm install        # dependencias
pnpm dev            # desarrollo
pnpm lint && pnpm typecheck && pnpm test      # calidad (obligatorio antes de cada commit)
pnpm db:start       # Supabase local (Docker); la CLI es dependencia del proyecto (pnpm exec supabase …)
pnpm db:reset       # recrea la base local con migraciones y seed (tras cambiar config.toml: db:stop + db:start)
pnpm db:types       # regenera los tipos de la base
pnpm test:rls       # pruebas de seguridad (RLS) e integración contra Supabase local
pnpm user:create --email <correo> --name "<nombre>" [--admin]   # crea un usuario (lee .env.local)
pnpm catalog:load scripts/data/catalog.json   # carga o actualiza el catálogo (idempotente)
pnpm test:e2e       # Playwright
```

## Herramientas instaladas en la máquina del dueño
`git`, `gh` (autenticado como `hannerco`), `node`, `pnpm`, `vercel` (requiere `vercel login` con la cuenta **nueva**), `supabase` (requiere `supabase login` con la cuenta **nueva**).

## Estilo de trabajo con el dueño
Directo, en español, le gustan las recomendaciones concretas y que se le explique el porqué. Valora la rigurosidad y odia las ambigüedades. Cuando tenga dudas de diseño, prefiere ver alternativas antes de decidir. Corrige al asistente cuando se equivoca (ej.: la región, "Cambiar de cliente", "el líder lo asume"): **verifica con datos** antes de recomendar. No está familiarizado con Supabase ni Vercel: explica la interfaz paso a paso. El estilo visual es el de **Notion**.
