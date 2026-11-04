# Reglas de negocio

Fuente normativa del comportamiento. Cada regla tiene un ID estable (`BR-*`) para referenciarla en código, pruebas y commits. Si una regla cambia, se actualiza aquí **y** en su ADR, y se añade una línea a `00-contexto/DECISION-LOG.md`.

Notación: "colportor" = usuario con rol colportor. Fechas calendario en **America/Bogota**. Dinero en **COP enteros** (sin decimales, ≥ 0 salvo indicación). **Nombre de la app: "Colportor".**

---

## 1. Generales

- **BR-GEN-01** Todo registro pertenece a un único colportor (`owner_id`). Ningún usuario ve ni modifica datos de otro. **El admin tampoco ve datos de negocio de otros colportores** (solo catálogo, ajustes y lista de usuarios).
- **BR-GEN-02** Todo borrado de entidades de negocio es **lógico** (`deleted_at`). Nada se elimina físicamente salvo los borradores explícitos indicados.
- **BR-GEN-03** Valores calculables **nunca** se guardan como campos editables (ver §11). Se calculan en el dominio (TypeScript puro) y/o en vistas SQL.
- **BR-GEN-04** Los IDs son UUID generados en el cliente.
- **BR-GEN-05** El "hoy" y toda comparación por día usan la zona America/Bogota, no la del dispositivo ni la del servidor.
- **BR-GEN-06** Cualquier concepto no obvio en la UI tiene un tooltip en español, **solo con un ⓘ que se abre al tocar** (nunca texto explicativo permanente ni subtítulos de relleno). Lista en `04-diseno/DESIGN-BRIEF.md` §11.
- **BR-GEN-07** **Formato regional:** fechas `dd/mm/aaaa`; la **semana empieza el domingo**; el formato de hora (**12 h con a. m./p. m. o 24 h**) lo elige cada usuario en **Ajustes** (por defecto 12 h); tema claro/oscuro automático según el dispositivo. Todo en español.
- **BR-GEN-08** **Lectura sin conexión (F1):** la app se abre sin internet y permite **consultar** lo último sincronizado (clientes, teléfonos, direcciones, Hoy, inventario, abonos). **Registrar o modificar algo exige conexión** y, si no la hay, se muestra un mensaje claro ("Sin conexión: puedes consultar, pero no registrar"). Escribir sin conexión es fase 2.
- **BR-GEN-10** **Una sola acción principal global:** **"Nuevo cliente"** (ícono de persona con "+"). **"Vender" ya no existe** como acción, ruta ni etiqueta (ADR-0035). En móvil es el botón flotante; en escritorio es un **ítem del sidebar debajo de Hoy** y, además, un botón en la cabecera de **Clientes** (DT-08 cerrado con el diseño, ronda 19). Cada pantalla tiene como máximo **una acción de contexto destacada** y el mismo botón no aparece repetido; **Hoy tiene un único botón: "Entregar", dentro de la tarjeta "Por entregar"** (BR-CAL-08). Para un cliente que ya existe se usa el enlace de texto "Agregar libro" en su ficha.
- **BR-GEN-11** **Más de 5 opciones se agrupan** (menús, sidebar, "Más", filtros, selectores), con grupos de máximo 4–5. Sidebar de escritorio estilo Notion con secciones plegables **Trabajo** (Clientes, Inventario, Minibooks, Calendario) y **Dinero** (Dinero, Hacer inventario); hoja "Más" en móvil con *Trabajo*, *Dinero* y *Cuenta*. "Agregar al inventario" es la acción principal **dentro de Inventario**.
- **BR-GEN-12** **Principios visuales** (ADR-0032): estilo Notion, fuente del sistema, **lista negra anti-IA**, color solo en acento único, rojo semántico, **microíconos de tipo de evento (cobro / visita / capacitación)** y el **estado del cliente** (Vencido en rojo, Pagando en gris, Saldado en verde, BR-CUS-13); estados de abono y categorías en gris; filas de máximo 2 líneas con una señal de estado; sin subtítulos ni contadores; **escala tipográfica** con texto principal de **17 px** en móvil (16 en escritorio), secundario de 15 (14) y nunca menos de 13 px (`04-diseno/DESIGN-BRIEF.md` §5b).
- **BR-GEN-13** **Design system con tokens (ADR-0034).** Todo valor visual (tamaños de letra, colores, radios, espaciado, sombras) vive en **variables de diseño** definidas en un solo lugar (`src/ui/tokens/tokens.css`). **El tamaño de la letra se cambia con una variable global `--font-scale`** (y por rol: figura, título, principal, secundario, leyenda); el **acento** (casi negro / `#092e53`) también es una variable. **Ningún componente usa tamaños ni colores literales.** Los tamaños iniciales son provisionales hasta probarlos en un dispositivo real. **Modo oscuro:** el diseño trae tema claro y oscuro; la v1 sigue la **preferencia del sistema**, sin interruptor manual, y se implementa después del claro, con prueba de contraste por token.
- **BR-GEN-09** **Nombres en la UI:** *Abonos* (de clientes), *Abibonos* (con tooltip "Entrega al líder"), *Minibooks*, *Dinero*, *Hacer inventario*, *Nuevo cliente*, *Hoy* (subtítulo "Pendientes del día"). En el admin la sección de títulos se llama **"Catálogo"**; el colportor ve **"Libros"** en listas y selectores; **"Ejemplar"** designa cada unidad física; "Título" existe sobre todo en el código y en los tooltips. Revisable (ver `06-planificacion/OPEN-QUESTIONS.md` RV-01).

## 2. Usuarios y roles

- **BR-USR-01** El registro es **solo por invitación**. No existe registro público.
- **BR-USR-02** Inicio de sesión con correo y contraseña.
- **BR-USR-03** Roles guardados en base de datos: `colportor` (todos), `admin` (adicional). `leader` queda reservado para la fase 3. Al aceptar una invitación se crean automáticamente el perfil y el rol `colportor`.
- **BR-USR-04** El modo administrador es un **conmutador de UI** en Ajustes, visible solo si el usuario tiene el rol `admin`. La autorización real se valida en servidor/RLS, nunca por la UI.
- **BR-USR-05** **Invitar desde el panel de admin:** el botón "Invitar" pide un correo y llama a un **endpoint de servidor** (solo admin, usa la `service_role` en servidor) que crea la invitación y devuelve un **enlace para copiar y enviar por WhatsApp**. El envío automático por correo queda para cuando exista dominio y SMTP propio. El enlace caduca; el admin puede **regenerarlo**. El panel incluye además una breve explicación de cómo funciona.
- **BR-USR-06** El primer usuario y primer admin es el dueño del producto.
- **BR-USR-07** El admin puede **desactivar** a un usuario (no puede entrar, sus datos se conservan) y reactivarlo. La lista de usuarios muestra nombre, correo, rol y estado.
- **BR-USR-08** Cada usuario guarda en su perfil: nombre, formato de hora (12 h/24 h) y sus Títulos favoritos.

## 3. Títulos (catálogo)

- **BR-TIT-01** Los Títulos los crea/edita/desactiva solo el admin. Todo colportor autenticado puede leer los Títulos activos.
- **BR-TIT-02** Un Título tiene: nombre, imagen, autor, descripción corta, precio público, precio colportor, categoría ∈ {`cultural`, `religious`, `minibook`}.
- **BR-TIT-03** Un Título **no se borra**: se desactiva. Un título desactivado no aparece al agregar a inventario pero conserva sus ejemplares y datos históricos.
- **BR-TIT-04** `precio colportor ≥ 0`. Para `minibook`, el precio colportor puede ser 0 (gratis) o ~1.500 y el **precio público es opcional (nulo)**; para `cultural` y `religious` el precio público es obligatorio y > 0.
- **BR-TIT-05** Ganancia orientativa: cultural ≈ 50 %, religioso ≈ 15 % (informativo; no se calcula ni valida).
- **BR-TIT-06** La carga inicial del catálogo se hace con un script; la pantalla de admin cubre ajustes posteriores.
- **BR-TIT-07** Cambiar precios de un Título **no** altera ejemplares ya recibidos (ver BR-COPY-03).

## 4. Ejemplares

- **BR-COPY-01** Un Ejemplar es una unidad física de un Título. Estados: `in_stock` (En físico), `sold` (Vendido), `flagged` (Con novedad), `lost` (Perdido), `returned_to_leader` (Devuelto al líder). Estado inicial: `in_stock`.
- **BR-COPY-02** **Agregar a inventario** (mientras no exista vista de líder): selector en **lista** buscable de Títulos activos, o **Títulos favoritos** (botón de un toque). Funciona **igual para libros y minibooks**:
  - Cada fila tiene un **"+"** al final; un toque agrega **un** ejemplar.
  - Tras agregar, el "+" se convierte en una **pastilla con el número** agregado en esa sesión (p. ej. `2`); tocarla la vuelve un **campo numérico**: se escribe la cantidad total y el sistema ajusta (crea o retira los ejemplares **recién agregados** que sobren).
  - Se muestra un aviso con **Deshacer** unos segundos.
  - Favoritos: mismo comportamiento.
  - Por defecto se agrega con fecha de hoy; un **chip de fecha** discreto ("Hoy ▾", estilo Notion) permite indicar otro día **pasado** antes de agregar.
- **BR-COPY-03** Al crearse, el ejemplar **copia** (snapshot) el precio público y el precio colportor del Título vigentes. Todos los cálculos históricos usan los snapshots.
- **BR-COPY-04** `received_at` = fecha de recepción. Por defecto **hoy**; se puede indicar **otra fecha pasada** al agregar (BR-COPY-02) y **editarla después** como propiedad en línea en el ejemplar (clic → selector de fecha), de forma **discreta**: no es un botón destacado, porque la idea es que normalmente no se cambie. Restricciones: no puede ser futura ni posterior a `sold_at`. Todo cambio queda en el historial del ejemplar. (Motivo: un día sin internet o sin celular impide registrar a tiempo.) Edición masiva → backlog.
- **BR-COPY-05** `number`: consecutivo por (colportor, título), asignado por el sistema, **nunca reutilizado**, visible en el selector ("Corazón tranquilo #12") y en el detalle; sin prominencia en listas generales. En fase 2, sin conexión, se muestra un **número provisional** (con marca) que puede cambiar al sincronizar.
- **BR-COPY-06** **Agregar (vender) un ejemplar a un cliente**, desde la sección *Libros* de su ficha (BR-CUS-14): solo ejemplares `in_stock`. El colportor los elige **uno por uno** de su stock físico: en el buscador "Agregar libro" de la ficha, tocar un título asigna **el ejemplar más antiguo** (se muestra su antigüedad) y, si quiere otro, expande el título y elige por número; los títulos agotados salen **al final, atenuados y sin poder tocarse**; desde la ficha del cliente puede **agregar y quitar** ejemplares, y eso cambia el estado del ejemplar. Al asignar: `customer_id`, `sold_at = ahora`, `status = sold`, `agreed_price = public_price_snapshot` (por defecto).
- **BR-COPY-07** El **precio acordado** de un ejemplar vendido se edita entrando al ejemplar individual. Puede ser mayor o menor que el precio público. Editarlo recalcula el saldo del cliente y puede disparar la **alerta de abonos que no cuadran** (BR-PAY-13).
- **BR-COPY-08** Un ejemplar `in_stock` **no tiene cliente ni precio acordado**.
- **BR-COPY-09** **Devolución / quitar un libro de un cliente** (acción única, ver `01-negocio/FLOWS-ALTERNATIVOS.md` AF-01..AF-12):
  1. Solo sobre ejemplares `sold`.
  2. La app pregunta el **motivo**: *El cliente lo devolvió* o *Me equivoqué de cliente / de registro*. Con el segundo, no cuenta como devolución en estadísticas.
  3. Efecto: `status = in_stock`, `customer_id = null`, `sold_at = null`, `agreed_price = null`; **`received_at` se conserva** (es el mismo libro físico); se registra un evento con el motivo.
  4. Los abonos `collected`/`delivered` y los Abibonos **no se tocan**.
  5. Los abonos `scheduled` se revisan con la **alerta de abonos que no cuadran** (BR-PAY-13), con sugerencia de recorte desde el más lejano.
  6. Si lo pagado excede lo que ahora debe, aparece **Saldo a favor** (BR-CUS-06).
  7. Un cliente que se queda sin ejemplares vuelve a ser prospecto (derivado), conservando sus abonos y su historial.
- **BR-COPY-10** **Con novedad** (`flagged`): marcador de descuadre físico vs. registrado (p. ej. el líder dice 4 y el colportor tiene 3). Requiere **nota obligatoria**. Solo se marca desde `in_stock`. Un ejemplar `flagged` **no cuenta como inventario físico**; se muestra aparte como "por resolver".
- **BR-COPY-11** Resolución de una novedad (nota opcional). La app ofrece **solo estas salidas**:
  - *Apareció* → `in_stock`.
  - *Perdido (lo asumo yo)* → `lost` (terminal; cuenta en "A responder al líder", BR-GOAL-07).
  - *Eliminar* (nota opcional) → el ejemplar se borra lógicamente y no cuenta en nada. Sirve para errores de registro y para el caso en que el líder acepte la pérdida.
  - **Regla de contenido:** **ningún texto, tooltip ni etiqueta** de la app menciona que el líder pueda asumir una pérdida. Esa es una decisión de bondad del líder que el colportor no debe ver como opción.
- **BR-COPY-12** Vistas de la lista de ejemplares: **Todos**, **En físico**, **Vendidos**, **Con descuentos y aumentos** (los que tienen precio distinto). Cada fila muestra título, número, estado, cliente, fechas (recibido y vendido), **precio acordado, diferencia** y la marca de precio distinto, **sin sumas de dinero al pie** (los totales viven en Hacer inventario). Todas con **orden** y **búsqueda**, usando la misma barra de vista que el resto de módulos.
- **BR-COPY-13** **Antigüedad** (derivada): días calendario completos desde `received_at` hasta hoy. Etapas por defecto: `fresh` (Reciente) 0–2, `normal` (Normal) 3–6, `aging` (Envejeciendo) 7–12, `old` (Antiguo) ≥ 13. Los límites superiores son **configurables por el admin** (`age_thresholds = [2, 6, 12]`). Solo se muestra en libros en físico y en el selector de ejemplares. Icono sobrio, **no una fruta**.
- **BR-COPY-14** *Hacer inventario*, columnas por título: Recibidos, Vendidos, En físico (`in_stock`), Con novedad, Perdidos, Devueltos al líder, Compra, Venta al público. Identidad siempre cierta: `Recibidos = Vendidos + En físico + Con novedad + Perdidos + Devueltos al líder` (los ejemplares eliminados no cuentan).
- **BR-COPY-15** Fase 3 (no v1): el líder transferirá ejemplares y el colportor los **aceptará en el sistema**; solo firma cuando (1) los recibió en físico y (2) los aceptó en el sistema. Habrá un estado previo a `in_stock` (`pending_receipt`).
- **BR-COPY-16** **Devolver al líder** (`returned_to_leader`): acción **en lote** en Inventario ("Devolver al líder": se eligen ejemplares `in_stock` y una nota). Aplica a **cualquier ejemplar en inventario, sin importar su antigüedad** (fin de campaña o libros viejos que el líder acepta). No cuenta en "Mi compra" ni en "A responder al líder"; tiene su columna en *Hacer inventario*. Se elige **por cantidad por título** (pastilla numérica, se devuelven los más antiguos) como forma principal, o con **"Elegir unidades"** (casillas por ejemplar) como opción secundaria; la nota se pide al final, antes de confirmar. Se puede **deshacer** (vuelve a `in_stock`) con una nota; queda en el historial.

## 5. Precio acordado, diferencia y precio distinto (derivados)

- **BR-PRC-01** `price_differs = agreed_price ≠ public_price_snapshot` (solo ejemplares vendidos no-minibook).
- **BR-PRC-02** `price_delta = agreed_price − public_price_snapshot`; solo existe si `price_differs`. Positivo = **aumento** (el colportor ganó); negativo = **descuento** (perdió).
- **BR-PRC-03** La suma de todos los `price_delta` de ejemplares vendidos es el totalizador "Diferencia entre aumentos y descuentos".

## 6. Clientes

- **BR-CUS-01** Un cliente tiene: nombre, teléfono, información (texto libre + fotos), dirección (texto), **ubicación** (coordenadas, BR-CUS-08), enlace de Maps (opcional), fotos de factura (una o varias). El nombre es obligatorio; lo demás opcional.
- **BR-CUS-02** Un cliente se puede crear **sin libros**. Un cliente sin ejemplares es un **prospecto** (derivado). Al vendérsele un ejemplar deja de serlo automáticamente.
- **BR-CUS-03** Un cliente **es siempre un cliente**: si compra otra vez, se le agregan ejemplares, abonos y facturas al mismo registro. No hay entidad Venta.
- **BR-CUS-04** Valores derivados por cliente:
  - `debt` (Deuda) = Σ `agreed_price` de sus ejemplares `sold`.
  - `paid_total` (Suma de abonos) = Σ `paid_amount` de sus abonos en estado `collected` o `delivered`.
  - `credit_applied` = Σ `amount` de entradas de minibooks con origen `client_credit` asociadas al cliente.
  - `balance` (Saldo pendiente) = `debt − paid_total + credit_applied`. El signo de `credit_applied` es `+` porque entregar un minibook con saldo a favor **consume** ese saldo (BR-MBK-07, AF-10): con $30.000 a favor y un minibook de $1.500 aplicado quedan $28.500 a favor (ADR-0033).
  - `scheduled_total` = Σ `agreed_amount` de abonos `scheduled`.
  - `unscheduled` = `max(0, balance) − scheduled_total` cuando es positivo (saldo aún sin programar; informativo).
  - `first_sale_at` / `last_sale_at` (Fecha de la venta) = mín./máx. `sold_at`.
- **BR-CUS-05** Listas de clientes con **pestañas de vista**: **Todos**, **Deudores** (`overdue` + `current`, BR-CUS-13), **Saldados** (`settled`) y **Archivados** (BR-CUS-09). Se solapan con el filtro de estado, pero el dueño las conserva por ser lo más sencillo y visual (RV-07). Hay un **selector de orden** con el mismo estilo de barra de vista de todos los módulos: **Más recientes** (por **fecha de creación**; por defecto), **Última modificación** (BR-CUS-16), **Nombre (A–Z)**, **Mayor deuda** y **Próximo abono**. Cada criterio tiene un **sentido por defecto** (Más recientes y Última modificación descendente; Nombre ascendente; Mayor deuda descendente; Próximo abono ascendente) y el usuario puede **invertirlo** con un control de ícono ("Invertir orden"); el botón de orden muestra criterio y sentido. Por defecto **no incluyen prospectos**; un interruptor "Incluir prospectos" los muestra. El total de clientes (totalizador 8) cuenta solo clientes con ≥ 1 venta, salvo el interruptor. Cada fila muestra el **saldo pendiente de ese cliente**. Mostrar un **total** de la deuda en la lista es una opción a decidir en el diseño (DT-01).
- **BR-CUS-13** **Estado del cliente** (derivado, `payment_standing`), con tres valores: **`overdue` (Vencido, rojo)** si tiene algún abono `scheduled` vencido; **`current` (Pagando, gris)** si `balance > 0` y **no** tiene abonos vencidos (debe algo, pero va cumpliendo); **`settled` (Saldado, verde)** si tiene ejemplares vendidos y `balance ≤ 0` (ya pagó todo, no debe nada; incluye el caso de saldo a favor). Los **prospectos no tienen estado**. Saldado es el **único** estado en verde (BR-GEN-12). En **escritorio** se muestra como **píldora suave con ícono** en la columna Estado de la tabla. En **móvil no hay píldora**: a la derecha de la fila va, **sobre el monto**, la etiqueta gris **"Debe"** precedida del **ícono del estado** (Pagando gris, Vencido rojo, Saldado verde) y debajo el **saldo pendiente**; los prospectos muestran "—" sin etiqueta. La etiqueta "Debe" se conserva a propósito aunque repita: sin ella el número no decía a qué se refería (decisión del dueño, ronda 19). **Fila de la lista de clientes:** avatar (emoji o ícono de persona, BR-CUS-15) · **nombre** · debajo, en gris, el **libro vendido** (título del más reciente; si hay varios, `+N`) · a la derecha lo descrito arriba; los **prospectos** muestran "Prospecto" en lugar del libro. En escritorio la columna "Libro(s)" sigue la misma regla. Las pestañas de vista (Todos / Deudores / Saldados / Archivados) muestran su **conteo en gris tenue** (solo conteos, nunca dinero). El filtro "Estado" ofrece los tres valores. *(El diseño no pinta el monto en rojo cuando está vencido: lo marca el ícono; por confirmar con el dueño.)*
- **BR-CUS-14** **Ficha viva (cliente nuevo, ADR-0035, ADR-0038).** El botón **"Nuevo cliente"** abre una **ficha en blanco que se guarda sola**. El **nombre** es lo único obligatorio: sin nombre, al salir no queda nada; con nombre, el cliente **ya existe** (sin libros es **prospecto**, BR-CUS-02) y aparece en la lista con el indicador discreto **"Borrador guardado"**. Secciones en línea: **Libros** (ejemplares uno por uno, BR-COPY-06; el precio acordado se edita en el ejemplar) → **Abonos** (cuota inicial, plan automático BR-PAY-15, programar, extra) → **Factura** (N.º de factura opcional, fecha, foto, una o varias; BR-CUS-17), más visitas, información, dirección y fotos. El orden habitual es ese, pero **no es obligatorio** y la ficha puede quedar incompleta. Los **avisos son informativos, en línea y no bloquean** (BR-PAY-13/14).
  - **Botones de la creación:** en la cabecera, **"Descartar"** y **"Guardar cliente"** (el único botón principal; deshabilitado mientras el nombre esté vacío). Una pantalla **"Resumen"** muestra de un vistazo qué información se metió y cuál falta, con **"Guardar cliente"** y **"Seguir editando"**. Todo se guarda solo: **"Guardar cliente" confirma que terminaste y cierra la ficha**; si cierras la app sin tocar ningún botón, el cliente queda guardado como está.
  - **"Descartar"** elimina del todo al cliente recién creado: lo borra, **devuelve sus libros al inventario** (BR-COPY-06) y quita sus abonos y fotos. Siempre pide una **confirmación** que resume lo que se perderá ("Se quitarán 2 libros y 1 abono"; sin nada agregado, "Se quitará este cliente"). Solo existe **mientras no se ha tocado "Guardar cliente"**; después, quitar a un cliente es **Archivar** (BR-CUS-09), que **no aparece** en la pantalla de creación.
  - **Sin conexión** (F1), "Nuevo cliente" sigue visible pero **deshabilitado** ("Necesita conexión"); la lista se puede consultar (BR-GEN-08).
  - Un cliente que ya existe se abre desde la lista de Clientes y usa las mismas secciones ("Agregar libro"). En **escritorio** la ficha se abre **Centrada, Lateral o Página completa** (preferencia del usuario, patrón de Notion); en móvil siempre es pantalla completa.
- **BR-CUS-15** **Avatar del cliente (ADR-0037).** Cada cliente puede tener un **emoji** como avatar (`avatar_emoji`, exactamente **un** emoji). Sin emoji se muestra el **avatar por defecto**: un **ícono de persona** sobre un **fondo neutro** (valor derivado, no guardado; cierra OQ-38). El emoji se elige con un selector que **carga solo al abrirse**, se puede **quitar**, se dibuja con los **emojis del sistema** (puede verse distinto entre dispositivos) y **no** entra en la búsqueda. No hay íconos propios para clientes en la v1; las fotos de perfil están en el backlog. Se muestra en la lista (móvil), la tabla (escritorio) y la cabecera de la ficha.
- **BR-CUS-06** **Saldo a favor** (`credit = max(0, −balance)`): se muestra en la ficha con una nota. **No existen reembolsos**. Puede aplicarse entregando un minibook (BR-MBK-07). No suma a ninguna cuenta del colportor.
- **BR-CUS-07** **Búsqueda**: local, difusa (tolera errores de escritura y acentos) sobre **nombre, teléfono, información, dirección y libros** (los títulos de los ejemplares que el cliente **tiene hoy**, es decir, vendidos; un libro devuelto no cuenta; no busca por número de ejemplar ni por categoría). No busca dentro de fotos ni por emoji. Los resultados mezclan activos y prospectos; **"Buscar en Archivados"** amplía la búsqueda a los archivados; sin resultados se ofrece **"Crear «<texto>»"**, que abre "Nuevo cliente" con ese nombre ya escrito (BR-CUS-14). Un **filtro por libro** queda en el backlog.
- **BR-CUS-08** **Dirección y ubicación (ADR-0036).** El cliente tiene una **dirección en texto, siempre manual** (no se rellena sola) y una **ubicación** guardada como **coordenadas** (`latitude`, `longitude`) con la **precisión** del GPS al capturarla; el enlace de Maps pegado a mano sigue siendo opcional.
  - En la sección de dirección de la ficha (también en la ficha nueva): un **único botón "Elegir en mapa"** abre el **selector de ubicación** **centrado en la ubicación actual**; el permiso del navegador se pide **solo al tocarlo** (nunca al abrir la app ni en segundo plano) y el usuario puede **mover el mapa** para ajustar el punto. Con una ubicación ya guardada, **"Cambiar"** abre el selector centrado en ese punto y **"Quitar"** la elimina. Si el permiso se niega o no hay señal de GPS, el selector se abre igual con un aviso discreto ("Sin permiso de ubicación. Ubica el pin a mano." / "No hay señal de GPS." con "Reintentar") y, como vista inicial, el **último punto elegido** o, si no hay, una vista de **Colombia**.
  - **Selector de ubicación (patrón Didi/Uber):** mapa interactivo a pantalla completa con el **pin fijo al centro** y el mapa moviéndose por debajo; **círculo de precisión** del GPS; botón para **recentrar** en la ubicación actual; **"Confirmar"** guarda las coordenadas del centro. Si la precisión es **peor de ~50 m**, aparece un aviso discreto **"Ubicación aproximada"** y se puede repetir la captura o mover el pin.
  - En la ficha, la ubicación se ve con **el mismo mapa interactivo** (con pin; **carga al tocar**, no al abrir la ficha) y un botón **"Abrir en Maps"** que **lleva las coordenadas a la app de mapas del celular** (`https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`) para verlo mejor. Prioridad: coordenadas → enlace pegado a mano → búsqueda por la dirección en texto → si no hay nada, el botón no aparece.
  - Las coordenadas se validan (numéricas; latitud −90..90, longitud −180..180; ambas o ninguna). **Sin conexión** el GPS funciona pero el mapa no carga (en F1 guardar exige conexión). **Privacidad:** dato personal (Ley 1581): se captura solo al tocar, sin seguimiento. El proveedor de mapas se decide al implementar (SG-09; no el servidor público de OpenStreetMap).
- **BR-CUS-09** **Archivar** (reemplaza a "eliminar"): oculta al cliente de las listas; se ve y se restaura desde **"Archivados"**. Solo se permite si **no tiene ejemplares vendidos** (primero se quitan/devuelven). Sus abonos `collected` siguen disponibles en **Dinero** con la etiqueta "(cliente archivado)" para poder entregarlos; sus visitas permanecen. Los abonos `scheduled` se cancelan al archivar (BR-PAY-13).
- **BR-CUS-10** La ficha muestra: libros, abonos con estado (incluye una sección plegable de **Cancelados**), deuda, saldo pendiente (o saldo a favor), saldo sin programar, una **barra de progreso "Abonado el N % de la deuda"** (derivada: `paid_total / debt`; con deuda 0 muestra 0 %; nunca se guarda), fecha(s) de venta, facturas, fotos, información, visitas y "Cliente desde".
- **BR-CUS-11** **Duplicados:** al crear un cliente, si existe otro con el **mismo teléfono** o un **nombre casi idéntico**, aparece un aviso **no bloqueante** ("¿Es la misma persona?") con acceso al cliente existente.
- **BR-CUS-12** El teléfono de la ficha ofrece botones de **llamar** y **WhatsApp** (un toque).
- **BR-CUS-16** **Última modificación** (`customer.updated_at`): marca técnica, no editable. Se actualiza con **cualquier cambio hecho en la ficha del cliente**: sus datos, libros agregados o quitados, abonos creados, cobrados o editados, visitas y fotos. **No** la mueven los cambios automáticos (por ejemplo, que un abono pase a vencido). Es un criterio de orden de la lista (BR-CUS-05).
- **BR-CUS-17** **Factura (ADR-0038).** Una factura del cliente lleva **foto(s)**, un **N.º de factura** de texto, **opcional**, y una **fecha de factura** opcional que, por defecto, se llena sola con **el día en que se agrega la foto** (America/Bogota) y se puede editar. Ninguno de los dos campos afecta saldos ni abonos.

## 7. Abonos (pagos de clientes)

- **BR-PAY-01** Tipos (`kind`): `down_payment` (Cuota inicial), `scheduled` (Abono programado), `extra` (Abono extra: pago **fuera del plan**, sin fecha acordada, que nace ya cobrado). Todos en una sola tabla `payment`.
- **BR-PAY-02** Estados (`status`): `scheduled` (Por cobrar) → `collected` (Cobrado: ya lo recibiste, falta entregarlo al líder) → `delivered` (Entregado al líder); y `canceled` (Cancelado), solo para abonos que nunca se cobraron.
- **BR-PAY-03** Nacimiento:
  - Cuota inicial: nace `collected`; `paid_at` = fecha de pago; `due_date = original_due_date = fecha de pago`.
  - Abono programado: nace `scheduled`; requiere `agreed_amount` y `due_date`; `original_due_date = due_date`.
  - Abono extra: nace `collected`; sin fecha acordada.
- **BR-PAY-04** `method` ∈ {`cash`, `transfer`}; obligatorio al cobrar.
- **BR-PAY-05** **Cobrar** un abono programado: se informa `paid_amount` (por defecto el acordado), `paid_at` (por defecto hoy, editable, no futura) y `method`. Pasa a `collected`.
- **BR-PAY-06** **Prórroga** (cliente pide más plazo), solo mientras `scheduled`: se cambia `due_date` (la que sale en el calendario); `original_due_date` **no cambia nunca**; se inserta una fila en `payment_reschedule` (fecha anterior, fecha nueva, cuándo, nota opcional). La **nueva fecha debe ser posterior** a la actual (una prórroga solo da más plazo; una fecha mal escrita se corrige editando el abono) y, si cae a **más de 2 meses desde hoy** (America/Bogota), la app pide **confirmar la fecha** antes de guardar (ADR-0033).
- **BR-PAY-07** **Abono parcial**: si `paid_amount < agreed_amount`, el abono queda `collected` con lo realmente pagado; el faltante permanece en el saldo del cliente (derivado) y la app **sugiere** programar un nuevo abono por la diferencia. **Nunca** se crea automáticamente. Si `paid_amount > agreed_amount` se permite y puede disparar BR-PAY-13.
- **BR-PAY-08** Un abono `scheduled` con `due_date < hoy` está **vencido** (derivado). En Hoy aparece solo como **aviso único** (BR-CAL-09); el detalle se ve en **Dinero ▸ Por cobrar ▸ Vencidos** y en el calendario, hasta que se cobre, se reprograme o se cancele.
- **BR-PAY-09** Solo abonos `collected` y no vinculados a otro Abibono pueden añadirse a un Abibono.
- **BR-PAY-10** Un abono vinculado a un Abibono **confirmado** (`delivered`) queda **bloqueado**: no se edita ni se borra, salvo que el Abibono se **reabra** (BR-DEP-12).
- **BR-PAY-11** Un abono `scheduled` o `collected` sin Abibono confirmado se puede editar o borrar (lógico). Esto cubre el abono registrado por error al cliente equivocado.
- **BR-PAY-12** Un abono pertenece a un cliente (muchos a uno). Sobrevive al archivado del cliente (BR-CUS-09).
- **BR-PAY-13** **Alerta de abonos programados que no cuadran.** Definiciones: `remaining = max(0, balance)`; `excess = scheduled_total − remaining`. Si `excess > 0`, los abonos programados suman **más** de lo que realmente falta pagar. Se evalúa después de:
  1. registrar un abono `collected` (extra, o un cobro mayor al acordado);
  2. quitar/devolver un ejemplar del cliente;
  3. bajar el precio acordado de un ejemplar;
  4. editar o borrar un abono cobrado;
  5. archivar al cliente (`remaining` se considera 0);
  6. agregar o editar abonos programados o libros dentro de la ficha (si lo programado supera lo que falta).
  
  **Cómo se muestra:** en la ficha aparece como una **franja informativa en línea, sin bloqueo** ("Lo programado supera el saldo en $X" + botón **Revisar**); el **modal** se abre al tocar **Revisar** o **directamente** ante una **devolución/quitar libro**, un **abono extra** o una **baja de precio**. El modal muestra: saldo restante, total programado, sobrante y la **lista de abonos programados con casillas**. Opciones:
  - **Recortar automáticamente:** consume el sobrante cancelando abonos completos y, si sobra poco, **reduciendo el `agreed_amount`** del último afectado. Orden: tras un **abono extra o sobrepago**, desde el **más próximo** (el cliente se adelantó); tras una **devolución, baja de precio o archivado**, desde el **más lejano**. Para los otros disparadores: **editar o borrar un abono cobrado** → desde el más próximo; **agregar/editar abonos programados o libros en la ficha** → desde el más lejano (ADR-0033). Siempre es una **sugerencia**: el colportor elige en el modal si recorta automáticamente (en el orden sugerido u otro) o lo hace él.
  - **Cancelar los que marque** manualmente.
  - **Dejar como está.** La ficha del cliente conserva un aviso persistente ("Los abonos programados superan el saldo en $X") hasta resolverlo.
  
  Un abono cancelado pasa a `status = canceled` con `canceled_at` y `cancel_reason` ∈ {`book_returned`, `overpaid`, `manual`, `customer_archived`}; **se conserva** (sección Cancelados de la ficha) pero **no cuenta** en el calendario, "Hoy", ni en ningún total. Un recorte por reducción guarda el valor anterior en `payment_event`. El motivo depende del disparador: abono extra, sobrepago o edición de un cobro → `overpaid`; devolución → `book_returned`; archivar → `customer_archived`; baja de precio, borrar un cobro y edición de la ficha → `manual` (ADR-0033). El caso inverso (`excess < 0`, saldo sin programar) **no** dispara alerta: se muestra solo como "sin programar".

- **BR-PAY-14** **Aviso "Aún no tiene libro":** si un cliente tiene abonos (programados o cobrados) y **ningún ejemplar vendido**, la ficha muestra la franja informativa en línea **"Aún no tiene libro"**. Es solo informativo: **no bloquea** y el usuario puede seguir haciendo lo que quiera (BR-CUS-14).
- **BR-PAY-15** **Plan de abonos automático (ADR-0039).** Al programar el saldo en la ficha, el usuario elige **frecuencia** (semanal, quincenal o mensual), **valor de cada abono** (múltiplo de $1.000) y **fecha del primer abono**. El sistema crea abonos `scheduled` normales (el plan **no** es una entidad): número de abonos = `saldo ÷ valor` **hacia abajo** (mínimo 1); lo que sobre lo suma el **abono con la fecha más próxima**, de modo que los abonos suman **exactamente** el saldo. Ejemplo: saldo $140.000 con abonos de $30.000 → $50.000, $30.000, $30.000, $30.000. La fila del abono mayor **no lleva marca** que explique la diferencia. Las fechas se pueden cambiar una a una con la opción "Correr también los siguientes" (es la prórroga de BR-PAY-06: solo se mueven las fechas). **La regla de múltiplos de $1.000 aplica solo al cálculo automático:** al editar un abono a mano se acepta cualquier valor entero, y los pagos reales (cuota inicial, cobros, extras) también.

## 8. Abibonos (entregas al líder)

- **BR-DEP-01** Un Abibono tiene: título, fecha, efectivo, transferencia, nota, foto(s) de recibo, estado `draft`/`confirmed`, abonos vinculados y asignaciones de minibooks. En la UI, el tooltip de "Abibono" dice **"Entrega al líder"**.
- **BR-DEP-02** Título automático por defecto: `Abibono – dd/mm/aaaa` (si ya existe otro ese día, se añade ` (2)`, ` (3)`…). Editable siempre.
- **BR-DEP-03** Fecha automática = hoy (Bogota). Editable.
- **BR-DEP-04** Al vincular abonos y/o asignaciones de minibooks, `cash_amount` y `transfer_amount` se **autocalculan** sumando por método. El usuario puede **editar** efectivo y transferencia (lo realmente entregado). `total = cash + transfer` es **derivado y no editable**.
- **BR-DEP-05** `expected = Σ paid_amount de abonos vinculados + Σ montos asignados de minibooks`. `difference = total − expected` (positivo = sobrante, negativo = faltante). Se muestra **siempre**.
- **BR-DEP-06** Si `difference ≠ 0`, la **nota es obligatoria** para confirmar (p. ej. "me faltaron $5.000", "incluí una donación de $20.000").
- **BR-DEP-07** Un Abibono **sin abonos vinculados** es válido (p. ej. una donación): `expected = 0`, se exige nota.
- **BR-DEP-08** Un abono va **completo** en un solo Abibono (no se reparte). Un abono ya vinculado a un borrador no aparece al armar otro. (Excepción: el dinero de minibooks admite monto parcial por entrada, BR-MBK-06.)
- **BR-DEP-09** Nace en `draft`. Pasa a `confirmed` solo si: hay **al menos una foto de recibo** (obligatorio), `total > 0`, y se cumple BR-DEP-06. Al confirmar, los abonos vinculados pasan a `delivered` (BR-PAY-10 empieza a aplicar). **Fotos de recibo:** la interfaz pide **una** por defecto y ofrece "Añadir otra" para más.
- **BR-DEP-10** Un borrador se puede editar o borrar; al borrarlo, los abonos vuelven a estar disponibles.
- **BR-DEP-11** "Total abonado al líder" = Σ `total` de Abibonos `confirmed` (incluye lo asignado de minibooks).
- **BR-DEP-13** **Entregar desde Hoy:** el botón "Entregar" de la tarjeta "Por entregar" abre el asistente de **Nuevo Abibono ya precargado**: todos los abonos `collected` que no estén vinculados a otro Abibono quedan **preseleccionados**; efectivo y transferencia se **autocalculan** (BR-DEP-04); el usuario puede desmarcar abonos, ajustar montos, añadir dinero de minibooks y subir el recibo. **No se crea ningún borrador hasta que el usuario guarda**. El resto de reglas (esperado, diferencia, nota, recibo obligatorio, confirmar) no cambia.
- **BR-DEP-12** **Reabrir** un Abibono `confirmed`: siempre se puede editar la **nota** y **añadir fotos**; para cambiar montos o abonos vinculados hay un botón **discreto "Reabrir"** que pide un **motivo** (obligatorio), queda en el historial (`leader_deposit_event`), devuelve el Abibono a `draft` y los abonos vinculados a `collected`. Para volver a confirmar rigen otra vez BR-DEP-09/06.

## 9. Minibooks

- **BR-MBK-01** Un minibook es un Título con `category = minibook` y sus unidades son Ejemplares que entran al inventario como cualquier libro (el líder hace firmar su recepción), mostrados **en una sección aparte, al final**. Se agregan con el mismo patrón "+ / pastilla numérica" que los libros (BR-COPY-02), desde el inventario general y desde su sección.
- **BR-MBK-02** Vender minibooks **no** requiere cliente, factura ni abonos. Se registra una **entrada** (`minibook_sale`): título, cantidad ≥ 1, monto ≥ 0 (puede ser 0 si se regala), método (`cash`/`transfer`), fecha (hoy por defecto), nota opcional. Una entrada de 1 unidad cubre el caso individual. Si se venden títulos distintos, son entradas distintas.
- **BR-MBK-03** Registrar una entrada consume `quantity` ejemplares `in_stock` de ese título (los más antiguos primero) y los marca `sold`. Si no hay suficiente stock, **se bloquea** con un atajo a "Agregar al inventario".
- **BR-MBK-04** La nota es texto libre (p. ej. "me lo dio la chica de la panadería, que pase el 3 de noviembre"). No genera recordatorios en la v1.
- **BR-MBK-05** El dinero de minibooks es una **cuenta aparte**. **No** entra en: libros vendidos, compra, venta al público, diferencia, dinero en la calle, saldo de clientes. Su **única** conexión con otras cuentas es "Total abonado" cuando se asigna a un Abibono.
- **BR-MBK-06** Asignación a Abibono (`leader_deposit_minibook_allocation`): se elige una entrada y **cuánto** de ella se entrega (parcial permitido, ≤ monto − ya asignado). Solo lo asignado suma a lo entregado. El resto sigue siendo del colportor. El dinero usa el método de la entrada para el autocálculo de efectivo/transferencia.
- **BR-MBK-07** **Entrega por saldo a favor**: una entrada puede tener `customer_id` y origen `client_credit`. El monto indicado **no puede superar el saldo a favor vigente** del cliente y **lo reduce**; **no cuenta como ingreso** de minibooks, **no puede asignarse a un Abibono** (ese dinero ya se entregó cuando el cliente pagó el libro), pero **sí** descuenta stock y cuenta en "minibooks entregados".
- **BR-MBK-08** Totalizadores propios de minibooks: cantidad vendida, ingresos (Σ montos con origen `cash`), costo (Σ precio colportor snapshot de los ejemplares vendidos), ganancia neta (ingresos − costo), entregado al líder (Σ asignaciones), stock actual.
- **BR-MBK-09** Una entrada sin asignaciones en Abibono confirmado se puede editar o borrar; borrarla devuelve los ejemplares a `in_stock`.

## 10. Calendario y recordatorios

- **BR-CAL-01** Tres tipos de evento: **abono programado** (derivado de abonos `scheduled`, por `due_date`; no es una entidad nueva), **visita**, **capacitación**. El calendario permite distinguirlos (forma + color + texto) y filtrar por tipo. Los abonos `canceled` no aparecen.
- **BR-CAL-02** **Visita**: fecha (hora opcional), nota, estado `pending`/`done`/`canceled`, cliente **opcional** (agregación, no composición). Sin cliente lleva una etiqueta libre (p. ej. "Panadería de la esquina"). Sobrevive al archivado del cliente. Se puede convertir en cliente con un toque.
- **BR-CAL-03** **Capacitación**: título, empresa o lugar, fecha **y hora**, notas.
- **BR-CAL-04** Recordatorios para visitas y capacitaciones: *a inicio del día*, *un día antes*, *una semana antes* o *personalizado* (minutos antes). Pueden ser varios por evento. **No hay recordatorio por defecto**: se ofrece al crear el evento. "Inicio del día" = **07:00** America/Bogota.
- **BR-CAL-05** Los abonos por cobrar usan siempre el aviso de **inicio del día** (aparecen en "Hoy" el día de su `due_date` y como vencidos después).
- **BR-CAL-06** En la v1 los recordatorios son **dentro de la app** (Hoy, insignia en el calendario). Un recordatorio está activo cuando `ahora ≥ momento de disparo` y el evento está pendiente; se puede descartar. **Push real es fase 2.**
- **BR-CAL-07** *(en revisión, DT-09: el dueño quiere que Hoy sea un resumen general con calendario del día, cobro rápido de abonos y resumen de libros en físico; el detalle se define al diseñarlo)* **Hoy** (también "Pendientes del día") es una pantalla **mínima, con un único botón ("Entregar", dentro de la tarjeta "Por entregar"), sin subtítulos y sin calendario ni semana**. Contiene, en este orden: (1) la tarjeta **"Por entregar"** (BR-CAL-08); (2) el **aviso único de cobros vencidos** (BR-CAL-09), solo si hay; (3) la **barra de meta** fina, sin números ni etiqueta; (4) **una sola lista cronológica de lo de hoy** que mezcla cobros, visitas, capacitaciones y recordatorios activos, cada fila con **ícono de tipo (único color de categoría)**, hora, nombre y detalle corto (máximo 2 líneas). "Agregar al inventario" **no** está en Hoy (vive en Inventario, BR-GEN-11). La semana del calendario empieza el **domingo**.

- **BR-CAL-08** **Tarjeta "Por entregar" en Hoy** (Referencia 4): tarjeta **destacada con el color de acento** (casi negro en la variante A, `#092e53` en la B) y texto claro; es el elemento que más resalta en Hoy. Muestra el **total** `to_deliver_total` como cifra grande con el **ícono de ojo al lado** de la cifra y, como ayuda, **una sola línea con el desglose** `Efectivo · Transferencia`. Contiene **un único botón "Entregar"** (píldora clara) que abre **Nuevo Abibono precargado** (BR-DEP-13). **Sin subtítulo, sin barra de colores y sin enlace "Ir a Dinero"**; el significado va en un **ⓘ** bajo demanda ("Dinero que ya cobraste y aún no has entregado al líder"). Reglas: (1) cuenta abonos `collected` aunque estén en un Abibono **borrador**; (2) **excluye** el dinero de minibooks y los abonos `canceled`; (3) el **ojo** oculta/muestra los montos (por defecto visibles; la preferencia se recuerda **en el dispositivo**); (4) con total 0 muestra "Nada por entregar" y el botón **no aparece**; (5) tocar el resto de la tarjeta abre **Dinero**. Es la **única cifra de dinero** permitida en Hoy.

- **BR-CAL-09** **Aviso de cobros vencidos en Hoy:** una **sola fila discreta** en rojo ("N cobros vencidos ›"), **nunca uno por uno**. Solo aparece si hay al menos uno (abono `scheduled` con `due_date < hoy`). Al tocarla abre **Dinero ▸ Por cobrar** ya filtrado a **Vencidos**. Los vencidos **no** se repiten en la lista cronológica de Hoy.

## 11. Valores derivados (resumen, nunca almacenados)

| Valor | Definición |
|---|---|
| `debt`, `paid_total`, `balance`, `credit`, `scheduled_total`, `unscheduled` | BR-CUS-04, BR-CUS-06 |
| `excess` (abonos que no cuadran) | BR-PAY-13 |
| `price_differs`, `price_delta` | BR-PRC-01/02 |
| `is_prospect` | cliente sin ejemplares `sold` |
| `age_stage` | BR-COPY-13 |
| `overdue` | abono `scheduled` con `due_date < hoy` |
| `total` del Abibono, `expected`, `difference` | BR-DEP-04/05 |
| `first_sale_at`, `last_sale_at` | BR-CUS-04 |
| `bonus_progress` | BR-GOAL-01 |
| `cash_to_deliver` / `transfer_to_deliver` / `to_deliver_total` | Σ `paid_amount` de abonos `collected` (no `delivered`) por método, y su suma ("**Por entregar**") |
| `lost_assumed_value` y `owed_to_leader` | BR-GOAL-07 |

## 12. Metas y totalizadores

- **BR-GOAL-01** Meta de bonificación: `bonus_progress = Σ colportor_price_snapshot de ejemplares *culturales* vendidos ÷ bonus_goal`. Valor por defecto de `bonus_goal` = **4.000.000** COP, editable por el admin. Se muestra **solo como barra de progreso, sin cifras**. Ubicación inicial: "Hoy"; sujeta a cambios según el diseño (DT-02).
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
- **BR-GOAL-05** *Hacer inventario*: pantalla con tabla por título (BR-COPY-14), agrupada en **Culturales, Religiosos, Minibooks**, con subtotales y total. Dos vistas: **Inventario** (solo culturales) e **Inventario TODOS** (culturales + religiosos). Los minibooks siempre aparte. Es una vista en vivo. **Compartir:** botón **"Copiar resumen"** que deja un texto limpio para pegar (WhatsApp). **PDF y CSV quedan declarados como mejora futura** (backlog). **No** se guardan cortes históricos en la v1.
- **BR-GOAL-06** Las cifras de dinero se muestran en: **Dinero**, **ficha del cliente**, **Abibono** y **Hacer inventario**, y en **Hoy** únicamente la tarjeta **"Por entregar"** (BR-CAL-08), porque es el dato operativo de cuánto hay que entregar al líder. No se muestran en: **Inventario** (pantalla de libros en físico), **Agregar** ni **Calendario**; la lista de **Ejemplares** solo muestra el precio acordado y la diferencia de cada ejemplar, nunca sumas (BR-COPY-12). En la lista de **Clientes** solo aparece el saldo pendiente de cada cliente (BR-CUS-05).
- **BR-GOAL-07** **Pérdidas y "A responder al líder":** `lost_assumed_value = Σ colportor_price_snapshot de ejemplares lost`. `owed_to_leader = Mi compra (vendidos) + lost_assumed_value`. En *Hacer inventario* se muestran la línea **"Perdidos asumidos"** (cantidad y valor) y el total **"A responder al líder"**. "Mi compra" sigue siendo solo vendidos. No son parte de los 8 totalizadores originales. **Alcance:** igual que "Mi compra", es decir libros culturales y religiosos según el selector Todos | Culturales | Religiosos; los **minibooks perdidos no cuentan** (los minibooks son una cuenta aparte, ADR-0033).

## 13. Inventario: agregar, favoritos y vistas

- **BR-INV-01** *Agregar a inventario*: ver BR-COPY-02.
- **BR-INV-02** Favoritos: por usuario, máximo **6** (`app_settings.max_favorites`, editable por el admin).
- **BR-INV-03** *Libros en físico*: Títulos con la cantidad de ejemplares `in_stock`, con el icono de antigüedad. Minibooks al final/aparte. Los `flagged` se muestran en una sección "Por resolver". Desde aquí se accede a "Devolver al líder" en lote (BR-COPY-16).

## 14. Fotos

- **BR-PHO-01** Toda foto se **comprime en el cliente** antes de subir: WebP, lado mayor ≤ 1280 px, objetivo ~150 KB; se genera una miniatura de ~15 KB. Las listas usan miniaturas. La captura usa `<input type="file" accept="image/*" capture>`.
- **BR-PHO-02** Buckets privados por usuario con URLs firmadas (imágenes de Títulos: lectura pública). Ruta: `{owner_id}/{tipo}/{uuid}.webp`.
- **BR-PHO-03** El recibo del Abibono es **obligatorio** para confirmar (BR-DEP-09). Las fotos de recibo y de factura **no se pueden borrar** si el abono ya fue entregado; las fotos de información del cliente sí.
- **BR-PHO-04** Se mide el uso de almacenamiento; al 70 % se alerta al admin (migración a Cloudflare R2, ver ADR-0013).

## 15. Historial y auditoría

- **BR-AUD-01** Se guardan eventos de solo inserción: `copy_event` (recibido, vendido, devuelto con motivo, novedad, resuelto, precio, fecha de recibido, devuelto al líder, deshecho), `payment_reschedule`, `payment_event` (ajustes, cancelaciones, reaperturas) y `leader_deposit_event` (reapertura con motivo). Nunca se editan ni borran.
