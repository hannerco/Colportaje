# Flujos de usuario

Cada flujo indica: actor/contexto, precondiciones, pasos, reglas aplicadas (`BR-*`), resultado y casos borde. Sirve de base para el diseño (Claude Design) y para las pruebas E2E.

---

## F-01 Iniciar sesión (invitación)
- **Contexto:** persona invitada por el admin.
- **Pasos:** recibe correo de invitación → crea contraseña → entra a **Hoy**.
- **Reglas:** BR-USR-01/02. No hay "Crear cuenta".
- **Borde:** enlace caducado → mensaje y pedir nueva invitación al admin. Sesión expirada → volver a login conservando la ruta.

## F-02 Cambiar a modo administrador
- **Pasos:** Más → Ajustes → "Modo administrador" (solo si tiene rol) → la navegación incorpora **Admin**.
- **Reglas:** BR-USR-04. Con la UI manipulada, el servidor igual rechaza escrituras sin rol.

## F-03 Administrar el catálogo de Títulos (admin)
- **Pasos:** Admin → Títulos → Crear (nombre, imagen, autor, descripción, precio público, precio colportor, categoría) → Guardar. Editar. Desactivar (no borrar).
- **Reglas:** BR-TIT-01..07. Precio público opcional solo en minibooks.
- **Borde:** desactivar título con ejemplares → permitido; no aparece al agregar a inventario. Cambiar precio → no afecta ejemplares existentes.

## F-04 Ajustes de admin
- **Pasos:** Admin → Ajustes: editar **meta de bonificación**, **umbrales de antigüedad** (con valores por defecto), **máximo de favoritos**; ver **"Cómo invitar a alguien"** y lista de usuarios con rol.
- **Reglas:** BR-GOAL-01, BR-COPY-13, BR-USR-05.
- **Texto mínimo de "Cómo invitar":** (1) Abre Supabase → Authentication → Users → *Invite user*; (2) escribe el correo; (3) la persona recibe el enlace y crea su contraseña; (4) vuelve aquí y confirma que aparece en la lista.

## F-05 Agregar a inventario
- **Contexto:** móvil, en la calle, con una mano.
- **Pasos A (favoritos):** Inventario → Agregar → toca el botón del Título favorito → se crea **un** ejemplar (toast "Corazón tranquilo #13 agregado", deshacer disponible unos segundos). Repetir toques = más ejemplares.
- **Pasos B (lista):** Agregar → buscar o elegir de la lista de Títulos activos → agregar → opción de repetir.
- **Favoritos:** estrella en cada Título de la lista para marcar/desmarcar; tope 6 (aviso al exceder).
- **Reglas:** BR-COPY-01..05, BR-INV-01/02. Los minibooks se agregan igual (también desde su sección).
- **Resultado:** ejemplar `in_stock` con snapshots de precio y `received_at = ahora`.
- **Borde:** sin título activo → estado vacío con explicación; error de red → mensaje y reintento (F1 online).

## F-06 Ver libros en físico
- **Pasos:** Inventario → lista de Títulos con cantidad `in_stock` y icono de antigüedad (el más antiguo del título); detalle por título con ejemplares (número, antigüedad). Minibooks al final/aparte. Sección "Por resolver" con ejemplares `flagged`.
- **Reglas:** BR-INV-03, BR-COPY-13.

## F-07 Lista de ejemplares con vistas
- **Pasos:** Inventario → Ejemplares → pestañas **Todos / En inventario / Vendidos / Con descuentos y aumentos**; ordenar (fecha recibido, fecha vendido, título, precio, diferencia) y buscar (título, cliente, número).
- **Reglas:** BR-COPY-12.

## F-08 Editar el precio acordado de un ejemplar
- **Pasos:** abrir el ejemplar vendido → editar *Precio acordado* → ver *Precio distinto* y *Diferencia* (aumento/descuento) → guardar.
- **Reglas:** BR-COPY-07, BR-PRC-01/02. Recalcula saldo del cliente.

## F-09 Marcar y resolver "Con novedad"
- **Pasos:** ejemplar `in_stock` → "Marcar con novedad" → nota obligatoria → pasa a `flagged` (sale del stock físico, aparece en "Por resolver"). Resolver: *Apareció* (→ `in_stock`) / *Perdido* (→ `lost`) / *Corregido* (borra el ejemplar), con nota opcional.
- **Reglas:** BR-COPY-10/11. **Diseño visual abierto**: el dueño lo ajustará al verlo.
- **Caso típico:** "el líder dice que me dio 4 y tengo 3" → se marca el ejemplar que falta.

## F-10 **+ Vender** (flujo central)
- **Contexto:** botón central; el mismo flujo cubre cliente nuevo, cliente existente y prospecto.
- **Paso 1 – Cliente:** buscar (búsqueda difusa) o "Crear cliente" (nombre obligatorio; teléfono, información, fotos, dirección opcionales).
- **Paso 2 – Libros:** lista de ejemplares `in_stock` agrupados por título, con número y antigüedad; el colportor los **elige uno por uno**. Cada uno entra con precio acordado = precio público del snapshot. (Cambiar un precio individual se hace luego, en el ejemplar: F-08.)
- **Paso 3 – Dinero:** total de la deuda (derivado). Registrar **cuota inicial** (monto, método) → abono `collected`. Programar **abonos programados** (monto, fecha) → `scheduled`. Se muestra el saldo restante resultante.
- **Paso 4 – Factura:** foto de la factura inicial (puede añadirse después; admite varias).
- **Paso 5 – Confirmar:** crea todo en una transacción lógica.
- **Reglas:** BR-COPY-06/08, BR-CUS-02/03, BR-PAY-01..03.
- **Resultado:** cliente con ejemplares `sold`, abonos y factura; deja de ser prospecto.
- **Borde:** sin stock suficiente → no se puede elegir; sin cuota inicial → válido; abonos programados que no suman el saldo → válido (saldo pendiente queda como "sin fecha").
- **Cliente existente que recompra:** mismos pasos; se agregan ejemplares y abonos al mismo cliente, el saldo se recalcula.

## F-11 Crear cliente sin libros (prospecto)
- **Pasos:** Clientes → "+" → datos → guardar. Opcionalmente programar una **visita** (F-18).
- **Reglas:** BR-CUS-02/05. No cuenta en totalizadores ni listas por defecto.

## F-12 Ficha de cliente
- **Muestra:** datos, información (texto + fotos), dirección (texto, "Abrir en Maps", mapa al tocar), libros con precio acordado/diferencia, abonos con estado y fechas (original tachada si hubo prórroga), deuda, saldo pendiente o **saldo a favor**, facturas, visitas.
- **Acciones:** agregar libro (F-10 prefijado), registrar abono (F-13), programar abono, agregar factura/foto, programar visita, devolver libro (F-16), editar, eliminar (BR-CUS-09).

## F-13 Registrar y cobrar abonos
- **Cuota inicial / abono extra:** ficha → "Registrar abono" → monto, método, fecha (hoy) → `collected`.
- **Programar:** monto + fecha → `scheduled` (aparece en Hoy y calendario).
- **Cobrar uno programado:** desde Hoy o la ficha → "Cobrado" → monto real (por defecto el acordado), fecha real (hoy), método → `collected`.
- **Parcial:** si monto real < acordado → aviso no intrusivo "Faltan $X: ¿programar otro abono?" (BR-PAY-07).
- **Reglas:** BR-PAY-01..07.

## F-14 Prórroga
- **Pasos:** abono `scheduled` → "Dar más plazo" → nueva fecha (y nota opcional) → la fecha original queda visible tachada, el calendario usa la nueva; se guarda el historial.
- **Reglas:** BR-PAY-06. Disponible solo si `scheduled`.

## F-15 Dinero (cuadre nocturno, escritorio)
- **Pasos:** Dinero → tarjetas **Por cobrar** (con vencidos), **En mi poder** (efectivo / transferencia por separado — "esto debes tener físicamente / en cuenta"), **Entregado**. Desde "En mi poder" → "Crear Abibono".
- **Reglas:** BR-PAY-02, "cash_on_hand / transfer_on_hand".

## F-16 Devolver un libro
- **Pasos:** ficha del cliente → ejemplar → "Devolver a inventario" → confirmación explicando que los abonos y Abibonos **no cambian** → ejemplar vuelve a `in_stock`.
- **Reglas:** BR-COPY-09, BR-CUS-06. Si queda saldo a favor, se muestra con nota y la opción "Entregar un minibook" (F-21).
- **Sin reembolsos** en la v1 (backlog).

## F-17 Crear un Abibono
1. Dinero → "Nuevo Abibono" (nace `draft`; título y fecha automáticos, editables).
2. Elegir **abonos `collected`** (los no vinculados a otro borrador) y/o **entradas de minibooks** (indicando cuánto de cada una; parcial permitido, no las de `client_credit`).
3. Efectivo y transferencia se **autocalculan**; el usuario puede editarlos (lo realmente entregado). El **Total** no se edita.
4. Se muestra **Esperado vs. Entregado** y la **Diferencia** (faltante/sobrante). Si ≠ 0 → nota obligatoria.
5. Subir **foto del recibo** (obligatoria).
6. **Confirmar** → los abonos pasan a `delivered` y quedan bloqueados.
- **Caso donación:** sin abonos vinculados; se indica efectivo/transferencia, título explicativo y nota.
- **Reglas:** BR-DEP-01..11.
- **Borde:** sin recibo → no se puede confirmar; borrar borrador libera los abonos.

## F-18 Visitas
- **Pasos:** crear desde la ficha del cliente, desde Clientes o desde el calendario: cliente (opcional) o etiqueta libre, fecha, hora opcional, nota, recordatorio opcional.
- **Estados:** pendiente → hecha / cancelada.
- **Convertir en cliente:** visita sin cliente → "Crear cliente" con un toque (precarga la etiqueta como nombre).
- **Reglas:** BR-CAL-02/04.

## F-19 Capacitaciones
- **Pasos:** Calendario → "+" → Capacitación: título, empresa o lugar, fecha y hora, notas, recordatorios.
- **Reglas:** BR-CAL-03/04.

## F-20 Hoy (pendientes del día)
- **Muestra:** cobros de hoy, cobros vencidos, visitas de hoy, capacitaciones de hoy, recordatorios activos, barra de meta, accesos rápidos (Agregar a inventario, + Vender).
- **Acciones:** tocar un cobro → F-13; tocar un evento → detalle; "Ver calendario" → calendario con filtro por tipo.
- **Reglas:** BR-CAL-05/06/07, BR-GOAL-01.

## F-21 Minibooks
- **Registrar entrada:** Minibooks → "Nueva entrada" → título (solo minibooks con stock), cantidad, monto (puede ser 0), método, fecha (hoy), nota → descuenta stock. Para varios títulos se repite rápido.
- **Entrega por saldo a favor:** desde la ficha del cliente con saldo a favor → "Entregar un minibook" → título y cantidad, monto aplicado (≤ saldo a favor) → origen `client_credit` (no ingreso, no va a Abibono).
- **Totales de minibooks:** vendidos, ingresos, costo, ganancia neta, entregado al líder, stock.
- **Reglas:** BR-MBK-01..09.
- **Borde:** sin stock → bloquea con atajo "Agregar al inventario".

## F-22 Hacer inventario (cuadre con el líder)
- **Pasos:** Más → Hacer inventario → elegir vista **Inventario** (solo culturales) o **Todos** (culturales + religiosos); minibooks siempre aparte → tabla por título (Recibidos, Vendidos, En físico, Con novedad, Perdidos, Compra, Venta) con subtotales por grupo y total → selector **Todos | Culturales | Religiosos** de los totalizadores → imprimir/compartir.
- **Reglas:** BR-GOAL-02..06, BR-COPY-14.
- **Borde:** `Recibidos = Vendidos + En físico + Con novedad + Perdidos` siempre.

## F-23 Buscar clientes
- **Pasos:** Clientes → campo de búsqueda → resultados al teclear (tolerante a errores y acentos) sobre nombre, teléfono, información y dirección → listas Recientes / Deudores / Todos + interruptor "Incluir prospectos".
- **Reglas:** BR-CUS-05/07.

## F-24 Fotos
- **Pasos:** tomar/elegir → el cliente comprime (WebP ≤1280 px ~150 KB + miniatura) → sube; en F1 requiere conexión.
- **Reglas:** BR-PHO-01..04.
