# Flujos de usuario (caminos principales)

Cada flujo indica: contexto, pasos, reglas aplicadas (`BR-*`), resultado y bordes principales. **Los casos especiales y errores están en `01-negocio/FLOWS-ALTERNATIVOS.md` (`AF-*`).** Sirve de base para el diseño y para las pruebas E2E.

---

## F-01 Iniciar sesión (invitación)
- **Pasos:** el admin le pasa un enlace de invitación (WhatsApp) → abre el enlace → crea contraseña → entra a **Hoy**. Después entra con correo + contraseña.
- **Reglas:** BR-USR-01/02/03/05. No hay "Crear cuenta".
- **Borde:** enlace caducado → pedir uno nuevo al admin (AF-80). Contraseña olvidada → pedir al admin un enlace de restablecimiento (AF-82). Sesión expirada (AF-83).

## F-02 Cambiar a modo administrador
- **Pasos:** Más → Ajustes → "Modo administrador" (solo si tiene rol) → aparece la sección **Admin**.
- **Reglas:** BR-USR-04.

## F-03 Administrar el catálogo (admin)
- **Pasos:** Admin → **Catálogo** → crear (nombre, imagen, autor, descripción, precio público, precio colportor, categoría) → guardar. Editar. Desactivar (no borrar).
- **Reglas:** BR-TIT-01..07.
- **Borde:** AF-55, AF-56.

## F-04 Ajustes de admin y usuarios
- **Pasos:** Admin → **Ajustes**: meta de bonificación, máximo de favoritos. Admin → **Usuarios**: lista (nombre, correo, rol, estado), **Invitar** (F-25), generar enlace de restablecimiento, **desactivar/reactivar**.
- **Reglas:** BR-GOAL-01, BR-USR-05/07.

## F-05 Agregar a inventario
- **Contexto:** móvil, en la calle. **Mismo patrón para libros y minibooks.**
- **Pasos:** Inventario → **Agregar** (acción principal de Inventario) → lista de Títulos activos (buscable) con favoritos arriba. Cada fila tiene un **"+"**: un toque agrega **un** ejemplar ("Corazón tranquilo #13 agregado", **Deshacer** unos segundos). Tras agregar, el "+" se vuelve una **pastilla con el número** de esta sesión; tocarla permite **escribir la cantidad total** (el sistema ajusta). Un chip discreto **"Hoy ▾"** permite escoger un día pasado antes de agregar.
- **Favoritos:** estrella en cada fila (máx. 6); los favoritos aparecen como botones de un toque.
- **Reglas:** BR-COPY-02..05, BR-INV-02, BR-MBK-01.
- **Resultado:** ejemplar `in_stock` con snapshots de precio y `received_at` indicada.
- **Borde:** AF-50 (fecha pasada), AF-51 (agregué de más); sin títulos activos → estado vacío.

## F-06 Ver libros en físico
- **Pasos:** Inventario → lista de Títulos con cantidad `in_stock`; detalle por título con ejemplares (número y fecha de recibido). Minibooks al final/aparte. Sección **"Por resolver"** (`flagged`). Desde aquí: **Devolver al líder** (F-26).
- **Reglas:** BR-INV-03.

## F-07 Lista de ejemplares con vistas
- **Pasos:** Inventario → Ejemplares → pestañas **Todos / En físico / Vendidos / Con descuentos y aumentos**; orden y búsqueda con la **barra de vista común**.
- **Reglas:** BR-COPY-12.

## F-08 Detalle de un ejemplar
- **Muestra:** título, número, estado, cliente, **precio acordado** (editable), precio distinto y diferencia, **"Recibido el"** (propiedad editable en línea, discreta), historial.
- **Acciones:** editar precio acordado (recalcula saldo; puede disparar F-29), editar "Recibido el" (BR-COPY-04), devolver (F-16), marcar con novedad (F-09), eliminar (con nota).
- **Reglas:** BR-COPY-04/07, BR-PRC-01/02.

## F-09 Marcar y resolver "Con novedad"
- **Pasos:** ejemplar `in_stock` → "Marcar con novedad" → **nota obligatoria** → `flagged` (sale del físico, aparece en "Por resolver"). Resolver: **Apareció** (→ `in_stock`), **Perdido (lo asumo yo)** (→ `lost`) o **Eliminar** (nota opcional; se borra).
- **Reglas:** BR-COPY-10/11. **Ninguna etiqueta o tooltip menciona que el líder pueda asumir una pérdida.** Representación visual abierta (DT-03).
- **Casos:** AF-52, AF-53.

## F-10 Nuevo cliente (ficha viva)
- **Contexto:** botón global **"Nuevo cliente"** (persona con "+"); cubre al cliente nuevo y al prospecto. Para uno existente: Clientes → ficha → "Agregar libro". Reemplaza al antiguo asistente "+ Vender" (ADR-0035).
- **Pasos:** el botón abre una **ficha en blanco que se guarda sola**. Se escribe el **nombre** (obligatorio; aviso no bloqueante de posible duplicado, AF-70) y teléfono. Luego, en línea y en el orden habitual (no obligatorio):
  1. **Libros:** "+ Agregar libro" → ejemplares `in_stock` agrupados por título (número y fecha de recibido), **uno por uno**; el precio acordado nace igual al precio público y se edita en el ejemplar (F-08).
  2. **Abonos:** "+ Cuota inicial" (monto, método) → `collected`; **plan automático** (frecuencia, valor de cada abono, primer abono → tabla "Así quedan los abonos", BR-PAY-15) o "+ Programar" uno a uno (monto, fecha) → `scheduled`; "+ Extra". Las fechas se cambian con un calendario y "Correr también los siguientes".
  3. **Factura:** N.º de factura (opcional) y "+ Foto" (una o varias; también después); la fecha se llena sola con el día en que se agrega la foto (BR-CUS-17).
  4. Visitas, información, dirección y fotos: normalmente de noche.
  5. **Cierre:** la pantalla **Resumen** muestra qué se metió y qué falta; **"Guardar cliente"** cierra la ficha y **"Seguir editando"** vuelve a ella. **"Descartar"** (cabecera) elimina al cliente recién creado tras una confirmación que resume lo que se pierde (AF-112).
- **Avisos informativos en línea, sin bloqueo:** "Aún no tiene libro" si hay abonos sin libros (BR-PAY-14); "Lo programado supera el saldo en $X · **Revisar**" (BR-PAY-13; abre el modal F-29).
- **Reglas:** BR-CUS-14/16/17, BR-COPY-06/08, BR-CUS-02/03, BR-PAY-01..03/13/14/15.
- **Resultado:** un cliente con lo que se haya llenado; sin libros es prospecto.
- **Borde:** sin nombre al salir → no queda nada (AF-108); AF-31 (sin cuota ni programados); AF-107 (abonos antes del libro).

## F-11 Cliente sin libros (prospecto)
- **Es la misma ficha de F-10** sin agregar libros: un cliente sin ejemplares vendidos es prospecto (derivado). Opcionalmente se programa una **visita** (F-18).
- **Reglas:** BR-CUS-02/05/11/14.

## F-12 Ficha de cliente
- **Muestra:** datos; teléfono con **llamar** y **WhatsApp**; información (texto + fotos); dirección (texto) y **ubicación** (mapa con pin que carga al tocar, **Abrir en Maps**, "Elegir en mapa", "Cambiar", "Quitar"); libros con precio y diferencia; abonos con estado (**Cancelados** plegable); deuda, saldo pendiente o **saldo a favor**, "sin programar"; facturas; visitas; aviso persistente si los programados exceden el saldo.
- **Acciones:** **Agregar libro** (enlace de texto), registrar/programar/cobrar abono, factura/foto, visita, **devolver libro** (F-16), editar, **archivar** (F-27).
- **Reglas:** BR-CUS-04..12.

## F-13 Registrar y cobrar abonos
- **Cuota inicial / extra:** ficha → "Registrar abono" → monto, método, fecha (hoy, no futura) → `collected` (evalúa F-29).
- **Programar:** monto + fecha → `scheduled`.
- **Cobrar uno programado:** desde Hoy o la ficha → "Cobrado" → monto real (por defecto el acordado), fecha real, método → `collected`.
- **Parcial:** aviso no intrusivo para programar el faltante (AF-22). **Mayor al acordado:** AF-21.
- **Reglas:** BR-PAY-01..07.

## F-14 Prórroga
- **Pasos:** abono `scheduled` → "Dar más plazo" → nueva fecha (nota opcional) → fecha original tachada visible; el calendario usa la nueva; historial guardado.
- **Reglas:** BR-PAY-06. **Caso:** AF-24.

## F-15 Dinero (cuadre nocturno, escritorio)
- **Pasos:** Dinero → tarjeta fija **Por entregar** (total, efectivo, transferencia, "Nuevo Abibono"). Vista **Abonos de clientes**: óvalos Todos / Por cobrar (con vencidos y "Cobrar" por fila) / Por entregar / Entregados, filtro Método y barra de progreso tocable. Vista **Abibonos**: lista. Si hay deuda sin programar, la línea "Sin programar $X · N clientes" lleva a corregirla. Reglas: BR-DEP-14.
- **Reglas:** BR-PAY-02/08.

## F-16 Devolver un libro / quitar de un cliente
- **Cuándo:** solo si el cliente **ya existe**. Mientras se crea la ficha, quitar un libro se asume un error y no activa este flujo (AF-114).
- **Pasos:** ficha del cliente (o detalle del ejemplar) → **"Devolver a inventario"** → motivo (*El cliente lo devolvió* / *Me equivoqué de cliente o de registro*) → confirmación que aclara "los abonos y los Abibonos no cambian" → ejemplar a `in_stock` → si quedan abonos programados que ya no cuadran, **modal F-29** (sugerido: recortar desde el más lejano). Si queda **saldo a favor**, nota y acceso a "Entregar un minibook" (F-21).
- **Reglas:** BR-COPY-09, BR-PAY-13, BR-CUS-06. **Todos los casos:** `01-negocio/FLOWS-ALTERNATIVOS.md` A (AF-01..AF-12).

## F-17 Crear un Abibono (Entrega al líder)
1. **Entrada:** Dinero → "Nuevo Abibono", **o** el botón **"Entregar"** de la tarjeta "Por entregar" en Hoy (abre el asistente con todos los abonos cobrados ya seleccionados, BR-DEP-13). Nace `draft` al guardar; título y fecha automáticos, editables.
2. Elegir **abonos `collected`** libres y/o **entradas de minibooks** (indicando cuánto de cada una).
3. Efectivo y transferencia se **autocalculan** y se pueden editar; el **Total** no.
4. **Esperado vs. Entregado** y **Diferencia** siempre visibles; si ≠ 0 → **nota obligatoria**.
5. Subir **foto del recibo** (una; "Añadir otra" disponible).
6. **Confirmar** → abonos a `delivered`, bloqueados.
- **Reabrir** (discreto): motivo obligatorio; vuelve a borrador (AF-44).
- **Reglas:** BR-DEP-01..12. **Casos:** AF-40..AF-47.

## F-18 Visitas
- **Pasos:** desde la ficha, desde Clientes o desde el calendario: cliente (opcional) o etiqueta libre, fecha, hora opcional, nota, recordatorio opcional.
- **Estados:** pendiente → hecha / cancelada. **Convertir en cliente:** un toque.
- **Reglas:** BR-CAL-02/04. **Casos:** AF-72, AF-100.

## F-19 Capacitaciones
- **Pasos:** Calendario → "+" → Capacitación: título, empresa o lugar, fecha **y hora**, notas, recordatorios opcionales.
- **Reglas:** BR-CAL-03/04.

## F-20 Hoy (pendientes del día)
- **Muestra (nada más):** tarjeta **"Por entregar"** destacada en color de acento (total grande con ojo al lado, una línea con el desglose y el botón **"Entregar"** → Nuevo Abibono precargado; tocar el resto de la tarjeta → Dinero) · **aviso único** "N cobros vencidos ›" solo si hay (toca → Dinero ▸ Por cobrar ▸ Vencidos) · barra de meta fina sin números (ubicación sujeta a cambio) · **una lista cronológica** de hoy con cobros, visitas, capacitaciones y recordatorios (ícono de tipo en color, hora, nombre, detalle). **Único botón: "Entregar". Sin subtítulos, sin semana.**
- **Acciones:** tocar un cobro → F-13; tocar un evento → su detalle. El calendario es una sección aparte.
- **Reglas:** BR-CAL-05..09, BR-GOAL-01, BR-GEN-10/11. Los abonos `canceled` no aparecen; los vencidos no se listan uno por uno.

## F-21 Minibooks
- **Registrar venta:** Minibooks → "Nueva venta" → título (con stock), cantidad, monto (puede ser 0), método, fecha (hoy), nota → descuenta stock. Para varios títulos se repite.
- **Agregar stock:** mismo patrón "+ / pastilla numérica" que los libros (F-05).
- **Entrega por saldo a favor:** ficha del cliente → "Entregar un minibook" → título, cantidad, monto aplicado (≤ saldo a favor) → origen `client_credit`.
- **Totales de minibooks:** vendidos, ingresos, costo, ganancia neta, entregado al líder, stock.
- **Reglas:** BR-MBK-01..09. **Casos:** AF-10, AF-60..AF-64.

## F-22 Hacer inventario (cuadre con el líder)
- **Pasos:** Más → Hacer inventario → vista **Inventario** (solo culturales) o **Todos** (culturales + religiosos); minibooks siempre aparte → tabla por título (Recibidos, Vendidos, En físico, Con novedad, Perdidos, Devueltos, Compra, Venta) con subtotales y total → selector **Todos | Culturales | Religiosos** de los totalizadores → líneas **"Perdidos asumidos"** y **"A responder al líder"** → botón **"Copiar resumen"** (texto para pegar en WhatsApp). PDF/CSV: mejora futura.
- **Reglas:** BR-GOAL-02..07, BR-COPY-14.
- **Control:** `Recibidos = Vendidos + En físico + Con novedad + Perdidos + Devueltos`.

## F-23 Buscar clientes
- **Pasos:** Clientes → campo de búsqueda → resultados al teclear (tolerante a errores y acentos) sobre nombre, teléfono, información, dirección y libros → pestañas **Todos / Deudores / Saldados / Archivados**, selector de orden, interruptor "Incluir prospectos".
- **Reglas:** BR-CUS-05/07.

## F-24 Fotos
- **Pasos:** tomar/elegir (`<input capture>`) → el cliente comprime (WebP ≤1280 px ~150 KB + miniatura) → sube; requiere conexión (AF-92).
- **Reglas:** BR-PHO-01..04.

## F-25 Invitar a un colportor (admin)
- **Pasos:** Admin → Usuarios → **Invitar** → correo → la app muestra un **enlace** con botón "Copiar" → enviarlo por WhatsApp. Si caduca → **Regenerar**.
- **Reglas:** BR-USR-05. **Casos:** AF-80, AF-82.

## F-26 Devolver libros al líder (lote)
- **Pasos:** Inventario → Libros en físico → **Devolver al líder** → elegir **cantidad por título** (los más antiguos) o, con "Elegir unidades", ejemplares concretos `in_stock` (cualquier fecha de recibido) → nota → confirmar. **Deshacer** desde el historial con nota.
- **Reglas:** BR-COPY-16. **Caso:** AF-54.

## F-27 Archivar y restaurar un cliente
- **Pasos:** ficha → **Archivar** (solo sin ejemplares vendidos; los programados se cancelan con confirmación) → desaparece de las listas. Clientes → **Archivados** → **Restaurar**.
- **Reglas:** BR-CUS-09. **Caso:** AF-71.

## F-28 Ajustes personales
- **Pasos:** Más → Ajustes → **formato de hora (12 h / 24 h)**, favoritos, modo administrador (si aplica), cerrar sesión. Tema claro/oscuro automático.
- **Reglas:** BR-GEN-07, BR-USR-08.

## F-29 Alerta de abonos programados que no cuadran
- **Disparadores:** abono extra o mayor al acordado, devolución, bajar precio, editar/borrar abono cobrado, archivar, agregar o editar libros y abonos programados en la ficha (BR-PAY-13).
- **Pasos:** modal con saldo restante, total programado, **sobrante** y lista con casillas → **Recortar automáticamente** (desde el más próximo tras un abono extra; desde el más lejano tras devolución/baja de precio/archivado) / **Cancelar los que marque** / **Dejar como está** (aviso persistente en la ficha; solo si el cliente aún debe algo).
- **Resultado:** abonos `canceled` conservados en "Cancelados"; no cuentan en calendario ni totales.
- **Reglas:** BR-PAY-13. **Casos:** AF-05, AF-20, AF-21, AF-25, AF-29, AF-32.

## F-30 Elegir la ubicación de un cliente
- **Contexto:** ficha de cliente (nueva o existente), sección de dirección.
- **Pasos:** **"Elegir en mapa"** → el celular pide permiso **solo ahora** → se abre el **selector** centrado en la ubicación actual: mapa a pantalla completa con el pin fijo al centro y el círculo de precisión → el usuario mueve el mapa hasta poner el pin donde quiere (o toca el botón para recentrar en el GPS) → **Confirmar**. En la ficha queda un mapa con pin (carga al tocar) y el botón **"Abrir en Maps"**, que abre la app de mapas del celular en ese punto.
- **Reglas:** BR-CUS-08, BR-CUS-14. **Casos:** AF-109..AF-111.
