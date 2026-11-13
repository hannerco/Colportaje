-- Datos de desarrollo local. Se cargan con `pnpm db:reset` (nunca en la nube).
-- Solo datos FICTICIOS: nunca datos reales de clientes ni el catálogo real (AGENTS.md).
--
-- La fila única de app_settings la crea la migración base. Los usuarios se crean con
-- `pnpm user:create` (HU-BASE-03); los datos de negocio llegan con cada HU que crea su tabla.

-- Catálogo ficticio (HU-BASE-04): 15 títulos de las tres categorías, uno desactivado.
insert into public.title (id, name, author, description, public_price, colportor_price, category, is_active) values
  ('00000000-0000-4000-8000-000000000101', 'Salud y bienestar en familia', 'Autora Ficticia Uno', 'Hábitos de vida saludable.', 75000, 37500, 'cultural', true),
  ('00000000-0000-4000-8000-000000000102', 'Cocina natural colombiana', 'Autor Ficticio Dos', 'Recetas sencillas.', 68000, 34000, 'cultural', true),
  ('00000000-0000-4000-8000-000000000103', 'Mis primeras historias', 'Autora Ficticia Tres', 'Cuentos para niños.', 82000, 41000, 'cultural', true),
  ('00000000-0000-4000-8000-000000000104', 'Enciclopedia del hogar', null, null, 120000, 60000, 'cultural', true),
  ('00000000-0000-4000-8000-000000000105', 'Árboles y aves de Colombia', 'Autor Ficticio Cuatro', null, 95000, 47500, 'cultural', true),
  ('00000000-0000-4000-8000-000000000106', 'Educar con amor', 'Autora Ficticia Cinco', 'Crianza positiva.', 70000, 35000, 'cultural', true),
  ('00000000-0000-4000-8000-000000000107', 'Atlas escolar ilustrado', null, null, 88000, 44000, 'cultural', true),
  ('00000000-0000-4000-8000-000000000108', 'Edición anterior descontinuada', null, 'Título desactivado: no aparece al agregar.', 65000, 32500, 'cultural', false),
  ('00000000-0000-4000-8000-000000000201', 'Esperanza para hoy', 'Autor Ficticio Seis', null, 60000, 51000, 'religious', true),
  ('00000000-0000-4000-8000-000000000202', 'Devocional diario', 'Autora Ficticia Siete', null, 45000, 38250, 'religious', true),
  ('00000000-0000-4000-8000-000000000203', 'Historias de fe', null, null, 52000, 44200, 'religious', true),
  ('00000000-0000-4000-8000-000000000204', 'Canciones del camino', null, 'Himnario.', 38000, 32300, 'religious', true),
  ('00000000-0000-4000-8000-000000000301', 'Minibook Paz interior', null, null, null, 1500, 'minibook', true),
  ('00000000-0000-4000-8000-000000000302', 'Minibook Familia feliz', null, null, 3000, 1500, 'minibook', true),
  ('00000000-0000-4000-8000-000000000303', 'Minibook de regalo', null, 'Se entrega gratis.', null, 0, 'minibook', true);
