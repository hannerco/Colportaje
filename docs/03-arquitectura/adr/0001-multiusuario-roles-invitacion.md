# ADR-0001: Multiusuario, roles e invitación
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
~10 colportores usarán la app; en el futuro habrá rol Líder. El almacenamiento gratuito es limitado. El dueño será el primer usuario y administrador y necesita cambiar a "modo admin" en un lugar "ni tan visible ni tan escondido".

## Decisión
- Multiusuario desde el día uno, con **aislamiento por usuario** mediante RLS en Postgres (`owner_id = auth.uid()`).
- Roles en base de datos (`user_role`): `colportor` (todos), `admin` (adicional), `leader` (reservado para fase 3). 
- El **modo administrador** es un conmutador de UI en Ajustes, visible solo si se tiene el rol; la autorización real vive en RLS/servidor.
- Acceso **solo por invitación** (correo + contraseña). Sin registro público. El panel de admin incluye instrucciones de "Cómo invitar a alguien".

## Alternativas descartadas
- *App de un solo usuario y migrar después*: migrar a multiusuario es doloroso (datos, seguridad).
- *Registro abierto*: cualquiera podría consumir el almacenamiento gratuito.
- *Roles en el JWT/metadatos de cliente*: manipulables; se prefiere tabla + función `is_admin()`.

## Consecuencias
- Todas las tablas de negocio llevan `owner_id` y política RLS; hay que probarlas (`tests/rls`).
- El admin no ve datos de negocio de otros colportores (BR-GEN-01).
- La vista de líder (F3) se añade como rol, sin rehacer nada.

## Referencias
BR-USR-01..06, BR-GEN-01 · RQ-ACC-01..04 · DECISION-LOG Q1, Q17b, Q22, Q23 · 03-arquitectura/SECURITY.md
