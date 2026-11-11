# Colportor

PWA mobile-first para colportores: clientes, libros en físico, ventas a cuotas, abonos, entregas al líder (Abibonos), minibooks, calendario y "Hacer inventario". Se usa en el celular durante el día y en el computador al cuadrar cuentas por la noche.

**Estado:** se está programando el back de Clientes, Inventario y Dinero, una historia de usuario a la vez, en el orden de [`docs/07-historias-usuario/README.md`](docs/07-historias-usuario/README.md). **Plazo: 14 días** para la fase 1.

- 📚 Documentación: [`docs/README.md`](docs/README.md) (empieza aquí)
- 🤖 Para agentes de IA y colaboradores: [`AGENTS.md`](AGENTS.md)
- 🗺️ Hoja de ruta: [`docs/06-planificacion/ROADMAP.md`](docs/06-planificacion/ROADMAP.md)

Stack: Next.js + TypeScript (PWA) · Supabase (Postgres, Auth, Storage; **us-east-1**) · Vercel (**iad1**) · Vitest + Playwright. Estilo visual: Notion.

## Preparar el equipo

Las versiones están fijadas para que todos corran lo mismo: **Node 22** (`.nvmrc`) y **pnpm 12.18.0** (`packageManager` en `package.json`). Con otra versión, `pnpm install` falla a propósito (`engineStrict` en `pnpm-workspace.yaml`).

1. **Node 22** con un gestor de versiones:
   - [nvm](https://github.com/nvm-sh/nvm) (macOS/Linux) o [nvm-windows](https://github.com/coreybutler/nvm-windows): `nvm install 22` y `nvm use 22`.
   - [fnm](https://github.com/Schniz/fnm): `fnm install` y `fnm use` (lee `.nvmrc`).
2. **pnpm** con corepack, que viene con Node: `corepack enable pnpm`. Al entrar al proyecto, corepack usa la versión exacta de `packageManager`.
3. **Docker** corriendo (lo usa Supabase local a partir de HU-BASE-02).
4. `pnpm install`.
5. `cp .env.example .env.local` y completa los valores. `pnpm dev` no arranca sin ellos. Nunca se suben `.env*` ni claves.

La CLI de Supabase es una dependencia del proyecto: se usa con `pnpm exec supabase …`, no con una instalación global.

## Comandos

```bash
pnpm dev                                   # desarrollo
pnpm lint && pnpm typecheck && pnpm test   # calidad (obligatorio antes de un PR; es lo que corre la CI)
pnpm build                                 # compilación de producción
pnpm format                                # aplica el formato de Prettier
```

`pnpm test` corre las pruebas con cobertura; el dominio (`src/domain/`) exige ≥ 95 %.

## Capas

`src/domain` (TypeScript puro) ← `src/repositories` (interfaces) ← `src/adapters` (Supabase) · `src/features` (casos de uso y hooks) · `src/ui` · `src/app` (rutas y conexión de todo). Las reglas están en [`docs/03-arquitectura/ARCHITECTURE.md`](docs/03-arquitectura/ARCHITECTURE.md) §2 y el lint falla si se rompen (`eslint.layers.mjs`).
