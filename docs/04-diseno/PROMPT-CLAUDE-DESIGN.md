# Prompt para Claude Design (v3 — empieza por Clientes)

**Qué adjuntar:** `04-diseno/DESIGN-BRIEF.md` (v2+), `00-contexto/CONTEXT.md`, `01-negocio/FLOWS.md`, y las **tres imágenes de referencia** de `04-diseno/referencias/` (`ref-1-escritorio-sidebar-y-tabla.png`, `ref-2-movil-barra-flotante-y-agenda.png`, `ref-3-movil-lista-de-actividad.png`). Si no lee `.md`, pegar el brief como texto. **Pegar todo lo que sigue:**

````
Diseña "Colportor": PWA mobile-first para colportores (venta de libros a cuotas, Colombia)
que también debe verse excelente en escritorio. Todo el texto en ESPAÑOL. Dinero $1.250.000,
fechas dd/mm/aaaa, semana desde domingo. Sigue el brief adjunto; esto es lo que no se puede romper.

EMPIEZA SOLO POR EL MÓDULO "CLIENTES" (lista móvil + tabla de escritorio con el sidebar).
No diseñes "Hoy" todavía. Cuando yo elija, seguimos con la ficha de cliente y el resto.

REFERENCIAS ADJUNTAS (tómalas como inspiración de ESTRUCTURA y SUAVIDAD; no las copies ni
reproduzcas su contenido de ejemplo):
 Referencia 1 (escritorio) — me encanta para Clientes y para el sidebar:
  · fondo gris claro con el contenido en UN panel blanco grande de esquinas redondeadas;
  · sidebar: tarjeta superior con el perfil (logo + "Colportor" + nombre + selector ⌃⌄),
    separador punteado, lista de ítems con íconos de trazo, y el ítem activo como una
    PÍLDORA BLANCA elevada con sombra muy sutil;
  · arriba, título de módulo y pestañas de vista como píldoras (la activa en blanco con
    sombra) con el conteo en gris tenue al lado ("Todos 48");
  · título de la página con su conteo tenue ("Clientes 48");
  · barra de herramientas: campo de búsqueda + botones-píldora con ícono (Estado, Libros,
    Orden…) blancos con borde y sombra mínimos;
  · tabla con cabecera en gris claro redondeada, filas altas y aireadas SIN líneas
    divisorias, nombre con subrayado discreto, avatar pequeño, y columna de estado con
    píldora de color suave + ícono (rojo / verde / gris).
 Referencia 2 (móvil) — me gusta:
  · fondo cálido muy suave, superficies casi translúcidas, esquinas muy redondeadas;
  · cabecera con título y botones circulares pequeños; barra de búsqueda con ícono de
    filtro a la derecha;
  · BARRA INFERIOR FLOTANTE tipo píldora con 4 íconos (activo = píldora clara) y, aparte a
    su derecha, un BOTÓN de "Nuevo cliente" (ícono de persona con "+") (antes "Vender");
  · en la pantalla de agenda: tira de semana con el día elegido en píldora y línea de tiempo
    por horas (solo para la sección Calendario más adelante, NUNCA en "Hoy").
 Referencia 3 (móvil) — SOLO su LISTA INFERIOR ("Recent Activity"): cada fila = ícono/avatar
  circular a la izquierda, NOMBRE (principal) con una segunda línea gris debajo, y el MONTO a la
  derecha; filas aireadas sin tarjetas ni líneas; funciona en claro y en oscuro (en oscuro, filas
  sobre fondo casi negro con avatares gris oscuro).
  De la Referencia 3 NO tomes: la cabecera morada con gradiente, la tarjeta blanca con gráfico,
  la bandera, ni los botones de acción en píldora (Add / Transfer / Request).
 No copies de las referencias: gráficos decorativos, tarjetas de "rendimiento", fotos de
 avatar, gradientes, ni nada que sea relleno.

ESTILO: Notion + estas referencias; sobrio y minimalista. Neutros cálidos, mucho aire,
FUENTE DEL SISTEMA (ui-sans-serif, -apple-system, Segoe UI), íconos de trazo. Menos
explicación, más visualización.

LISTA NEGRA (parece "hecho con IA"; no uses): gradientes (sobre todo morado/azul/índigo),
glow, glassmorphism exagerado, emojis como íconos, héroes con tres tarjetas, badges por todas
partes, íconos dentro de círculos tintados en cada fila, TODO en tarjetas con borde y sombra
iguales, muchos tonos a la vez, Inter/Jakarta/Geist, subtítulos bajo cada título, contadores en
cada sección, dobles barras de progreso, cajas de ícono junto a títulos de página, textos de
relleno, nombres tipo "John Doe", gráficos sin significado.

COLOR: base neutra. Acento único en la acción principal y el elemento activo. Rojo para
vencido/error/destructivo. Colores permitidos y SOLO en estos lugares:
 · microíconos (solo el trazo, sin círculo) que distinguen el tipo de evento: cobro, visita,
   capacitación;
 · ESTADO DEL CLIENTE como pequeña píldora suave con ícono, SOLO en la tabla de escritorio:
   "Vencido" (rojo), "Pagando" (gris: debe algo pero va cumpliendo), "Saldado" (verde: ya pagó
   todo). En MÓVIL no hay píldora: sobre el saldo va la etiqueta gris "Debe" con el ícono del
   estado (Pagando gris, Vencido rojo, Saldado verde). Saldado es el único uso de verde.
Estados de abono y categorías de libro: en gris.

TIPOGRAFÍA (el texto pequeño está PROHIBIDO): móvil: cifra 36 · título 28 · TEXTO PRINCIPAL 17
(nombres, filas, botones, campos) · secundario 15 · leyendas 13 mínimo y nunca información
clave. Campos ≥ 16. Escritorio: cifra 40 · título 32 · principal 16 (sidebar 15) · secundario 14
· mínimo 13. Máximo 3 tamaños por pantalla, interlineado 1.4–1.5, unidades rem.
 DESIGN SYSTEM: define los tamaños de texto como VARIABLES por rol (cifra, título, principal,
 secundario, leyenda) en UN solo lugar, multiplicadas por un factor global de escala
 (--font-scale), de modo que cambiar el tamaño de toda la letra sea cambiar una variable. El
 color de acento también como variable. Ningún componente con tamaños o colores escritos a mano.

DENSIDAD: fila = máximo 2 líneas y UNA señal de estado; sin subtítulos, sin explicaciones
permanentes (ayuda en un ⓘ al tocar); máximo 5 bloques en el primer vistazo. Más de 5 opciones
en cualquier menú/filtro/selector => agrúpalas. Leyes: Hick, Miller, Fitts, Jakob, Von Restorff
(un solo elemento destacado), proximidad/región común, Tesler, Doherty, Nielsen #8.

"VENDER" UNA SOLA VEZ: botón circular oscuro "+" junto a la barra flotante (móvil) / entrada
destacada del sidebar (escritorio). Ninguna pantalla lo repite. Cada pantalla tiene como máximo
UNA acción de contexto destacada (en Clientes: "Nuevo cliente").

SIDEBAR DE ESCRITORIO (estilo Notion + Referencia 1; ~260 px): tarjeta de perfil arriba ·
Buscar ⌘K · Hoy · (el botón "Nuevo cliente": ubicación por decidir, ver «4 ubicaciones») · sección "Trabajo" (Clientes, Inventario,
Minibooks, Calendario) · sección "Dinero" (Dinero, Hacer inventario) · abajo Ajustes y Admin.
Etiquetas de sección tenues y plegables, íconos de trazo, activo = píldora blanca elevada.
Como son más de 5 ítems, ya están agrupados; no los pongas en una sola lista plana.

PANTALLA 1 — CLIENTES

 MÓVIL (390 px):
  · cabecera: "Clientes" (28) + botones circulares pequeños (buscar/ajustes si hacen falta);
  · campo de búsqueda grande con ícono de filtro a la derecha (búsqueda difusa por nombre,
    teléfono, información y dirección);
  · pestañas de vista como píldoras desplazables: Recientes · Deudores · Todos · Archivados
    (con conteo tenue); selector de orden y el interruptor "Incluir prospectos" dentro del
    filtro, no sueltos en pantalla;
  · lista como en la Referencia 3 (sin tarjetas por fila, solo separación y aire): avatar
    (emoji o ícono de persona) a la izquierda · NOMBRE (17) · debajo, en gris (15), el LIBRO VENDIDO
    (título del libro; si hay varios, el más reciente + "+2") · a la derecha el SALDO PENDIENTE
    (17), en rojo si el cliente tiene algo vencido, o el texto gris "Saldado" si ya pagó todo; los
    prospectos muestran "Prospecto" en gris en lugar del libro y nada a la derecha. Una sola señal de estado por fila (el rojo del saldo);
  · barra inferior flotante (Hoy · Clientes · Inventario · Más) + botón de "Nuevo cliente" (persona con "+");
  · estados: vacío (sin clientes), cargando, sin resultados de búsqueda, sin conexión (franja
    discreta; se puede consultar).

 ESCRITORIO (1440 px): sidebar + panel blanco con título "Clientes 48" y UN botón oscuro
  "+ Nuevo cliente"; pestañas de vista (píldoras con conteo); fila de herramientas con búsqueda
  y botones-píldora con ícono (Estado, Libros, Orden); tabla con columnas: Cliente (avatar
  + nombre) · Teléfono · Libro(s) (título + "+N") · Saldo · Último abono · Estado
  (píldora con ícono: Vencido rojo · Pagando gris · Saldado verde); filas altas y aireadas; al elegir un cliente se abre un panel de detalle a
  la derecha (lista + detalle). NO añadas fila de tarjetas de métricas ni totales de dinero
  (el total de deuda no se muestra por defecto).

VARIANTES de esta pantalla (móvil y escritorio, claro y oscuro), realmente distintas:
 A "Tinta": acento casi negro #1F1E1D.
 B "Marino": acento #092e53 (azul marino profundo) en el botón principal y el activo; misma
   estructura que A para comparar solo el color (ícono de "visita" en verde azulado).
 C "Editorial": sin superficies elevadas ni sombras, solo líneas finas y espacio.
Todas con la barra flotante + botón circular "+" en móvil y el sidebar de la Referencia 1.

DATOS DE EJEMPLO realistas: clientes colombianos (p. ej. Luz Marina Restrepo, Jhon Fredy
Ospina, Carlos Andrés Gómez, Diana Patricia Cardona, María Camila Henao), 48 clientes, saldos
entre $0 y $380.000, con libros reales como "Un corazón tranquilo", "El poder de mis palabras"
y "Bebidas saludables", algunos vencidos, algunos prospectos sin libros.

ENTREGA: primero solo Clientes (móvil y escritorio, las 3 variantes, claro y oscuro) con los
componentes comunes (barra de vista, píldoras de estado, sidebar, barra flotante, botón "+").
Espera mi elección antes de seguir con ficha de cliente, Hoy, Inventario, Dinero, etc.

NO DISEÑAR AHORA: Hoy, vista de líder, campañas, reembolsos, exportar PDF/CSV, notificaciones
push, escritura sin conexión.
````

## Spec de HOY (para cuando toque; **no** va en el prompt de Clientes)
Adjuntar entonces `referencias/ref-4-movil-tarjeta-saldo-con-accion.png` (solo la tarjeta de arriba). Añadir al prompt base:
```
PANTALLA — HOY (móvil, 390 px): título "Hoy" + fecha pequeña. UNA tarjeta destacada en el COLOR DE
ACENTO (casi negro en A, #092e53 en B), texto claro, como la Referencia 4: etiqueta "Por entregar",
cifra grande con un ícono de OJO al lado (oculta montos), una línea con "Efectivo 265.000 ·
Transferencia 120.000" y UN SOLO BOTÓN en píldora clara "Entregar" (abre Nuevo Abibono con ese
dinero). Sin subtítulo, sin barra de colores. Debajo: UN aviso rojo discreto "2 cobros vencidos ›"
solo si hay; una barra de meta fina sin números; y UNA lista cronológica de hoy (cobros, visitas,
capacitaciones con su microícono de color · hora · nombre · detalle). Sin semana ni calendario,
sin otros botones. Barra flotante + botón "Nuevo cliente" (persona con "+"). En C (editorial) la cifra va
sobre el fondo con línea fina y el botón de acento, sin tarjeta elevada.
No copies de la Referencia 4: tracking de envíos, líneas de progreso, saludo con avatar.
```

## Orden de las siguientes pantallas (cuando se elija Clientes)
2 Ficha de cliente (viva: sirve para crear y para editar) · 3 Hoy · 4 Agregar libro y abonos dentro de la ficha · 5 Inventario y Agregar · 6 Devolver + modal de abonos · 7 Dinero y Abibono · 8 Minibooks · 9 Calendario (aquí sí tira de semana y línea de tiempo, estilo Referencia 2) · 10 Hacer inventario · 11 Admin · 12 Login y Ajustes. En cada paso se reutiliza el prompt base (estilo, lista negra, color, tipografía, densidad) cambiando solo la pantalla.

## Prompt — 4 ubicaciones de "Nuevo cliente" (ronda 16)
Pegar en el **mismo proyecto de Claude Design** donde ya está Clientes (para que parta de lo que ya diseñó). **Pegar todo lo que sigue:**

````
CONTEXTO: ya diseñaste el módulo "Clientes" (móvil y escritorio) en este proyecto. NO lo rediseñes.
Mantén EXACTAMENTE el estilo actual: acento #092e53, tipografía, tamaños, tarjeta de perfil,
pestañas-píldora, tabla, avatares, barra inferior flotante y todos los componentes tal como están.

CAMBIO DE CONCEPTO: la acción "Vender" DESAPARECE por completo. La única acción global pasa a ser
"Nuevo cliente" (ícono de persona con "+"), que abre una ficha de cliente en blanco (no la
diseñes ahora). Hoy el diseño tiene dos cosas: un botón "Nuevo cliente" propio de la pantalla
Clientes y un botón/ítem "Vender" global. Quiero comparar 4 formas de ubicar "Nuevo cliente".

ENTREGA: las 4 opciones, cada una con 4 láminas, en modo claro:
 · Clientes en escritorio (1440) · Inventario en escritorio (1440; para ver cómo se comporta
   la acción fuera de Clientes) · Clientes en móvil (390) · Inventario en móvil (390).
Rotula solo "Opción A/B/C/D" y su nombre en una línea. SIN párrafos explicativos. Al final, una
lámina de comparación con las cuatro versiones móviles de Clientes lado a lado.

OPCIÓN A — "Todo en la navegación global":
 · Escritorio: "Nuevo cliente" es un ítem destacado del sidebar (icono persona+), arriba de la
   sección Trabajo; la cabecera de Clientes NO tiene botón.
 · Móvil: botón flotante tipo píldora "persona+ Nuevo cliente" sobre la barra inferior, visible
   en todas las pantallas; la cabecera de Clientes NO tiene botón.
OPCIÓN B — "Solo dentro de Clientes":
 · Escritorio: solo el botón "Nuevo cliente" arriba a la derecha de Clientes; no existe en el
   sidebar ni en otras pantallas.
 · Móvil: solo el botón circular persona+ en la cabecera de Clientes; SIN botón flotante; la
   barra inferior queda solo con sus 4 ítems.
OPCIÓN C — "Flotante":
 · Escritorio: botón flotante extendido ("persona+ Nuevo cliente") anclado abajo a la derecha del
   panel, visible en todas las pantallas; sin botón en la cabecera ni ítem en el sidebar.
 · Móvil: botón flotante como el actual (ícono persona+), en todas las pantallas; sin botón en la
   cabecera.
OPCIÓN D — "Ícono en la cabecera del sidebar" (convención de Notion/Linear/Slack):
 · Escritorio: botón de ícono (persona+) en la cabecera del sidebar, junto a la tarjeta de perfil
   (tooltip "Nuevo cliente  ⌘N"), visible en toda pantalla, MÁS el botón "Nuevo cliente" propio de
   la cabecera de Clientes.
 · Móvil: botón flotante persona+ en todas las pantallas y SIN botón en la cabecera de Clientes.

REGLAS COMUNES: se llama "Nuevo cliente"; ícono de persona con "+"; "Vender" no aparece en ningún
lado (ni sidebar, ni flotante, ni etiquetas); no repitas el mismo botón de forma redundante en
una misma pantalla (máximo dos apariciones y solo en la opción D en escritorio); conserva "Hoy",
"Clientes", "Inventario", "Más" y todo lo demás sin cambios; mismos datos de ejemplo.
````

## Prompt — pantalla "Elegir ubicación" (ronda 17)
Pegar en el mismo proyecto de Claude Design. **Pegar todo lo que sigue:**

````
Diseña la pantalla "Elegir ubicación" del cliente (móvil 390 y escritorio 1440), con el mismo estilo del
proyecto. Mapa a pantalla completa en estilo neutro y claro (sin colores llamativos). PIN FIJO al centro
de la pantalla (el mapa se mueve por debajo, como al pedir un carro en Didi). Círculo de precisión del
GPS alrededor del punto. Un botón circular que recentra el mapa en la ubicación actual. Un solo
botón principal "Confirmar". Un aviso discreto "Ubicación aproximada" cuando la precisión es baja (no
bloquea). Muestra también: (1) en la ficha de cliente, la sección Dirección con el campo de texto, un
botón único "Elegir en mapa" (se abre centrado en la ubicación actual), y el mapa pequeño con pin que se carga al tocarlo, con el botón
"Abrir en Maps" (lleva las coordenadas a la app de mapas); (2) estado de permiso negado: el mapa se abre igual con un aviso discreto. Sin textos explicativos. Un solo botón principal por pantalla.
````


## Ronda 19 — ajustes tras revisar Clientes (2026-11-04)
Prompts ya entregados a Claude Design, en este orden. Dejan el diseño alineado con ADR-0038, ADR-0039 y BR-CUS-05/07/08/13/14. (El "Resumen" y el generador de plan de abonos no necesitan prompt: el título ya quedó como "Resumen" y el cálculo es de código.)

### 19.1 Orden: "Última modificación" y sentido
````
En la lista de Clientes (escritorio y móvil, claro y oscuro), cambia el selector "Ordenar por":
opciones Más recientes (por fecha de creación), Última modificación (NUEVA), Nombre (A–Z), Mayor deuda
y Próximo abono. Junto al criterio, un control de ícono con flecha arriba/abajo (aria-label "Invertir
orden") para alternar ascendente/descendente. Sentidos por defecto: Más recientes y Última modificación
descendente, Nombre ascendente, Mayor deuda descendente, Próximo abono ascendente. El botón de la barra
muestra criterio y sentido (p. ej. "Orden: Última modificación ↓") y el sentido es legible también en
texto accesible. Escritorio: dentro del menú "Ordenar por". Móvil: en la hoja "Filtrar y ordenar".
Si el orden difiere del predeterminado, aparece el chip de filtros activos con "Restablecer".
Solo tokens del design system; un solo botón principal por pantalla.
````

### 19.2 Botones de Crear cliente
````
En Crear cliente (escritorio y móvil; llena y vacía; claro y oscuro): todo se guarda solo.
Cabecera: "Descartar" (secundario) y "Guardar cliente" (el único botón principal, deshabilitado sin
nombre); no hay indicador de "Borrador guardado" (un cliente con nombre ya existe). Reemplaza el actual "Cancelar" por "Descartar". Salir de la ficha de cualquier forma (atrás, menú, Resumen) sin "Guardar cliente" abre esa misma confirmación.
Pantalla "Resumen": "Guardar cliente" (principal) y "Seguir editando". "Descartar" abre SIEMPRE una
confirmación (modal en escritorio, hoja inferior en móvil): título "¿Descartar a <nombre>?", lista
corta de lo que se perderá solo con lo que exista (p. ej. "Se quitarán 2 libros y 1 abono"; sin nada:
"Se quitará este cliente."), botones "Seguir editando" (principal) y "Descartar" (destructivo, rojo
semántico existente). "Archivar" no aparece en la creación; después de "Guardar cliente" la ficha
normal lo tiene en "Más acciones" y "Descartar" ya no existe. Diseña la confirmación con y sin contenido
a perder, móvil y escritorio, claro y oscuro. Solo tokens.
````

### 19.3 Un solo botón "Elegir en mapa"
````
En la sección Dirección de la ficha (Crear y ficha existente; móvil y escritorio; claro y oscuro) y en
"Elegir ubicación": deja UN SOLO botón secundario "Elegir en mapa" y elimina "Mi ubicación". Al tocarlo
se abre "Elegir ubicación" centrado en la ubicación actual; el permiso se pide solo en ese toque; el
usuario puede mover el mapa bajo el pin fijo y "Confirmar". Se conserva el botón circular para recentrar.
Estados: buscando ("Buscando tu ubicación…" con el mapa ya abierto y el pin movible), encontrada,
aproximada (>50 m, "Ubicación aproximada" + "Repetir"), permiso negado (mapa en vista general con aviso
discreto "Sin permiso de ubicación. Ubica el pin a mano."; sin botón "Elegir en el mapa"), sin señal
("No hay señal de GPS. Ubica el pin a mano." + "Reintentar") y sin conexión ("Sin conexión. Guardar
necesita conexión."). Con ubicación guardada, "Cambiar" abre el selector centrado en el punto guardado;
"Quitar" y "Abrir en Maps" no cambian. Vista inicial sin GPS: último punto elegido o, si no hay, Colombia.
Un solo botón principal: "Confirmar". Solo tokens.
````

### 19.4 Búsqueda por libros
````
En el estado "sin resultados" de Clientes (escritorio y móvil, claro y oscuro), cambia el texto
secundario por "Busqué por nombre, teléfono, información, dirección y libros." y ajusta el placeholder
del buscador si menciona los campos. No cambies nada más.
````

## Prompt — módulo Inventario (ronda 20)
Pegar en el chat nuevo de diseño (con la skill `colportor-diseno`, que ya trae el estilo). Adjuntar `04-diseno/referencias/portadas/` solo para la exploración del identificador (DT-10), cuando toque. **Pegar todo lo que sigue:**

````
Diseña el módulo INVENTARIO de Colportor, en el mismo proyecto y con el mismo sistema de diseño de
Clientes (tokens, sin tamaños ni colores literales). Primero MÓVIL (390) en CLARO; después ESCRITORIO
(1440) en CLARO; el modo oscuro se hace al final, cuando todo esté resuelto. Sin textos explicativos y un
solo botón principal por pantalla. No inventes reglas: lo que no esté aquí, déjalo como placeholder.

PANTALLAS
1) INVENTARIO. Dos vistas arriba: "Libros en físico" (principal, por título) y "Ejemplares".
   Acción principal única: "Agregar". Acción secundaria: "Devolver al líder".
   - "Libros en físico": una fila por Título con la CANTIDAD de ejemplares en físico. Los minibooks van al final, aparte. Sección "Por resolver" para los ejemplares con novedad.
     SIN cifras de dinero en esta pantalla. Sin título ni subtítulos decorativos.
   - Cada Título necesita un identificador visual a la izquierda. Aún NO está decidido (ícono, portada o
     emoji): usa un cuadrado neutro de tamaño fijo como espacio reservado. No uses emojis.
2) EJEMPLARES (una fila por unidad física). Vistas: Todos / En físico / Vendidos / Con descuentos y
   aumentos. Orden y búsqueda con la barra de vista común (orden: recibido, vendido, título, precio
   acordado, diferencia). Cada fila: título, número (#12, con poca prominencia), estado, cliente, fechas
   (recibido y vendido), precio acordado, diferencia y marca de "precio distinto". SIN sumas de dinero al
   pie. En escritorio es una tabla; en móvil, filas de máximo 2 líneas con una señal de estado.
3) EJEMPLAR (detalle): título, número, estado, cliente, precio acordado (editable),
   precio distinto y diferencia, "Recibido el" (propiedad editable en línea, DISCRETA, no un botón
   destacado), historial. Acciones: editar precio, devolver, marcar con novedad (nota obligatoria),
   eliminar (con nota).
4) AGREGAR AL INVENTARIO. Búsqueda arriba, favoritos (estrella, máximo 6) como botones de un toque,
   lista de títulos activos con "+" al final de cada fila; tras tocar, el "+" se vuelve una pastilla con el
   número agregado en esa sesión; tocarla permite escribir la cantidad total. Aviso con "Deshacer" unos
   segundos. Chip discreto "Hoy ▾" para indicar un día pasado. Mismo patrón para libros y minibooks.
5) DEVOLVER AL LÍDER (en lote). Forma principal: cantidad por título con la misma pastilla numérica (se
   devuelven los más antiguos). Opción secundaria: "Elegir unidades" (casillas por ejemplar). Nota al
   final, antes de confirmar. Se puede deshacer desde el historial con una nota.
6) BUSCADOR "AGREGAR LIBRO" DE LA FICHA DE CLIENTE (reemplaza el aviso "Definir al diseñar Inventario").
   Una fila por título con "N en mano", categoría y precio de inventario. Tocar un título asigna el
   ejemplar con la fecha de recibido MÁS ANTIGUA y muestra su número y su fecha de recibido; un control para expandir el título y elegir otro por
   número. Los agotados van AL FINAL, atenuados y sin poder tocarse. Muestra cómo se marca un descuento
   o aumento sobre el precio de inventario ("Inventario $85.000 · Descuento $5.000 · Restaurar").

EXPLORACIONES (sin decidir; hazlas SOLO en móvil y claro primero, luego escritorio claro). Para CADA una
de estas dos decisiones, diseña 2 CONCEPTOS distintos y, de cada concepto, 2 FORMAS VISUALES (4
propuestas por decisión; imagínalas tú). Márcalas con una etiqueta de nombre, no con texto explicativo.
 A) Pantalla AGREGAR: cuadrícula de botones por título (como en Notion, con "Religiosos" plegado)
    vs. lista buscable agrupada por categoría (Culturales, Religiosos plegado, Minibooks al final).
 B) "POR RESOLVER" (ejemplares con novedad): dos conceptos de cómo se ve y se resuelve. Salidas
    permitidas: "Apareció", "Perdido (lo asumo yo)" y "Eliminar". NINGÚN texto, tooltip ni etiqueta
    puede insinuar que el líder pueda asumir una pérdida.
Cuando el dueño elija, se completan escritorio y oscuro. El identificador visual del título (ícono,
portada o emoji) se explora después, con las listas ya diseñadas.

REGLAS DE COPY: "En físico" (nunca "En inventario") para el estado de un ejemplar en tu poder.
"Ejemplar" = unidad; "Título" = el libro como producto. Dinero en COP sin decimales.
````


## Prompt — módulo Dinero (ronda 23)
Pegar en el chat de diseño (con la skill `colportor-diseno`), en el mismo proyecto. Primero **ESCRITORIO claro**; después móvil claro; el oscuro al final. **Pegar todo lo que sigue:**

````
Diseña el módulo DINERO de Colportor, en el mismo proyecto y con el mismo sistema de diseño (tokens, sin
tamaños ni colores literales). Primero ESCRITORIO (1440) en CLARO. Sin textos explicativos (tooltips con ⓘ
bajo demanda) y un solo botón principal por pantalla. No inventes reglas: lo que no esté aquí, déjalo como
placeholder. Dinero en COP sin decimales ($1.250.000), fechas dd/mm/aaaa.

ESTRUCTURA (reutiliza el patrón de Inventario): junto al título "Dinero", un control en rectángulo con
dos vistas y su conteo: "Abonos de clientes" y "Abibonos". Debajo, en óvalos, las vistas de la vista
elegida (como en Ejemplares de Inventario).
Arriba, FIJA en las dos vistas, la tarjeta "Por entregar": total en cifra grande, desglose "Efectivo" y
"Transferencia", y dentro de ella el único botón principal "Nuevo Abibono". Esta tarjeta es la opción A;
si no convence, el dueño pedirá otras variantes.

1) ABONOS DE CLIENTES. Óvalos: Todos · Por cobrar · Por entregar · Entregados. Un filtro "Método" (Todos /
   Efectivo / Transferencia) que se combina con cualquiera. Orden y búsqueda con la barra de vista común.
   - BARRA DE PROGRESO de 3 tramos (Entregado, Cobrado, Por cobrar) con monto y porcentaje por tramo,
     calculada sobre todos los abonos no cancelados. Al TOCAR un tramo se filtra la lista a ese estado
     (el tramo activo se ve seleccionado; tocarlo de nuevo quita el filtro). Solo en esta vista.
   - Columnas de la tabla: Cliente (avatar + nombre), Estado, Fecha acordada, Valor acordado, Fecha real,
     Valor real, Método.
   - ESTADOS Y COLOR del abono: "Por cobrar" gris; "Cobrado" verde (tooltip "Ya lo recibiste, falta
     entregarlo al líder"); "Entregado" en un tono "prime"; "Cancelado" gris con el texto tachado.
     "Vencido" NO es un estado: es una marca roja derivada que se suma a un abono "Por cobrar" cuya fecha
     ya pasó, con el texto "Vencido · hace N días".
   - VISTA "POR COBRAR": arriba, dos totales "Programado" y "Sin programar", y, SOLO si hay deuda sin
     programar, una línea discreta "Sin programar $X · N clientes" que abre una lista de esos clientes
     (cada uno lleva a su ficha para programar el abono). Cada fila tiene un botón secundario "Cobrar" que
     abre un formulario corto (modal en escritorio): valor real (precargado con el acordado), fecha (hoy
     por defecto, no futura) y método (Efectivo / Transferencia). Un solo botón principal "Cobrar" dentro
     del formulario.
   - Vistas "Por entregar" y "Entregados": la misma tabla filtrada. "Por entregar" = abonos Cobrados que
     aún no están en un Abibono confirmado.
2) ABIBONOS (tooltip del nombre: "Entrega al líder"). Lista con: nombre, fecha, total, efectivo,
   transferencia, estado (Borrador / Confirmado) y miniatura del recibo. Muestra el "Total abonado al
   líder". Sin subvistas en óvalos. Orden y búsqueda.
3) NUEVO ABIBONO (precargado desde la tarjeta o desde Hoy): título automático "Abibono – dd/mm/aaaa" y
   fecha automática, ambos editables. Lista de abonos Cobrados libres, TODOS preseleccionados, con casillas;
   asignaciones de minibooks (opcionales). Efectivo y transferencia se autocalculan y son editables; el
   Total es derivado y NO editable. "Esperado" vs "Entregado" y "Diferencia" siempre visibles; si la
   diferencia no es cero, la nota es obligatoria. Foto del recibo: una por defecto y "Añadir otra". Un solo
   botón principal "Confirmar" (el recibo es obligatorio); acción secundaria "Guardar borrador". Un Abibono
   sin abonos vinculados (donación) es válido, con nota.
4) ABIBONO CONFIRMADO (detalle): mismos datos en lectura, con nota y fotos editables; un botón DISCRETO
   "Reabrir" que pide un motivo obligatorio. Los abonos vinculados se ven bloqueados.
5) ESTADOS de las listas: cargando, vacío y sin conexión (se puede consultar, no guardar).

EXPLORACIÓN (sin decidir): el color de "Entregado". Muestra DOS variantes, una en DORADO y otra en AZUL
(distinto del acento de botones), aplicadas a la barra de progreso y a la lista. Rojo, verde y el tono
"prime" deben distinguirse también por luminosidad, no solo por tono (daltonismo).

REGLAS DE COPY: "Por cobrar", "Cobrado", "Entregado" (nunca "Sin reclamar", "Reclamado" ni "En la calle").
"Abibono" se conserva, con tooltip "Entrega al líder".
````
