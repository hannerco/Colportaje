# Brief de diseño v2 (para Claude Design)

> **Versión 2 (2026-10-29).** Reemplaza la v1 tras revisar el primer resultado de Claude Design (`Colportor.html`): demasiada información, colores por todas partes, "Vender" repetido, calendario redundante en Hoy y rasgos típicos de interfaz generada por IA. Reglas de comportamiento: `01-negocio/BUSINESS-RULES.md`; flujos: `01-negocio/FLOWS.md`; decisiones: `00-contexto/DECISION-LOG.md` (ronda 11); principios: `03-arquitectura/adr/0032-principios-de-diseno.md`. **Prompt listo para pegar:** `04-diseno/PROMPT-CLAUDE-DESIGN.md`.

## 1. Producto
**Colportor**: PWA para colportores (venta de libros a cuotas, Colombia). Móvil en la calle; escritorio para el cuadre de la noche. Texto en español. Dinero `$1.250.000`, fechas `dd/mm/aaaa`, semana desde domingo.

| Momento | Dispositivo | Usa |
|---|---|---|
| Calle (día) | Móvil, una mano, poca señal | Hoy, Clientes, Libros en físico, Agregar al inventario, Vender |
| Cuadre (noche) | Escritorio | Clientes (completar), Dinero (por entregar), Abibonos, Hacer inventario |

## 1b. Referencias visuales del dueño (2026-10-29)
Guardadas en `04-diseno/referencias/`. Son **inspiración de estructura y suavidad**, no para copiar (ni su contenido de ejemplo, ni gráficos decorativos, ni avatares con foto).
- **Referencia 1 — escritorio** (`ref-1-escritorio-sidebar-y-tabla.png`): "me encanta para Clientes y para el sidebar". Rasgos: fondo gris claro con el contenido en **un panel blanco grande y redondeado**; sidebar con **tarjeta de perfil/espacio arriba** (logo, nombre, selector ⌃⌄), separador punteado, ítems con íconos de trazo y **activo = píldora blanca elevada con sombra mínima**; **pestañas de vista como píldoras con el conteo en gris tenue**; título con conteo tenue; **búsqueda + botones-píldora con ícono** como filtros; **tabla** con cabecera gris redondeada, filas altas y aireadas **sin líneas**, y **columna de estado con píldora suave de color + ícono**.
- **Referencia 2 — móvil** (`ref-2-movil-barra-flotante-y-agenda.png`): "me gusta". Rasgos: fondo cálido suave, superficies casi translúcidas, esquinas muy redondeadas; cabecera con título y **botones circulares pequeños**; búsqueda con **ícono de filtro**; **barra inferior flotante tipo píldora (4 íconos, activo en píldora clara) con un botón circular oscuro "+" aparte**; en agenda, **tira de semana + línea de tiempo por horas** (solo para el módulo Calendario, nunca en Hoy).
- **Referencia 3 — móvil** (`ref-3-movil-lista-de-actividad.png`): del dueño, para la **lista de clientes**: fila con avatar circular a la izquierda, **nombre**, segunda línea gris y **monto a la derecha**, sin tarjetas. Aplicación: nombre del cliente, **libro vendido** debajo (si hay varios, el más reciente + "+N"), **saldo pendiente** a la derecha. **No se adopta** de esa imagen: cabecera morada con gradiente, tarjeta con gráfico, bandera ni botones de acción en píldora (lista negra §3).
- **Referencia 4 — móvil** (`ref-4-movil-tarjeta-saldo-con-accion.png`): del dueño, **solo la tarjeta de arriba** para **Hoy**: tarjeta oscura destacada con "Your Balance", cifra grande, **ícono de ojo junto a la cifra** y botones en píldora clara. Aplicación: tarjeta **"Por entregar"** (cifra, ojo, desglose) con **un solo botón "Entregar"** que lleva a hacer el Abibono con ese dinero. En la variante B la tarjeta usa `#092e53`. **No se adopta** de esa imagen: el resto (seguimiento de envíos, líneas de progreso, avatar con saludo, tarjetas "Current Tracking"). Idea para más adelante, **no aplicada**: su paso a paso conectado (Recibido · En tránsito · Entregado) encaja con los estados de abono (Por cobrar · Cobrado · Entregado); se evaluará si el dueño lo pide.
- **Se adopta:** panel blanco sobre gris, sidebar con tarjeta de perfil y píldora activa, pestañas-píldora con conteo, filtros-píldora, tabla aireada, barra flotante + botón "+" circular, calendario con línea de tiempo.
- **No se adopta:** gráficos decorativos, tarjetas de "rendimiento", fotos de avatar (se usan iniciales), borde oscuro a la izquierda de cada tarjeta (solo en tarjetas de eventos del Calendario).

## 2. Dirección visual: Notion, sobrio
Neutros cálidos, bordes finos solo donde separan, mucho aire, **fuente del sistema** (la de Notion: `ui-sans-serif, -apple-system, "Segoe UI"…`), íconos de trazo, tablas tipo base de datos con pestañas de vista, propiedades editables en línea, modo oscuro automático. **Menos explicación, más visualización:** un dato se entiende por posición, ícono o forma, no por una frase.

## 3. Lista negra (lo que hace que una UI parezca "hecha con IA")
Investigado en la web; **no usar nada de esto**:
- Gradientes (sobre todo morado/azul/índigo), "glow", glassmorphism, blobs 3D.
- Emojis como íconos.
- Héroes centrados con tres tarjetas de ícono.
- **Etiquetas/badges por todas partes** y **íconos dentro de círculos tintados** en cada fila.
- **Todo en tarjetas** con borde, esquinas redondeadas y sombra idénticas; **borde de color a la izquierda** en tarjetas.
- Muchos tonos de color al mismo tiempo (efecto confeti).
- Tipografía por defecto de IA (Inter/Jakarta/Geist), cuerpo en semibold, títulos sin interletrado.
- Texto de relleno, **subtítulos bajo cada título**, contadores en todas las secciones, microcopy genérico.
- Dobles barras de progreso o gráficos sin significado; datos de ejemplo tipo "John Doe / Acme".
- Cajas de ícono grandes junto a títulos de página (efecto portada).

## 4. Color: dónde sí y dónde no
- **Base:** neutros (fondo, superficie, borde, texto). Estados y categorías en **gris** (se distinguen por ícono o texto).
- **Acento único** en acciones principales y elemento activo. Variante principal: casi negro (`#1F1E1D`). **Variante pedida: acento `#092e53` (azul marino profundo).**
- **Rojo** solo para vencido, error y acciones destructivas.
- **Estado del cliente** (inspirado en la Referencia 1): pequeña **píldora suave con ícono** — *Al día* (verde), *Con saldo* (ámbar), *Vencido* (rojo) **solo en la tabla de escritorio**. **En móvil no hay píldora**: el saldo se muestra **en rojo** cuando hay algo vencido. Es el **único** lugar con verde/ámbar.
- **Microacentos de color — el único lugar con color de categoría:** un **ícono pequeño (solo el trazo, sin círculo ni fondo)** que distingue el **tipo de evento**: cobro, visita, capacitación. Tonos apagados y bien distinguibles (el primer diseño usó naranja / azul / morado y le gustó; en la variante marino cuidar que "visita" no choque con el acento, p. ej. verde azulado). Nada más lleva color de categoría.

## 5. Presupuesto de densidad (móvil)
- Una **fila = 2 líneas máximo** y **una sola señal** de estado.
- **Sin** subtítulos de página, **sin** contadores en secciones, **sin** explicaciones permanentes. La ayuda va en un **ⓘ** discreto que se abre solo al tocar.
- Máximo **5 bloques** por pantalla en el primer vistazo; todo lo secundario se revela al tocar (**divulgación progresiva**).
- Máximo **3 tamaños de texto** por pantalla, con la **escala tipográfica** de la sección 5b (el texto pequeño del primer diseño —13 px y menos— queda prohibido para información clave).
- **Más de 5 opciones → se dividen en grupos** (menús, sidebar, "Más", filtros, selectores).

## 5b. Escala tipográfica (tamaños de referencia)
Basada en lo que usan las apps de referencia (iOS: 17 / 15 / 13 pt; Material: cuerpo 16 sp mínimo, leyendas 12 sp; sistemas de diseño: base 16 px). **El primer diseño usó sobre todo 13 px: demasiado pequeño.**

| Uso | Móvil | Escritorio |
|---|---|---|
| Cifra destacada (p. ej. "Por entregar") | 36 | 40 |
| Título de pantalla | 28 | 32 |
| **Texto principal** (nombres, filas, botones, campos, sidebar) | **17** | **16** (sidebar 15) |
| **Texto secundario** (hora, detalle, saldo) | **15** | **14** |
| Leyendas y marcas cortas (solo si no son información clave) | 13 mínimo | 13 mínimo |

- **Nunca menos de 13 px**, y nada importante por debajo de 15 px en móvil.
- Los **campos de texto en móvil, 16 px o más** (evita que iOS amplíe la pantalla al enfocar).
- Interlineado 1.4–1.5; tamaños en `rem` para respetar el tamaño de texto del sistema; probar con texto del sistema aumentado.
- Con texto más grande caben menos elementos: es coherente con el minimalismo (si no cabe, sobra).

## 6. Leyes de UX aplicadas
| Ley | Cómo se aplica |
|---|---|
| **Hick** | Máximo 5 opciones visibles por grupo; el resto agrupado |
| **Miller** | Listas cortas y agrupadas (~7 como límite) |
| **Fitts** | Acción principal grande, abajo, a la altura del pulgar |
| **Jakob** | Se comporta como lo conocido: sidebar de Notion, barra inferior de íconos como Instagram |
| **Von Restorff** | Un solo elemento destacado por pantalla |
| **Proximidad / región común** | Lo relacionado va junto; se agrupa con espacio y títulos de grupo, no con más tarjetas |
| **Tesler** | La complejidad se absorbe en el sistema (autocálculos), no en la pantalla |
| **Doherty (<400 ms)** | Respuesta inmediata, estados optimistas |
| **Meta-gradiente / Zeigarnik** | Barra de meta sin cifras; Hoy muestra solo lo pendiente |
| **Estético-usabilidad** | Lo cuidado se percibe más fácil |
| **Nielsen #8 (minimalista)** | Quitar lo que distrae; lo secundario bajo demanda |

## 7. Navegación
**Móvil — barra inferior flotante tipo píldora, SOLO íconos** (Referencia 2; el título va en la cabecera; cada ícono con texto accesible): **4 íconos** `Hoy · Clientes · Inventario · Más` y, **aparte a su derecha, un botón circular oscuro "+" = Vender**.
**Más** = hoja con **grupos de máximo 4**: *Trabajo* (Calendario, Minibooks) · *Dinero* (Dinero, Hacer inventario) · *Cuenta* (Ajustes, Admin si aplica).

**Escritorio — sidebar estilo Notion + Referencia 1** (≈260 px; tarjeta de perfil arriba con selector; secciones plegables con etiqueta tenue; "+" y "⋯" al pasar el cursor; **ítem activo = píldora blanca elevada**; sin etiquetas de color):
```
┌──────────────────────────┐
│ ◧ Colportor        ▾  HC │   ← perfil (como el selector de espacio de trabajo)
│ ⌕ Buscar            ⌘K   │
│ ☼ Hoy                    │
│ ＋ Vender                │   ← ÚNICA acción principal de la app
│                          │
│ ▾ Trabajo                │
│   ◔ Clientes          ＋ │
│   ▤ Inventario           │
│   ▢ Minibooks            │
│   ▦ Calendario           │
│ ▾ Dinero                 │
│   ▭ Dinero               │
│   ☑ Hacer inventario     │
│                          │
│ ⚙ Ajustes   ⛨ Admin      │
└──────────────────────────┘
```

## 8. Una acción principal por pantalla; "Vender" una sola vez
- **"Vender" existe una sola vez:** botón central de la barra (móvil) / entrada destacada del sidebar (escritorio). **Ninguna pantalla lo repite.** En la ficha de un cliente se usa un enlace de texto secundario **"Agregar libro"**.
- Cada pantalla tiene como máximo **una** acción de contexto destacada: Inventario → **Agregar**; Dinero → **Nuevo Abibono**; Minibooks → **Nueva venta**; Clientes → **Nuevo** (en la barra de vista); Calendario → **+**; Hacer inventario → **Copiar resumen**. **Hoy tiene un único botón: "Entregar", dentro de la tarjeta "Por entregar".**

## 9. Pantallas
| # | Pantalla | Contenido (lo mínimo) | Flujo |
|---|---|---|---|
| 1 | **Clientes** (se diseña primero) | Móvil: búsqueda con filtro, pestañas-píldora con conteo tenue (Recientes / Deudores / Todos / Archivados), lista aireada (Referencia 3): avatar de iniciales · **nombre** · **libro vendido** debajo · **saldo** a la derecha (rojo si vencido); escritorio: panel blanco "Clientes 48", filtros-píldora y tabla (Cliente · Teléfono · Libro(s) · Saldo · Último abono · Estado); orden e "Incluir prospectos" dentro del filtro | F-11, F-23 |
| 2 | **Hoy** | Ver wireframe abajo | F-20 |
| 3 | **Ficha de cliente** | Datos, llamar/WhatsApp, información y fotos, dirección (Abrir en Maps; mapa al tocar), libros, abonos, deuda/saldo/saldo a favor, "Agregar libro" (texto), acciones en "⋯" (devolver, archivar) | F-12 |
| 4 | **+ Vender** | 5 pasos: cliente → ejemplares uno por uno → cuota inicial y abonos → factura → confirmar | F-10 |
| 5 | **Inventario** | Libros en físico por título con ícono de antigüedad; minibooks al final; "Por resolver"; **Agregar** (principal); "Devolver al líder" en lote | F-06, F-26 |
| 6 | **Agregar a inventario** | Lista buscable + favoritos; "+" por fila → pastilla numérica; chip de fecha "Hoy ▾"; Deshacer | F-05 |
| 7 | **Ejemplares** | Pestañas Todos / En inventario / Vendidos / Con descuentos y aumentos | F-07 |
| 8 | **Ejemplar** | Estado, antigüedad, cliente, precio acordado y "Recibido el" editables en línea, historial | F-08, F-09 |
| 9 | **Devolver + modal de abonos** | Motivo (2 opciones) → modal con sobrante y abonos con casillas: Recortar / Cancelar los que marque / Dejar | F-16, F-29 |
| 10 | **Dinero** | Por cobrar (vencidos filtrables) · Por entregar · Entregado; Abibonos | F-15 |
| 11 | **Abibono** | Vincular, efectivo/transferencia, esperado vs entregado, recibo, Reabrir discreto | F-17 |
| 12 | **Minibooks** | Ventas del día, stock, agregar con "+ / pastilla" | F-21 |
| 13 | **Calendario** | Mes/día; tres tipos con ícono de color; crear visita/capacitación | F-18, F-19 |
| 14 | **Hacer inventario** | Tabla por título, grupos, vistas Inventario/Todos, totalizadores, Perdidos asumidos / A responder al líder, Copiar resumen | F-22 |
| 15 | **Admin** | Catálogo, Ajustes, Usuarios (Invitar con enlace copiable), almacenamiento | F-03, F-04, F-25 |
| 16 | **Login / Ajustes** | Invitación; modo admin, formato de hora, favoritos | F-01, F-28 |

### Hoy (móvil) — sin calendario, un solo botón, sin subtítulos
```
Hoy                                   mié 28 oct      ← título + fecha pequeña, nada más
┌───────────────────────────────────────┐   ← tarjeta destacada en COLOR DE ACENTO (Referencia 4)
│ Por entregar                          │      texto claro; la única tarjeta oscura de la pantalla
│ $385.000  ◉                           │   ← total grande + ojo al lado de la cifra
│ Efectivo 265.000 · Transferencia 120.000   ← una línea pequeña
│ ( Entregar )                          │   ← ÚNICO botón de Hoy (píldora clara) → Nuevo Abibono precargado
└───────────────────────────────────────┘      (tocar el resto de la tarjeta → Dinero)
⚠ 2 cobros vencidos                      ›     ← aviso ÚNICO en rojo; tocar → Dinero ▸ Por cobrar ▸ Vencidos
▬▬▬▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░                      ← meta: barra fina, sin números ni etiqueta
 ◔ 9:40   María Camila Henao       $40.000     ← UNA lista cronológica de hoy:
 ◍ 3:00   Gloria Inés Patiño       Visita        ícono de tipo (único color) · hora · nombre · detalle
 ▣ 7:00   Capacitación de campaña  Salón…         (cobros + visitas + capacitaciones mezclados)
──────────────────────────────────────────
  ☼        ◔       [ ＋ ]       ▤        ⋯       ← barra inferior solo íconos
```
No hay semana, ni "agenda" aparte, ni lista de vencidos fila por fila, ni botón "Agregar inventario" (vive en Inventario). El aviso de vencidos solo aparece si hay alguno.

## 10. Variantes (desde el principio; que sean realmente distintas)
Todas comparten la navegación de las Referencias (barra flotante + botón "+" circular en móvil; sidebar con tarjeta de perfil y píldora activa en escritorio).
- **A · Tinta:** acento casi negro `#1F1E1D`.
- **B · Marino:** **acento `#092e53`** en la acción principal y el elemento activo; misma estructura que A para comparar solo el color (ícono de "visita" en verde azulado).
- **C · Editorial:** **sin superficies elevadas ni sombras**, solo líneas finas y espacio.
Cada variante en móvil y escritorio, claro y oscuro. En todas rigen las secciones 3–8.

**Orden de pantallas:** se empieza por **Clientes** (lista móvil + tabla de escritorio con el sidebar); **no** por Hoy. Después: ficha de cliente → Hoy → + Vender → Inventario y Agregar → Devolver + modal → Dinero y Abibono → Minibooks → Calendario (con tira de semana y línea de tiempo) → Hacer inventario → Admin → Login y Ajustes.

## 11. Estados y patrones
- Estados de abono: Por cobrar → Cobrado → Entregado (+ Cancelado), por **ícono/texto en gris**, no por color.
- Prórroga: fecha original tachada + nueva (solo en el detalle del abono).
- **Con novedad:** 3 propuestas visuales (DT-03); salidas: Apareció / Perdido (lo asumo yo) / Eliminar. Ningún texto sugiere que el líder pueda asumir pérdidas.
- Antigüedad: 4 etapas con ícono sobrio (3 propuestas; no una fruta).
- Sin conexión: franja discreta y botones de guardar deshabilitados (se puede consultar).
- Vacíos, carga, error y éxito (con **Deshacer** al agregar ejemplares).
- Propiedades editables en línea (Notion): "Recibido el", precio acordado.
- **Tooltips:** solo con **ⓘ**, bajo demanda; nunca texto explicativo permanente. Conceptos: Abibono = "Entrega al líder", Por entregar, estados de abono, fecha acordada vs real, diferencia, Esperado vs entregado, Con novedad, Saldo a favor, Prospecto, Antigüedad, Título vs Ejemplar, A responder al líder, alerta de abonos.

## 12. Responsive
- **Móvil (≥ 360 px):** barra inferior de íconos, listas en vez de tarjetas, formularios de un paso, objetivos ≥ 44 px, acciones en la zona del pulgar.
- **Escritorio (≥ 1024 px):** sidebar Notion, tablas con orden/filtros, paneles lista + detalle; **Dinero** y **Hacer inventario** pensados para pantalla grande.
- **PWA instalada:** pantalla completa, ícono, splash, claro/oscuro.

## 13. Decisiones de diseño abiertas (se resuelven viendo propuestas)
| ID | Tema |
|---|---|
| DT-01 | Opción discreta de mostrar el total de deuda en Clientes (oculto por defecto) |
| DT-02 | Ubicación de la barra de meta (hoy: en Hoy) y si se muestra; 2 propuestas |
| DT-03 | Representación de "Con novedad"; 3 propuestas |
| DT-04 | Set de íconos: uno por sección, reconocible sin texto |
| DT-05 | Ícono de antigüedad por etapas; 3 propuestas |
| DT-06 | Barra de vista única reutilizada en todos los módulos |
| DT-07 | Tres tonos de los microíconos de tipo de evento (cobro / visita / capacitación) en cada variante |

## 14. No diseñar ahora
Vista de líder, campañas, reembolsos, exportar PDF/CSV, notificaciones push, escritura sin conexión.

## 15. Lista de revisión de un resultado (la usa el revisor antes de aceptarlo)
- [ ] Ningún elemento de la lista negra (§3).
- [ ] Color solo en: acento, rojo semántico y microíconos de tipo de evento.
- [ ] Filas ≤ 2 líneas, una señal de estado; sin subtítulos ni contadores.
- [ ] "Vender" una sola vez por pantalla/layout.
- [ ] Hoy: una lista cronológica, aviso único de vencidos, sin semana; el único botón es "Entregar" dentro de la tarjeta "Por entregar".
- [ ] Más de 5 opciones agrupadas; sidebar tipo Notion.
- [ ] Barra de vista idéntica en todos los módulos.
- [ ] Móvil legible a 390 px; escritorio coherente; claro y oscuro.
