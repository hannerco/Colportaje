# Brief de diseño (para Claude Design)

> Entregable para la herramienta de diseño. Pedir **2–3 variantes** de navegación y de los flujos clave (F-05 agregar a inventario, F-10 + Vender, F-16 devolución, F-17 Abibono, Hoy). El dueño elegirá. Reglas y datos exactos: `01-negocio/BUSINESS-RULES.md`, `01-negocio/FLOWS.md`, `01-negocio/FLOWS-ALTERNATIVOS.md`, `02-datos/DOMAIN-MODEL.md`. **El diseño debe estar listo en los primeros 2–3 días** para respetar el plazo de 14 días (`06-planificacion/ROADMAP.md`).

## 1. Producto en una frase
**Colportor**: PWA para colportores. Llevar clientes, libros en físico, ventas a cuotas, abonos y entregas al líder, desde el celular en la calle y desde el computador en el cuadre de la noche.

## 2. Usuarios y uso real
| Momento | Dispositivo | Lo que más usa |
|---|---|---|
| **Calle (día)** | Móvil, una mano, poca señal | **Pendientes del día (Hoy)**, **Clientes** (donde agrega las ventas), **Libros en físico**, **Agregar al inventario** |
| **Cuadre (noche)** | Escritorio | **Clientes** (completar información), **Abonos** (cuánto debe tener en **efectivo** y cuánto en **transferencia** para entregar), **Abibonos** (entregar al líder y guardar la foto del recibo) |
| Esporádico | Cualquiera | Totalizadores, libros individuales, inventario por título |

## 3. Estilo visual: **Notion**
El sistema original estaba en Notion y el dueño quiere **el mismo estilo visual**:
- Paleta **neutra** (blancos y grises cálidos), bordes finos y sutiles, **mucho aire**, tipografía sans limpia y legible.
- **Etiquetas/píldoras suaves** de color para estados, categorías y tipos (cultural / religioso / minibook; por cobrar / cobrado / entregado; reciente … antiguo).
- **Tablas tipo base de datos** con **pestañas de vista** arriba; **propiedades editables en línea** (clic → editar) con selectores de fecha y menús sencillos.
- Un **ícono por página/sección**. Modo **oscuro** equivalente al de Notion (automático según el dispositivo).
- Interacciones discretas: acciones secundarias en menús "⋯", hover/pulsación larga, nada estridente.
- **Un único componente de barra de vista** (pestañas de vista, filtro, orden y búsqueda) con **idéntico estilo en todos los módulos** (Clientes, Ejemplares, Dinero, Calendario, Hacer inventario…). El dueño exige consistencia y que el diseño sea **muy atractivo**.

## 4. Principios de diseño
1. **Pocos apartados.** Problema de Notion: demasiados apartados; la gente solo usaba Clientes y se perdía con "abonos vs abibonos". Se presentan juntos como **Dinero**.
2. **Un solo flujo de venta** (**+ Vender**, botón central).
3. **Calle:** acciones de un toque, objetivos táctiles grandes, legible al sol, poco texto por escribir.
4. **Noche/escritorio:** tablas con orden y filtros, paneles lista+detalle.
5. **Cifras con mesura:** el dinero total no se exhibe en pantallas de uso diario (es parte de la emoción del "Hacer inventario" con el líder). La meta es una **barra sin números**. Dónde sí se ve dinero: Dinero, ficha del cliente, Abibono, Hacer inventario y, en Hoy, **solo** la tarjeta "Por entregar" (BR-GOAL-06, BR-CAL-08).
6. **Tono:** sobrio, profesional, cálido. **Sin metáforas infantiles** (el icono de antigüedad no es una fruta).
7. **Ayuda contextual:** tooltips en español (ver §8).
8. **Rendimiento percibido:** estados de carga, UI optimista, miniaturas, mapa que carga al tocarlo.
9. **Acciones destructivas o delicadas son discretas** (ej.: "Reabrir" un Abibono, editar "Recibido el") pero siempre posibles.

## 5. Navegación base (alternativa A)
**Móvil — barra inferior (5), solo íconos** (como Instagram; el título de la sección se ve en la cabecera, y cada ícono tiene texto accesible):
`Hoy` · `Clientes` · **`+ Vender`** (central, destacado) · `Inventario` · `Más`
- **Más:** Dinero, Minibooks, Calendario completo, Hacer inventario, Ajustes (modo admin conmutable).
**Escritorio — menú lateral con ícono + texto:** Hoy, Clientes, Vender, Inventario, **Dinero** (pantalla propia), Minibooks, Calendario, Hacer inventario, Ajustes/Admin.
- **Cada sección necesita un ícono propio y reconocible** (pedir propuesta de set de íconos coherente).
- **Pedir variantes B y C** que reorganicen (p. ej. Calendario o Dinero en la barra; un "Hoy" más denso como inicio).

## 6. Pantallas (inventario completo)
| # | Pantalla | Contenido clave | Flujo |
|---|---|---|---|
| 1 | **Hoy** (subtítulo "Pendientes del día") | Tarjeta **"Por entregar"** (subtítulo "Recaudado sin entregar al líder": **total** como cifra principal, **desglose** Efectivo/Transferencia como apoyo, **ojo** para ocultar montos; toca → Dinero), cobros de hoy y **vencidos**, visitas, capacitaciones, recordatorios activos, **barra de meta (sin cifras; ubicación sujeta a cambio, DT-02)**, accesos rápidos a Agregar y + Vender | F-20 |
| 2 | **Clientes** | Buscador difuso grande, barra de vista (Recientes / Deudores / Todos / Archivados, selector de orden), interruptor "Incluir prospectos", **saldo pendiente por fila**, crear cliente sin libro. Opción de mostrar un total de deuda: decidir en diseño (DT-01) | F-11, F-23 |
| 3 | **Ficha de cliente** | Datos, **llamar / WhatsApp**, información con fotos aparte, dirección (texto, **Abrir en Maps**, mapa que carga al tocar), libros con precio y diferencia, abonos con estado (**Cancelados** plegable), deuda / saldo / **saldo a favor** / "sin programar", **aviso persistente** de abonos que no cuadran, facturas, visitas, acciones (devolver, archivar) | F-12 |
| 4 | **+ Vender** (asistente) | 1 Cliente (buscar/crear, aviso de duplicado) → 2 Ejemplares **uno por uno** (número + antigüedad) → 3 Cuota inicial y abonos programados (con aviso si exceden) → 4 Factura → 5 Confirmar | F-10 |
| 5 | **Inventario / Libros en físico** | Por título con **icono de antigüedad**, minibooks **al final/aparte**, sección "Por resolver", acción en lote **Devolver al líder** | F-06, F-26 |
| 6 | **Agregar a inventario** | **Lista** buscable + **favoritos** (estrella, máx. 6) + "+" por fila que se vuelve **pastilla numérica** (libros y minibooks igual), **chip de fecha "Hoy ▾"**, **Deshacer** | F-05 |
| 7 | **Ejemplares** | Pestañas **Todos / En inventario / Vendidos / Con descuentos y aumentos**, orden y búsqueda (barra de vista común) | F-07 |
| 8 | **Ejemplar (detalle)** | Número, título, estado, antigüedad, cliente, **precio acordado editable**, precio distinto y diferencia, **"Recibido el" editable en línea (discreto)**, historial, acciones (devolver, novedad, eliminar) | F-08, F-09, F-16 |
| 9 | **Devolver a inventario** | Motivo (*El cliente lo devolvió* / *Me equivoqué de cliente o de registro*), aclaración "abonos y Abibonos no cambian", resultado, saldo a favor, **modal de abonos que no cuadran** | F-16, F-29 |
| 10 | **Modal: abonos que no cuadran** | Saldo restante, total programado, sobrante, lista de abonos con casillas, botones *Recortar automáticamente / Cancelar los que marque / Dejar como está* | F-29 |
| 11 | **Dinero** | Por cobrar (con vencidos), **Por entregar** (total, con desglose efectivo / transferencia), Entregado; lista de Abibonos; "Nuevo Abibono" | F-15 |
| 12 | **Abibono** (tooltip: "Entrega al líder") | Vincular abonos y minibooks, efectivo/transferencia (auto, editables), total (no editable), **esperado vs entregado + diferencia**, nota, **recibo obligatorio** (una, "Añadir otra"), borrador → confirmado, **Reabrir** discreto | F-17 |
| 13 | **Minibooks** | Ventas del día (cantidad · monto), stock, "+ / pastilla numérica" para agregar, totales propios, entrega por saldo a favor | F-21 |
| 14 | **Calendario** | Mes y día, **semana desde domingo**, filtro por tipo (**abono / visita / capacitación**, distinguibles por forma+color+texto), crear visita/capacitación, recordatorios | F-18, F-19 |
| 15 | **Hacer inventario** | Tabla por título (Recibidos, Vendidos, En físico, Con novedad, Perdidos, Devueltos, Compra, Venta), grupos Culturales/Religiosos/Minibooks, vistas **Inventario** (culturales) y **Todos**, 8 totalizadores con selector, **"Perdidos asumidos" y "A responder al líder"**, botón **Copiar resumen** | F-22 |
| 16 | **Ajustes** | Modo administrador, **formato de hora 12 h/24 h**, favoritos, cerrar sesión | F-28 |
| 17 | **Admin** | **Catálogo** (CRUD de Títulos con imagen, desactivar), Ajustes (meta, umbrales de antigüedad, favoritos máx.), **Usuarios** (lista, **Invitar** con enlace copiable, regenerar, enlace de restablecimiento, desactivar/reactivar), uso de almacenamiento | F-03, F-04, F-25 |
| 18 | **Login / invitación** | Correo y contraseña; crear contraseña al abrir el enlace; sin registro público | F-01 |
| 19 | **Archivados** | Lista de clientes archivados con restaurar | F-27 |

## 7. Estados y patrones a diseñar
- **Abono:** Por cobrar → Cobrado → Entregado al líder, más **Cancelado** (tres estados principales claramente distintos, no solo por color).
- **Prórroga:** fecha original tachada + nueva; historial accesible.
- **Abono parcial:** sugerencia **no intrusiva** de programar el resto.
- **Diferencia del Abibono:** faltante/sobrante visibles, nota obligatoria cuando ≠ 0.
- **Antigüedad:** 4 etapas (Reciente / Normal / Envejeciendo / Antiguo), icono sobrio por etapas; solo en libros en físico y selector. **Pedir 3 propuestas.**
- **Con novedad:** representación **abierta** (el dueño la ajustará al verla). Pedir 3 propuestas (DT-03). **Ningún texto sugiere que el líder pueda asumir una pérdida.**
- **Saldo a favor:** nota en ficha + acción "Entregar un minibook".
- **Prospecto:** distinción visual sutil en la lista cuando se incluyen.
- **Vencido:** abono por cobrar con fecha pasada, resaltado.
- **Sin conexión:** banner persistente; lectura disponible; botones de guardar deshabilitados con explicación.
- **Vacíos, cargas, errores, éxito** (toasts con **Deshacer** al agregar ejemplares).
- **Confirmaciones delicadas** claras (devolver libro, archivar cliente, reabrir Abibono con motivo).
- **Propiedad editable en línea** (Notion) para "Recibido el" y precio acordado.

## 8. Tooltips obligatorios (texto en español)
| Concepto | Qué debe aclarar |
|---|---|
| Por cobrar / Cobrado / Entregado / Cancelado | Dónde está el dinero en cada estado |
| Por entregar | Dinero que ya cobraste y aún no has entregado al líder; el total y cuánto es efectivo y cuánto transferencia |
| Fecha acordada vs. real | Acordada = para cuándo prometió; real = cuándo pagó; la original se conserva si hay prórroga |
| Diferencia (aumento / descuento) | Precio acordado − precio público; positivo = ganaste, negativo = descuento |
| Abibono | **"Entrega al líder"**: dinero que le entregas |
| Esperado vs. entregado | Esperado = suma de abonos vinculados; la diferencia exige una nota |
| Con novedad | Marca un descuadre entre lo registrado y lo que tienes en físico (sin mencionar que el líder pueda asumir pérdidas) |
| Saldo a favor | El cliente pagó más de lo que debe; no hay reembolsos; se puede dar un minibook |
| Prospecto | Cliente sin libros vendidos |
| Antigüedad | Días desde que recibiste el ejemplar |
| Minibooks | Cuenta aparte; no suma a libros vendidos |
| Título vs. ejemplar | Un título es un libro del catálogo; un ejemplar es cada copia física tuya |
| A responder al líder | Mi compra de lo vendido + perdidos que asumes |
| Alerta de abonos | Por qué lo programado supera lo que falta pagar |

## 9. Responsive
- **Móvil (≥ 360 px):** barra inferior de íconos, tarjetas, formularios de un paso por pantalla, objetivos táctiles ≥ 44 px, **zona del pulgar** para acciones principales.
- **Tablet/escritorio (≥ 1024 px):** menú lateral ícono+texto, tablas con orden/filtros, paneles lado a lado (lista + detalle), formularios en dos columnas; **Dinero** y **Hacer inventario** pensados para pantalla grande.
- **Instalada como PWA:** pantalla completa, icono, splash, tema claro/oscuro.

## 10. Accesibilidad y visual
Contraste suficiente a pleno sol; no depender solo del color (iconos + texto); texto accesible en todos los íconos; formato de dinero `$1.250.000`; fechas `dd/mm/aaaa`; hora 12 h/24 h según Ajustes; semana desde domingo.

## 11. Decisiones que se toman durante el diseño (no son dudas abiertas)
| ID | Tema | Qué decidir |
|---|---|---|
| DT-01 | Total de deuda en Clientes | Si se ofrece una opción para mostrar el **total de dinero en la calle** en la lista de Clientes (el dueño pidió "dar la opción"; por defecto oculto) |
| DT-02 | Barra de meta | Ubicación (hoy: Hoy) y si se muestra; el dueño dijo "sujeto a cambios, puede que no la muestre si no me gusta". Pedir 2 propuestas |
| DT-03 | "Con novedad" | Representación visual y flujo. Pedir 3 propuestas |
| DT-04 | Set de íconos | Un ícono por sección, reconocible sin texto |
| DT-05 | Icono de antigüedad | Metáfora por etapas, sobria |
| DT-06 | Barra de vista | Diseño único reutilizado en todos los módulos |

## 12. Lo que NO diseñar ahora
Vista de líder (F3), campañas, reembolsos, cortes históricos de inventario, exportar PDF/CSV, notificaciones push (F2), escritura sin conexión (F2).

## 13. Qué esperamos de Claude Design
2–3 variantes de: navegación general, **Hoy**, **+ Vender**, **Agregar a inventario**, **Devolución + modal de abonos**, **Dinero/Abibono**, **Hacer inventario**; móvil y escritorio; set de íconos; barra de vista; icono de antigüedad (3 propuestas); "Con novedad" (3 propuestas); ubicación de la barra de meta (2 propuestas).
