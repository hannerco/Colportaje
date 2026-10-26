# Brief de diseño (para Claude Design)

> Entregable para la herramienta de diseño. Pedir **2–3 variantes** de navegación y de los flujos clave (F-05 agregar a inventario, F-10 + Vender, F-17 Abibono, Hoy). El dueño elegirá. Reglas y datos exactos: `BUSINESS-RULES.md`, `FLOWS.md`, `DOMAIN-MODEL.md`.

## 1. Producto en una frase
PWA para colportores: llevar clientes, libros en físico, ventas a cuotas, abonos y entregas al líder, desde el celular en la calle y desde el computador en el cuadre de la noche.

## 2. Usuarios y uso real
| Momento | Dispositivo | Lo que más usa |
|---|---|---|
| **Calle (día)** | Móvil, una mano, poca señal | **Pendientes del día (Hoy)**, **Clientes** (donde agrega las ventas), **Libros en físico**, **Agregar al inventario** |
| **Cuadre (noche)** | Escritorio | **Clientes** (completar información), **Abonos** (cuánto debe tener en **efectivo** y cuánto en **transferencia** para entregar), **Abibonos** (entregar al líder y guardar la foto del recibo) |
| Esporádico | Cualquiera | Totalizadores, libros individuales, inventario por título |

## 3. Principios de diseño
1. **Pocos apartados.** Problema de Notion: demasiados apartados; la gente solo usaba Clientes y se perdía con "abonos vs abibonos". Presentarlos juntos como **Dinero**.
2. **Un solo flujo de venta** (**+ Vender**, botón central). Evita decidir si se empieza por cliente o por venta.
3. **Calle:** acciones de un toque, objetivos táctiles grandes, texto legible al sol, sin pantallas que obliguen a escribir mucho.
4. **Noche/escritorio:** tablas con orden y filtros, paneles lista+detalle, atajos de teclado razonables.
5. **Cifras con mesura:** el dinero total no se exhibe en pantallas de uso diario (es parte de la emoción del "Hacer inventario" con el líder). La meta se muestra como **barra sin números**.
6. **Tono:** sobrio, profesional, cálido. **Sin metáforas infantiles** (el icono de antigüedad no es una fruta).
7. **Ayuda contextual:** tooltips en español en los conceptos complejos (ver §7).
8. **Rendimiento percibido:** estados de carga, UI optimista, miniaturas en listas, mapa que carga al tocarlo.

## 4. Navegación base (alternativa A)
**Móvil — barra inferior (5):**
`Hoy` · `Clientes` · **`+ Vender`** (central, destacado) · `Inventario` · `Más`
- **Más:** Dinero, Minibooks, Calendario completo, Hacer inventario, Ajustes (modo admin conmutable).
**Escritorio — menú lateral:** Hoy, Clientes, Vender, Inventario, **Dinero** (pantalla propia), Minibooks, Calendario, Hacer inventario, Ajustes/Admin.
**Pedir variantes B y C** que reorganicen, p. ej.: Calendario o Dinero dentro de la barra; Inventario dentro de Más; un "Hoy" más denso como pantalla de inicio. Evaluar cuál reduce la confusión de Notion.

## 5. Pantallas (inventario completo)
| # | Pantalla | Contenido clave | Flujo |
|---|---|---|---|
| 1 | **Hoy** (alias "Pendientes del día") | Cobros de hoy y vencidos, visitas, capacitaciones, recordatorios activos, **barra de meta (sin cifras; ubicación sujeta a cambio)**, accesos rápidos a Agregar a inventario y + Vender | F-20 |
| 2 | **Clientes** | Buscador difuso grande, vistas Recientes / Deudores / Todos, interruptor "Incluir prospectos", crear cliente sin libro | F-11, F-23 |
| 3 | **Ficha de cliente** | Datos, información con fotos, dirección (texto, **Abrir en Maps**, mapa que carga al tocar), libros con precio y diferencia, abonos con estado, deuda/saldo o **saldo a favor**, facturas, visitas, acciones | F-12 |
| 4 | **+ Vender** (asistente) | 1 Cliente (buscar/crear) → 2 Ejemplares **uno por uno** (número + antigüedad) → 3 Cuota inicial y abonos programados → 4 Factura → 5 Confirmar | F-10 |
| 5 | **Inventario** | Libros en físico por título con **icono de antigüedad**, minibooks **al final/aparte**, sección "Por resolver" | F-06 |
| 6 | **Agregar a inventario** | **Lista** buscable de Títulos + **favoritos como botones de un toque** (tope 6, estrella para marcar) | F-05 |
| 7 | **Ejemplares** | Pestañas **Todos / En inventario / Vendidos / Con descuentos y aumentos**, orden y búsqueda | F-07 |
| 8 | **Ejemplar (detalle)** | Número, título, estado, antigüedad, cliente, **precio acordado editable**, precio distinto y diferencia, acciones (devolver, marcar con novedad) | F-08, F-09, F-16 |
| 9 | **Dinero** | Por cobrar (con vencidos), **En mi poder: efectivo / transferencia**, Entregado; lista de Abibonos; "Nuevo Abibono" | F-15 |
| 10 | **Abibono** | Vincular abonos y minibooks, efectivo/transferencia (auto, editables), total (no editable), **esperado vs entregado + diferencia**, nota, **recibo obligatorio**, borrador → confirmado | F-17 |
| 11 | **Minibooks** | Entradas del día (cantidad · monto), stock, totales propios, nueva entrada, entrega por saldo a favor | F-21 |
| 12 | **Calendario** | Mes y día, filtro por tipo (**abono / visita / capacitación**, distinguibles por forma+color+texto), crear visita/capacitación, recordatorios | F-18, F-19 |
| 13 | **Hacer inventario** | Tabla por título, grupos Culturales/Religiosos/Minibooks, vistas **Inventario** (culturales) y **Todos**, los 8 totalizadores con selector Todos/Culturales/Religiosos, imprimir/compartir | F-22 |
| 14 | **Ajustes** | Modo administrador, favoritos, cerrar sesión | F-02 |
| 15 | **Admin** | Títulos (CRUD con imagen, desactivar), Ajustes (meta, umbrales de antigüedad, favoritos máx.), Usuarios y rol, **Cómo invitar a alguien**, uso de almacenamiento | F-03, F-04 |
| 16 | **Login / invitación** | Correo y contraseña; sin registro público | F-01 |

## 6. Estados y patrones a diseñar
- **Abono:** Por cobrar → Cobrado (en mi poder) → Entregado al líder (tres estados claramente distintos, no solo por color).
- **Prórroga:** fecha original tachada + nueva; historial accesible.
- **Abono parcial:** sugerencia **no intrusiva** de programar el resto.
- **Diferencia del Abibono:** faltante/sobrante visibles, nota obligatoria cuando ≠ 0.
- **Antigüedad:** 4 etapas (Reciente / Normal / Envejeciendo / Antiguo), icono sobrio por etapas; solo en libros en físico y selector de ejemplares.
- **Con novedad:** representación **abierta** (el dueño la ajustará al verla). Proponer opciones.
- **Saldo a favor:** nota en ficha + acción "Entregar un minibook".
- **Prospecto:** distinción visual sutil en la lista cuando se incluyen.
- **Vencido:** abono por cobrar con fecha pasada, resaltado.
- **Vacíos, cargas, errores, éxito** (toasts con deshacer al agregar ejemplares).
- **Confirmaciones destructivas** claras (devolver libro: aclarar que abonos y Abibonos no cambian).

## 7. Tooltips obligatorios (texto en español)
| Concepto | Qué debe aclarar |
|---|---|
| Por cobrar / Cobrado / Entregado | Dónde está el dinero en cada estado |
| Fecha acordada vs. real | Acordada = para cuándo prometió; real = cuándo pagó; la original se conserva si hay prórroga |
| Diferencia (aumento / descuento) | Precio acordado − precio público; positivo = ganaste, negativo = descuento |
| Esperado vs. entregado | Esperado = suma de abonos vinculados; la diferencia exige una nota |
| Con novedad | Marca un descuadre entre lo registrado y lo que tienes en físico |
| Saldo a favor | El cliente pagó más de lo que debe; no hay reembolsos; se puede dar un minibook |
| Prospecto | Cliente sin libros vendidos |
| Antigüedad | Días desde que recibiste el ejemplar |
| Minibooks | Cuenta aparte; no suma a libros vendidos |

## 8. Responsive
- **Móvil (≥ 360 px):** barra inferior, tarjetas, formularios de un paso por pantalla, objetivos táctiles ≥ 44 px, **zona del pulgar** para acciones principales.
- **Tablet/escritorio (≥ 1024 px):** menú lateral, tablas con orden/filtros, paneles lado a lado (lista + detalle), formularios en dos columnas, **Dinero** y **Hacer inventario** pensados para pantalla grande.
- **Instalada como PWA:** pantalla completa, icono, splash, tema claro/oscuro.

## 9. Accesibilidad y visual
Contraste suficiente a pleno sol; no depender solo del color (iconos+texto); tema claro y oscuro; tipografía legible; formato de dinero `$1.250.000`; fechas `dd/mm/aaaa` en español.

## 10. Lo que NO diseñar ahora
Vista de líder (F3), campañas, reembolsos, cortes históricos de inventario, notificaciones push (F2), modo offline (F2; solo reservar espacio para indicadores de sincronización).

## 11. Qué esperamos de Claude Design
2–3 variantes de: navegación general, **Hoy**, **+ Vender**, **Agregar a inventario**, **Dinero/Abibono**, **Hacer inventario**; móvil y escritorio; icono de antigüedad (3 propuestas); representación de "Con novedad" (3 propuestas); ubicación de la barra de meta (2 propuestas).
