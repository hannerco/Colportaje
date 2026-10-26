# Reglas de negocio

Fuente normativa. Cada regla tiene un ID estable (`BR-*`) para referenciarla en código, pruebas y commits. Si una regla cambia, se actualiza aquí **y** en su ADR, y se añade una línea a `DECISION-LOG.md`.

Notación: "colportor" = usuario con rol colportor. Fechas calendario en **America/Bogota**. Dinero en **COP enteros** (sin decimales, ≥ 0 salvo indicación).

---

## 1. Generales

- **BR-GEN-01** Todo registro pertenece a un único colportor (`owner_id`). Ningún usuario ve ni modifica datos de otro. El admin tampoco ve datos de otros colportores en la v1.
- **BR-GEN-02** Todo borrado de entidades de negocio es **lógico** (`deleted_at`). Nada se elimina físicamente salvo los borradores explícitos indicados.
- **BR-GEN-03** Valores calculables **nunca** se guardan como campos editables (ver §10). Se calculan en el dominio (TypeScript puro) y/o en vistas SQL.
- **BR-GEN-04** Los IDs son UUID generados en el cliente.
- **BR-GEN-05** El "hoy" y toda comparación por día usan la zona America/Bogota, no la del dispositivo ni la del servidor.
- **BR-GEN-06** Cualquier concepto no obvio en la UI tiene un tooltip en español (ver lista en `DESIGN-BRIEF.md`).

## 2. Usuarios y roles

- **BR-USR-01** El registro es **solo por invitación**. No existe registro público.
- **BR-USR-02** Inicio de sesión con correo y contraseña.
- **BR-USR-03** Roles guardados en base de datos: `colportor` (todos), `admin` (adicional). `leader` queda reservado para la fase 3.
- **BR-USR-04** El modo administrador es un **conmutador de UI** en Ajustes, visible solo si el usuario tiene el rol `admin`. La autorización real se valida en servidor/RLS, nunca por la UI.
- **BR-USR-05** El admin ve la lista de usuarios (nombre, correo, roles) y un texto **"Cómo invitar a alguien"** con los pasos.
- **BR-USR-06** El primer usuario y primer admin es el dueño del producto.

## 3. Títulos (catálogo)

- **BR-TIT-01** Los Títulos los crea/edita/desactiva solo el admin. Todo colportor autenticado puede leer los Títulos activos.
- **BR-TIT-02** Un Título tiene: nombre, imagen, autor, descripción corta, precio público, precio colportor, categoría ∈ {`cultural`, `religious`, `minibook`}.
- **BR-TIT-03** Un Título **no se borra**: se desactiva. Un título desactivado no aparece al agregar a inventario pero conserva sus ejemplares y datos históricos.
- **BR-TIT-04** `precio colportor ≥ 0`. Para `minibook`, el precio colportor puede ser 0 (gratis) o ~1.500 y el **precio público es opcional (nulo)**; para `cultural` y `religious` el precio público es obligatorio y > 0.
- **BR-TIT-05** Ganancia orientativa: cultural ≈ 50 %, religioso ≈ 15 % (informativo; no se calcula ni valida).
- **BR-TIT-06** La carga inicial del catálogo se hace con un script; la pantalla de admin cubre ajustes posteriores.
- **BR-TIT-07** Cambiar precios de un Título **no** altera ejemplares ya recibidos (ver BR-COPY-03).

## 4. Ejemplares

- **BR-COPY-01** Un Ejemplar es una unidad física de un Título. Estados: `in_stock` (En inventario), `sold` (Vendido), `flagged` (Con novedad), `lost` (Perdido). Estado inicial: `in_stock`.
- **BR-COPY-02** Mientras no exista vista de líder, el colportor agrega ejemplares a su propio inventario desde un selector en **lista** o desde sus **Títulos favoritos** (botón de un toque). Cada toque crea **un** ejemplar. Los minibooks se agregan igual, desde el inventario general y desde la sección de minibooks.
- **BR-COPY-03** Al crearse, el ejemplar **copia** (snapshot) el precio público y el precio colportor del Título vigentes. Todos los cálculos históricos usan los snapshots.
- **BR-COPY-04** `received_at` = momento de creación, automático. En la v1 no es editable.
- **BR-COPY-05** `number`: consecutivo por (colportor, título), asignado por el sistema, **nunca reutilizado**, visible en el selector ("Corazón tranquilo #12"). No se muestra con prominencia en listas generales.
- **BR-COPY-06** **Vender un ejemplar a un cliente**: solo ejemplares `in_stock`. El colportor los elige **uno por uno** de su stock físico. Al asignar: `customer_id`, `sold_at = ahora`, `status = sold`, `agreed_price = public_price_snapshot` (por defecto).
- **BR-COPY-07** El **precio acordado** de un ejemplar vendido se edita entrando al ejemplar individual. Puede ser mayor o menor que el precio público. Editarlo recalcula el saldo del cliente.
- **BR-COPY-08** Un ejemplar `in_stock` **no tiene cliente ni precio acordado**.
- **BR-COPY-09** **Devolución**: acción "Devolver a inventario" sobre un ejemplar `sold`. Efecto: `status = in_stock`, `customer_id = null`, `sold_at = null`, `agreed_price = null`; se registra un evento en el historial (`copy_events`). **No** modifica abonos del cliente ni Abibonos. Si los abonos superan lo que ahora debe el cliente, aparece **Saldo a favor** (BR-CUS-06).
- **BR-COPY-10** **Con novedad** (`flagged`): marcador de descuadre físico vs. registrado (p. ej. el líder dice 4 y el colportor tiene 3). Requiere **nota obligatoria**. Un ejemplar `flagged` **no cuenta como inventario físico**; se muestra aparte como "por resolver".
- **BR-COPY-11** Resolución de una novedad (nota opcional):
  - *Apareció* → `in_stock`.
  - *Perdido* → `lost` (terminal, no cuenta como físico, queda para auditoría).
  - *Corregido* → era un error de registro: el ejemplar se borra lógicamente.
- **BR-COPY-12** Vistas de la lista de ejemplares: **Todos**, **En inventario**, **Vendidos**, **Con descuentos y aumentos** (los que tienen precio distinto). Todas con **orden** y **búsqueda**.
- **BR-COPY-13** **Antigüedad** (derivada): días calendario completos desde `received_at` hasta hoy. Etapas por defecto: `fresh` (Reciente) 0–2, `normal` (Normal) 3–6, `aging` (Envejeciendo) 7–12, `old` (Antiguo) ≥ 13. Los límites superiores son **configurables por el admin** (`age_thresholds = [2, 6, 12]`). Solo se muestra en libros en físico y en el selector de ejemplares. Icono sobrio, **no una fruta**.
- **BR-COPY-14** *Hacer inventario*: columnas por título — Recibidos (todos los no corregidos), Vendidos, En físico (`in_stock`), Con novedad, Perdidos, Compra, Venta al público. Se cumple siempre `Recibidos = Vendidos + En físico + Con novedad + Perdidos`.
- **BR-COPY-15** Fase 3 (no v1): el líder transferirá ejemplares y el colportor los **aceptará en el sistema**; solo firma cuando (1) los recibió en físico y (2) los aceptó en el sistema. Habrá un estado previo a `in_stock` (`pending_receipt`).

## 5. Precio acordado, diferencia y precio distinto (derivados)

- **BR-PRC-01** `price_differs = agreed_price ≠ public_price_snapshot` (solo ejemplares vendidos no-minibook).
- **BR-PRC-02** `price_delta = agreed_price − public_price_snapshot`; solo existe si `price_differs`. Positivo = **aumento** (el colportor ganó); negativo = **descuento** (perdió).
- **BR-PRC-03** La suma de todos los `price_delta` de ejemplares vendidos es el totalizador "Diferencia entre aumentos y descuentos".

## 6. Clientes

- **BR-CUS-01** Un cliente tiene: nombre, teléfono, información (texto libre + fotos), dirección (texto), enlace de Maps (opcional), fotos de factura (una o varias). El nombre es obligatorio; lo demás opcional.
- **BR-CUS-02** Un cliente se puede crear **sin libros**. Un cliente sin ejemplares es un **prospecto** (derivado). Al vendérsele un ejemplar deja de serlo automáticamente.
- **BR-CUS-03** Un cliente **es siempre un cliente**: si compra otra vez, se le agregan ejemplares, abonos y facturas al mismo registro. No hay entidad Venta.
- **BR-CUS-04** Valores derivados por cliente:
  - `debt` (Deuda) = Σ `agreed_price` de sus ejemplares vendidos.
  - `paid_total` (Suma de abonos) = Σ `paid_amount` de sus abonos en estado `collected` o `delivered`.
  - `credit_applied` = Σ `amount` de entradas de minibooks con origen `client_credit` asociadas al cliente.
  - `balance` (Saldo pendiente) = `debt − paid_total − credit_applied`.
  - `first_sale_at` / `last_sale_at` (Fecha de la venta) = mín./máx. `sold_at`.
- **BR-CUS-05** Listas de clientes: **Recientes** (por fecha de creación descendente), **Deudores** (`balance > 0`), **Todos**. Por defecto **no incluyen prospectos**; un interruptor "Incluir prospectos" los muestra. El total de clientes (totalizador 8) cuenta solo clientes con ≥ 1 venta, salvo el interruptor.
- **BR-CUS-06** **Saldo a favor** (`credit = max(0, −balance)`): se muestra en la ficha con una nota. **No existen reembolsos**. Puede aplicarse entregando un minibook (BR-MBK-07). No suma a ninguna cuenta del colportor.
- **BR-CUS-07** **Búsqueda**: local, difusa (tolera errores de escritura y acentos) sobre nombre, teléfono, información y dirección. No busca dentro de fotos.
- **BR-CUS-08** Dirección: texto libre + enlace opcional de Google Maps. En la ficha: botón **"Abrir en Maps"** (en el celular abre la app) y un mapa incrustado (iframe) **que solo se carga al tocarlo**. Sin conexión, el error del mapa lo muestra Google (aceptado).
- **BR-CUS-09** Borrado de cliente (lógico, con confirmación): permitido solo si **no tiene ejemplares vendidos** (primero hay que devolverlos). Sus abonos y visitas **no se borran**; siguen visibles con la etiqueta "(cliente eliminado)" porque el dinero cobrado debe poder entregarse al líder.
- **BR-CUS-10** La ficha muestra: libros, abonos con estado, deuda, saldo pendiente (o saldo a favor), fecha(s) de venta, facturas, fotos, información, visitas.

## 7. Abonos (pagos de clientes)

- **BR-PAY-01** Tipos (`kind`): `down_payment` (Cuota inicial), `scheduled` (Abono programado), `extra` (Abono extra). Todos en una sola tabla `payments`.
- **BR-PAY-02** Estados (`status`): `scheduled` (Por cobrar) → `collected` (Cobrado, en mi poder) → `delivered` (Entregado al líder).
- **BR-PAY-03** Nacimiento:
  - Cuota inicial: nace `collected`; `paid_at` = fecha de pago; `due_date = original_due_date = fecha de pago`.
  - Abono programado: nace `scheduled`; requiere `agreed_amount` y `due_date`; `original_due_date = due_date`.
  - Abono extra: nace `collected`; sin fecha acordada.
- **BR-PAY-04** `method` ∈ {`cash`, `transfer`}; obligatorio al cobrar. 
- **BR-PAY-05** **Cobrar** un abono programado: se informa `paid_amount` (por defecto el acordado), `paid_at` (por defecto hoy, editable) y `method`. Pasa a `collected`.
- **BR-PAY-06** **Prórroga** (cliente pide más plazo), solo mientras `scheduled`: se cambia `due_date` (la que sale en el calendario); `original_due_date` **no cambia nunca**; se inserta una fila en `payment_reschedules` (fecha anterior, fecha nueva, cuándo, nota opcional).
- **BR-PAY-07** **Abono parcial**: si `paid_amount < agreed_amount`, el abono queda `collected` con lo realmente pagado; el faltante permanece en el saldo del cliente (derivado) y la app **sugiere** programar un nuevo abono por la diferencia. **Nunca** se crea automáticamente. Si `paid_amount > agreed_amount` se permite.
- **BR-PAY-08** Un abono `scheduled` con `due_date < hoy` está **vencido** (derivado) y se resalta en Hoy y en el calendario.
- **BR-PAY-09** Solo abonos `collected` y no vinculados a otro Abibono pueden añadirse a un Abibono.
- **BR-PAY-10** Un abono vinculado a un Abibono **confirmado** (`delivered`) queda **bloqueado**: no se edita ni se borra. 
- **BR-PAY-11** Un abono `scheduled` o `collected` sin Abibono confirmado se puede editar o borrar (lógico).
- **BR-PAY-12** Un abono pertenece a un cliente (muchos a uno). Sobrevive al borrado lógico del cliente (BR-CUS-09).

## 8. Abibonos (entregas al líder)

- **BR-DEP-01** Un Abibono tiene: título, fecha, efectivo, transferencia, nota, foto(s) de recibo, estado `draft`/`confirmed`, abonos vinculados y asignaciones de minibooks.
- **BR-DEP-02** Título automático por defecto: `Abibono – dd/mm/aaaa` (si ya existe otro ese día, se añade ` (2)`, ` (3)`…). Editable siempre.
- **BR-DEP-03** Fecha automática = hoy (Bogota). Editable.
- **BR-DEP-04** Al vincular abonos y/o asignaciones de minibooks, `cash_amount` y `transfer_amount` se **autocalculan** sumando por método. El usuario puede **editar** efectivo y transferencia (lo realmente entregado). `total = cash + transfer` es **derivado y no editable**.
- **BR-DEP-05** `expected = Σ paid_amount de abonos vinculados + Σ montos asignados de minibooks`. `difference = total − expected` (positivo = sobrante, negativo = faltante). Se muestra **siempre**.
- **BR-DEP-06** Si `difference ≠ 0`, la **nota es obligatoria** para confirmar (p. ej. "me faltaron $5.000", "incluí una donación de $20.000").
- **BR-DEP-07** Un Abibono **sin abonos vinculados** es válido (p. ej. una donación): `expected = 0`, se exige nota.
- **BR-DEP-08** Un abono va **completo** en un solo Abibono (no se reparte). Un abono ya vinculado a un borrador no aparece al armar otro.
- **BR-DEP-09** Nace en `draft`. Pasa a `confirmed` solo si: hay **al menos una foto de recibo** (obligatorio), `total > 0`, y se cumple BR-DEP-06. Al confirmar, los abonos vinculados pasan a `delivered` (BR-PAY-10 empieza a aplicar).
- **BR-DEP-10** Un borrador se puede editar o borrar; al borrarlo, los abonos vuelven a estar disponibles. Un Abibono `confirmed` no se edita ni se borra en la v1.
- **BR-DEP-11** "Total abonado al líder" = Σ `total` de Abibonos `confirmed` (incluye lo asignado de minibooks).

## 9. Minibooks

- **BR-MBK-01** Un minibook es un Título con `category = minibook` y sus unidades son Ejemplares que entran al inventario como cualquier libro (el líder hace firmar su recepción), mostrados **en una sección aparte, al final**.
- **BR-MBK-02** Vender minibooks **no** requiere cliente, factura ni abonos. Se registra una **entrada** (`minibook_sale`): título, cantidad ≥ 1, monto ≥ 0 (puede ser 0 si se regala), método (`cash`/`transfer`), fecha (hoy por defecto), nota opcional. Una entrada de 1 unidad cubre el caso individual. Si se venden títulos distintos, son entradas distintas.
- **BR-MBK-03** Registrar una entrada consume `quantity` ejemplares `in_stock` de ese título (los más antiguos primero) y los marca `sold`. Si no hay suficiente stock, **se bloquea** con un atajo a "Agregar al inventario".
- **BR-MBK-04** La nota es texto libre (p. ej. "me lo dio la chica de la panadería, que pase el 3 de noviembre"). No genera recordatorios en la v1.
- **BR-MBK-05** El dinero de minibooks es una **cuenta aparte**. **No** entra en: libros vendidos, compra, venta al público, diferencia, dinero en la calle, saldo de clientes. Su **única** conexión con otras cuentas es "Total abonado" cuando se asigna a un Abibono.
- **BR-MBK-06** Asignación a Abibono (`leader_deposit_minibook_allocation`): se elige una entrada y **cuánto** de ella se entrega (parcial permitido, ≤ monto − ya asignado). Solo lo asignado suma a lo entregado. El resto sigue siendo del colportor. El dinero usa el método de la entrada para el autocálculo de efectivo/transferencia.
- **BR-MBK-07** **Entrega por saldo a favor**: una entrada puede tener `customer_id` y origen `client_credit`. El monto indicado (≤ saldo a favor disponible) **reduce el saldo a favor**; **no cuenta como ingreso** de minibooks, **no puede asignarse a un Abibono** (ese dinero ya se entregó cuando el cliente pagó el libro), pero **sí** descuenta stock y cuenta en "minibooks entregados".
- **BR-MBK-08** Totalizadores propios de minibooks: cantidad vendida, ingresos (Σ montos con origen `cash`), costo (Σ precio colportor snapshot de los ejemplares vendidos), ganancia neta (ingresos − costo), entregado al líder (Σ asignaciones), stock actual.
- **BR-MBK-09** Una entrada sin asignaciones en Abibono confirmado se puede editar o borrar; borrarla devuelve los ejemplares a `in_stock`.

## 10. Valores derivados (resumen, nunca almacenados)

| Valor | Definición |
|---|---|
| `debt`, `paid_total`, `balance`, `credit` | BR-CUS-04, BR-CUS-06 |
| `price_differs`, `price_delta` | BR-PRC-01/02 |
| `is_prospect` | cliente sin ejemplares vendidos |
| `age_stage` | BR-COPY-13 |
| `overdue` | abono `scheduled` con `due_date < hoy` |
| `total` del Abibono, `expected`, `difference` | BR-DEP-04/05 |
| `first_sale_at`, `last_sale_at` | BR-CUS-04 |
| `bonus_progress` | BR-GOAL-01 |
| `cash_on_hand` / `transfer_on_hand` | Σ `paid_amount` de abonos `collected` (no `delivered`) por método |

## 11. Calendario y recordatorios

- **BR-CAL-01** Tres tipos de evento: **abono programado** (derivado de abonos `scheduled`, por `due_date`; no es una entidad nueva), **visita**, **capacitación**. El calendario permite distinguirlos y filtrar por tipo.
- **BR-CAL-02** **Visita**: fecha (hora opcional), nota, estado `pending`/`done`/`canceled`, cliente **opcional** (agregación, no composición). Sin cliente lleva una etiqueta libre (p. ej. "Panadería de la esquina"). Sobrevive al borrado del cliente. Se puede convertir en cliente con un toque.
- **BR-CAL-03** **Capacitación**: título, empresa o lugar, fecha **y hora**, notas.
- **BR-CAL-04** Recordatorios para visitas y capacitaciones: *a inicio del día*, *un día antes*, *una semana antes* o *personalizado* (minutos antes). Pueden ser varios por evento.
- **BR-CAL-05** Los abonos por cobrar usan siempre el aviso de **inicio del día** (aparecen en "Hoy" el día de su `due_date` y como vencidos después).
- **BR-CAL-06** En la v1 los recordatorios son **dentro de la app** (Hoy, insignia en el calendario). Un recordatorio está activo cuando `ahora ≥ momento de disparo` y el evento está pendiente; se puede descartar. **Push real es fase 2.**
- **BR-CAL-07** **Hoy** (también llamado "Pendientes del día") muestra: cobros de hoy, cobros vencidos, visitas de hoy, capacitaciones de hoy, recordatorios activos y la barra de meta. Al tocar entra al calendario con el filtro adecuado.

## 12. Metas y totalizadores

- **BR-GOAL-01** Meta de bonificación: `bonus_progress = Σ colportor_price_snapshot de ejemplares *culturales* vendidos ÷ bonus_goal`. Valor por defecto de `bonus_goal` = **4.000.000** COP, editable por el admin. Se muestra **solo como barra de progreso, sin cifras**. Ubicación inicial: "Hoy"; sujeta a cambios según el diseño.
- **BR-GOAL-02** Los totalizadores viven en **"Hacer inventario"**, no a la vista general. Cada totalizador es una pieza independiente registrada en un solo lugar (se puede quitar o añadir con una línea).
- **BR-GOAL-03** Totalizadores (no incluyen minibooks):
  1. **Libros vendidos** = # ejemplares `sold` no-minibook.
  2. **Abonado al líder** = BR-DEP-11.
  3. **Dinero en la calle** = Σ `balance` positivos de clientes (global).
  4. **Mi compra** = Σ `colportor_price_snapshot` de ejemplares vendidos.
  5. **Venta al público** = Σ `public_price_snapshot` de ejemplares vendidos.
  6. **Diferencia** = Σ `price_delta` (aumentos − descuentos).
  7. **Ejemplares en inventario (físicos)** = # `in_stock` no-minibook.
  8. **Total clientes** = BR-CUS-05.
- **BR-GOAL-04** Selector **Todos | Culturales | Religiosos** (por defecto Todos = cultural + religioso). Aplica a los totalizadores 1, 4, 5, 6, 7. Los 2, 3 y 8 son globales y no se filtran por categoría.
- **BR-GOAL-05** *Hacer inventario*: pantalla con tabla por título (BR-COPY-14), agrupada en **Culturales, Religiosos, Minibooks**, con subtotales y total. Dos vistas: **Inventario** (solo culturales) e **Inventario TODOS** (culturales + religiosos). Los minibooks siempre aparte. Es una vista en vivo, imprimible/compartible. **No** se guardan cortes históricos en la v1.
- **BR-GOAL-06** Las cifras de dinero no se exhiben fuera de *Hacer inventario*, el detalle del cliente y *Dinero* (es parte de la emoción del cuadre con el líder).

## 13. Inventario: agregar, favoritos y vistas

- **BR-INV-01** *Agregar a inventario*: selector en lista (buscable) de Títulos activos + botones de **Títulos favoritos**. Cada toque agrega **un** ejemplar (con opción de repetir/cantidad rápida en el diseño).
- **BR-INV-02** Favoritos: por usuario, máximo **6** (constante `MAX_FAVORITES`).
- **BR-INV-03** *Libros en físico*: Títulos con la cantidad de ejemplares `in_stock`, con el icono de antigüedad. Minibooks al final/aparte. Los `flagged` se muestran en una sección "Por resolver".

## 14. Fotos

- **BR-PHO-01** Toda foto se **comprime en el cliente** antes de subir: WebP, lado mayor ≤ 1280 px, objetivo ~150 KB; se genera una miniatura de ~15 KB. Las listas usan miniaturas.
- **BR-PHO-02** Buckets privados por usuario con URLs firmadas (imágenes de Títulos: lectura pública). Ruta: `{owner_id}/{tipo}/{uuid}.webp`.
- **BR-PHO-03** El recibo del Abibono es **obligatorio** para confirmar (BR-DEP-09).
- **BR-PHO-04** Se mide el uso de almacenamiento; al 70 % se alerta al admin (migración a Cloudflare R2, ver ADR-0013).
