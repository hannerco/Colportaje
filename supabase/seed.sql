-- Datos de desarrollo local. Se cargan con `pnpm db:reset` (nunca en la nube).
-- Solo datos FICTICIOS: nunca datos reales de clientes (AGENTS.md).
--
-- La fila única de app_settings la crea la migración base. Los usuarios de prueba llegan con
-- HU-BASE-03 (trigger de perfil y script de usuarios) y los datos de negocio con cada HU que crea su tabla.
select 1;
