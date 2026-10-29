# Prompt para Claude Design (v2)

Archivos que se adjuntan: `04-diseno/DESIGN-BRIEF.md` (v2), `00-contexto/CONTEXT.md`, `01-negocio/FLOWS.md`, 2–3 capturas de Notion. Si Claude Design no lee `.md`, pegar el brief como texto. **Pegar todo lo que sigue:**

````
Diseña "Colportor": PWA mobile-first para colportores (venta de libros a cuotas, Colombia)
que también debe verse excelente en escritorio. Todo el texto en ESPAÑOL. Dinero
$1.250.000, fechas dd/mm/aaaa, semana desde domingo. Sigue el brief adjunto (v2); esto es
lo que NO se puede romper.

ESTILO: Notion, sobrio y minimalista. Neutros cálidos, bordes finos solo donde separan,
mucho aire, FUENTE DEL SISTEMA (ui-sans-serif, -apple-system, Segoe UI), íconos de trazo.
Menos explicación, más visualización: los datos se entienden por posición, ícono o forma,
no por frases.

LISTA NEGRA (parece "hecho con IA"; no uses nada de esto):
gradientes (sobre todo morado/azul/índigo), glow, glassmorphism, emojis como íconos,
héroes con tres tarjetas, etiquetas/badges por todas partes, íconos dentro de círculos
tintados, TODO en tarjetas con borde y sombra iguales, borde de color a la izquierda,
muchos tonos a la vez, Inter/Jakarta/Geist, subtítulos bajo cada título, contadores en
secciones, dobles barras de progreso, cajas de ícono junto a títulos de página, textos de
relleno, nombres tipo "John Doe".

COLOR: base neutra. Estados y categorías en GRIS (se distinguen por ícono/texto). Acento
único en acción principal y elemento activo. Rojo solo para vencido/error/destructivo.
ÚNICO color de categoría permitido: un ÍCONO PEQUEÑO (solo el trazo, sin círculo ni fondo)
que distingue el tipo de evento: cobro, visita, capacitación (tonos apagados y bien
distinguibles; el primer diseño usó naranja/azul/morado y funcionó).

DENSIDAD (móvil): fila = máximo 2 líneas y una sola señal de estado; sin subtítulos, sin
contadores, sin explicaciones permanentes (la ayuda va en un ⓘ que se abre al tocar);
máximo 5 bloques en el primer vistazo. Más de 5 opciones en cualquier menú/filtro/selector
=> agrúpalas.

TIPOGRAFÍA (tamaños como las apps de referencia; el texto pequeño está PROHIBIDO):
 móvil: cifra destacada 36 · título 28 · TEXTO PRINCIPAL 17 (filas, botones, campos,
 nombres) · texto secundario 15 (hora, detalle) · leyendas 13 como mínimo absoluto y nunca
 para información clave. Campos de texto ≥ 16.
 escritorio: cifra 40 · título 32 · principal 16 (sidebar 15) · secundario 14 · mínimo 13.
 Máximo 3 tamaños por pantalla; interlineado 1.4–1.5; unidades rem. Nada importante por
 debajo de 15 px en móvil.

LEYES DE UX: Hick, Miller, Fitts (acción principal grande, abajo), Jakob (como Notion e
Instagram), Von Restorff (un solo elemento destacado por pantalla), proximidad/región
común (agrupar con espacio, no con más tarjetas), Tesler, Doherty, estético-usabilidad,
Nielsen #8 (minimalista, divulgación progresiva).

NAVEGACIÓN:
- Móvil: barra inferior SOLO íconos (título en la cabecera): Hoy · Clientes · [+ Vender]
  central · Inventario · Más. "Más" = hoja con grupos de máximo 4: Trabajo (Calendario,
  Minibooks), Dinero (Dinero, Hacer inventario), Cuenta (Ajustes, Admin).
- Escritorio: sidebar MUY parecido al de Notion (~240 px, filas de ~30 px, secciones
  plegables con etiqueta tenue, "+" y "⋯" al pasar el cursor, hover/seleccionado en gris
  suave): perfil ▾ · Buscar ⌘K · Hoy · + Vender · ▾ Trabajo (Clientes, Inventario,
  Minibooks, Calendario) · ▾ Dinero (Dinero, Hacer inventario) · Ajustes · Admin.
- "Vender" aparece UNA sola vez (botón central móvil / entrada destacada del sidebar).
  Ninguna pantalla lo repite. En la ficha de cliente: enlace de texto "Agregar libro".
- Cada pantalla tiene máximo UNA acción de contexto destacada: Inventario→Agregar,
  Dinero→Nuevo Abibono, Minibooks→Nueva venta, Clientes→Nuevo, Calendario→+,
  Hacer inventario→Copiar resumen. HOY NO TIENE BOTONES.

HOY (la pantalla más importante), sin calendario ni semana, sin subtítulo:
  título "Hoy" + fecha pequeña; UNA tarjeta "Por entregar" (total grande; una línea gris
  "Efectivo 265.000 · Transferencia 120.000"; ícono de ojo para ocultar montos; tocar → Dinero);
  UN aviso rojo discreto "2 cobros vencidos ›" solo si hay (tocar → Dinero ▸ Por cobrar ▸
  Vencidos; NUNCA listarlos fila por fila); una barra de meta fina SIN números ni etiqueta;
  UNA lista cronológica de hoy mezclando cobros, visitas y capacitaciones (ícono de tipo con
  color · hora · nombre · detalle corto). Nada más.

VARIANTES (desde el principio, realmente distintas; móvil y escritorio, claro y oscuro):
 A "Tinta": acento casi negro #1F1E1D, barra de 5 íconos con + Vender central.
 B "Marino": acento #092e53 (azul marino profundo) en acción principal y elemento activo;
   misma estructura que A para comparar solo el color (cuida que el ícono de "visita" no
   choque con el marino: usa verde azulado).
 C "Editorial": sin tarjetas (cifras sobre fondo con líneas finas y espacio), barra de 4
   íconos + Vender como botón flotante (sigue siendo la única acción principal).

PANTALLAS (en este orden; una por una; espera mi elección): 1 Hoy · 2 Clientes (barra de
vista Recientes/Deudores/Todos/Archivados + orden; saldo pendiente por fila) · 3 Ficha de
cliente · 4 + Vender (5 pasos) · 5 Inventario + Agregar (lista + favoritos; "+" por fila que
se vuelve pastilla numérica; chip de fecha "Hoy ▾"; Deshacer) · 6 Devolver + modal de abonos
que no cuadran (Recortar automáticamente / Cancelar los que marque / Dejar como está) ·
7 Dinero (Por cobrar · Por entregar · Entregado) y Abibono ("Entrega al líder": esperado vs
entregado, diferencia, recibo obligatorio, Reabrir discreto) · 8 Minibooks · 9 Calendario
(tres tipos con ícono de color) · 10 Hacer inventario (tabla por título, grupos
Culturales/Religiosos/Minibooks, vistas Inventario/Todos, "Perdidos asumidos", "A responder
al líder", Copiar resumen) · 11 Admin (Catálogo, Ajustes, Usuarios con "Invitar" que da un
enlace para copiar) · 12 Login y Ajustes.
Propón además: set de íconos (uno por sección, reconocible sin texto), ícono de antigüedad
en 4 etapas (3 propuestas sobrias, no una fruta), representación de "Con novedad"
(3 propuestas; salidas: Apareció / Perdido (lo asumo yo) / Eliminar) y ubicación de la
barra de meta (2 propuestas).

DATOS DE EJEMPLO realistas: libros "Un corazón tranquilo", "El poder de mis palabras",
"Bebidas saludables"; clientes colombianos; precios $30.000–$120.000; abonos $10.000–$40.000.

NO DISEÑAR AHORA: vista de líder, campañas, reembolsos, exportar PDF/CSV, notificaciones push,
escritura sin conexión.
````
