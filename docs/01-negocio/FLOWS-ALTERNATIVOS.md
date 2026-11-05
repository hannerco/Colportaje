# Flujos alternativos y casos especiales

Complementa `01-negocio/FLOWS.md` (caminos principales). Aquí se documentan **todas** las situaciones que pueden ocurrir en la práctica y cómo responde la app. Cada caso tiene ID estable (`AF-*`), la situación, el comportamiento exacto y las reglas aplicadas (`BR-*`). Sirve para el diseño, para el desarrollo y como lista de **pruebas E2E/dominio** (`03-arquitectura/TESTING.md`).

Convención de ejemplos: precios en COP.

---

## A. Devoluciones y "quitar un libro de un cliente"

Una sola acción —**"Devolver a inventario"** en la ficha del cliente (o en el detalle del ejemplar)— cubre dos situaciones, distinguidas por el **motivo** que pregunta la app: *El cliente lo devolvió* (`customer_returned`) y *Me equivoqué de cliente / de registro* (`wrong_registration`). Con el segundo motivo, la acción **no cuenta** como devolución en estadísticas. Reglas base: BR-COPY-09, BR-PAY-13, BR-CUS-06, BR-CUS-09.

**Efecto común** (todos los casos): el ejemplar vuelve a `in_stock`, pierde cliente, precio acordado y fecha de venta, **conserva `received_at`** (es el mismo libro físico) y se registra el evento con el motivo. Los abonos `collected`/`delivered` y los Abibonos **no se tocan**.

### AF-114 Quitar un libro mientras se crea la ficha
- *Situación:* en la ficha de un cliente **nuevo** (antes de tocar "Guardar cliente") se quita un libro que se acababa de agregar.
- *App:* se asume que fue un **error**: el ejemplar vuelve a `in_stock` **sin preguntar motivo y sin modal**; no cuenta como devolución en estadísticas (en el historial del ejemplar queda como `wrong_registration`). Los avisos informativos en línea (BR-PAY-13/14) se actualizan solos. Si el cliente **ya existe** (ya se guardó), quitar un libro es una **devolución** y sigue el flujo de AF-01..AF-12.

### AF-01 Devolución simple (sin pagos)
- *Situación:* cliente con un libro de 50.000, sin abonos.
- *App:* confirma la devolución; el cliente queda con deuda 0 y se convierte en **prospecto** (conserva su ficha).
- *Resultado:* ejemplar en inventario; sin alertas.

### AF-02 Devolución con pagos cobrados, aún por entregar
- *Situación:* libro de 50.000, cliente pagó 30.000 (`collected`, sin entregar).
- *App:* tras devolver, deuda = 0, abonos = 30.000 → **Saldo a favor 30.000**. Aviso con tooltip: "No hay reembolsos; puedes darle un minibook".
- *Importante:* el dinero de esos 30.000 **sigue en tu poder** y sigue pudiéndose incluir en un Abibono (cuenta en "Por entregar"). Ver AF-10 para canjear por minibook.

### AF-03 Devolución con pagos ya entregados al líder
- *Situación:* igual a AF-02 pero los 30.000 ya están en un Abibono confirmado.
- *App:* el Abibono y los abonos **no cambian**. Saldo a favor 30.000. No hay forma de devolver el dinero (ya está con el líder).
- *Reglas:* BR-PAY-10, BR-CUS-06. Decisión del dueño: "el abibono debe seguir allí".

### AF-04 Devolución de uno entre varios libros
- *Situación:* cliente con libros de 50.000 y 30.000 (deuda 80.000), pagó 20.000; devuelve el de 50.000.
- *App:* deuda = 30.000, abonos = 20.000, saldo = 10.000. Si había abonos programados que suman más de 10.000 → alerta (AF-05).

### AF-05 Devolución con abonos programados que ya no cuadran
- *Situación:* el cliente tenía abonos programados (p. ej. 3 × 10.000) y devuelve el libro; ahora solo debe 10.000.
- *App:* **modal** (BR-PAY-13) con: saldo restante 10.000, programado 30.000, **sobrante 20.000** y la lista de abonos con casillas. Opciones:
  1. **Recortar automáticamente** (sugerido): tras una devolución se consume desde el **más lejano** → se cancelan los dos últimos de 10.000.
  2. **Cancelar los que marque.**
  3. **Dejar como está** (queda un aviso persistente en la ficha hasta resolverlo).
- *Resultado:* los abonos cancelados pasan a `canceled` (motivo `book_returned`), se **conservan** en "Cancelados" y **no cuentan** en el calendario, Hoy, por cobrar ni totales.
- *Por qué:* lo por cobrar debe reflejar solo lo que el cliente realmente va a pagar.

### AF-06 Me equivoqué de cliente
- *Situación:* le agregué el libro al cliente A y era del cliente B.
- *App:* en la ficha de A → "Devolver a inventario" → motivo **Me equivoqué de cliente**. Luego, en la ficha de B → "Agregar libro" y eliges el mismo ejemplar (vuelve al stock). No existe "cambiar de cliente".
- *Pagos registrados por error en A:*
  - Si el abono está `collected` y **no** entregado → se **edita o borra** (BR-PAY-11) y se registra en B.
  - Si ya está **entregado** en un Abibono confirmado → **Reabrir** el Abibono con motivo (BR-DEP-12), corregir el abono y confirmar de nuevo.
  - Abonos `scheduled` de A sobre ese libro → alerta y recorte/cancelación (AF-05).
- *Estadísticas:* este caso **no** cuenta como "devolución".

### AF-07 Devolución de un libro con precio acordado distinto
- *Situación:* el libro se había vendido con descuento (45.000 vs 50.000).
- *App:* al devolver se limpia el precio acordado. La diferencia desaparece de los totales (porque el ejemplar deja de estar vendido). Al revenderse, empieza otra vez con el precio público.

### AF-08 Revender el ejemplar devuelto a otro cliente
- *App:* vuelve a la lista de ejemplares en inventario con su **fecha de recibido original**. Se vende normalmente (BR-COPY-06).

### AF-09 El cliente se queda sin libros
- *App:* pasa a ser **prospecto** (derivado): sale de las listas por defecto y del "Total clientes", pero conserva abonos, visitas y fotos. Puede **archivarse** (AF-71). Sus abonos `collected` no entregados siguen en **Dinero**.

### AF-10 Canjear el saldo a favor por un minibook
- *Situación:* el cliente tiene saldo a favor 30.000.
- *App:* en la ficha → "Entregar un minibook" → título (con stock), cantidad, monto aplicado (**≤ saldo a favor**) → entrada con origen `client_credit`.
- *Efecto:* reduce el saldo a favor; descuenta stock; **no** suma ingresos de minibooks; **no** puede ir a un Abibono (ese dinero ya se entregó o ya es tuyo).
- *Reglas:* BR-MBK-07.

### AF-11 El cliente pide reembolso
- *App:* **no hay flujo de reembolso** (no hay de dónde sacar el dinero). Solo se muestra el saldo a favor y la opción de minibook. Reembolsos están en el backlog.

### AF-12 Un libro devuelto está dañado
- *App:* se devuelve a inventario y luego, desde el inventario, se **marca con novedad** (nota obligatoria) y se resuelve como *Perdido (lo asumo yo)* o *Eliminar* (AF-52).

---

## B. Abonos

### AF-20 El cliente da un abono extra y hay abonos programados
- *Situación:* debe 40.000 en 4 × 10.000; da 20.000 extra hoy.
- *App:* saldo restante 20.000; programado 40.000; **sobrante 20.000** → modal BR-PAY-13. Sugerido: **Recortar desde el más próximo** (cancela los 2 siguientes, porque el cliente se adelantó). Opciones: cancelar los que marques / dejar.
- *Si dejas como está:* aviso persistente en la ficha.

### AF-21 Pago mayor al acordado en un abono programado
- *Situación:* acordó 10.000 y paga 15.000.
- *App:* queda `collected` por 15.000 (BR-PAY-07). Se evalúa BR-PAY-13: si el resto programado ahora excede lo que falta → modal (sugerido: desde el más próximo).

### AF-22 Abono parcial (paga menos)
- *Situación:* acordó 50.000 y paga 30.000.
- *App:* queda `collected` por 30.000; los 20.000 siguen en el saldo; aviso **no intrusivo** "Faltan 20.000: ¿programar otro abono?". **No** se crea nada solo.

### AF-23 Cobrar en fecha distinta de hoy
- *App:* "Fecha real" es editable (por defecto hoy; **no futura**). Útil cuando se registra al día siguiente.

### AF-24 Prórroga repetida
- *App:* cada "Dar más plazo" cambia `due_date` y añade una fila al historial; `original_due_date` no cambia nunca. La ficha muestra la fecha original tachada y la actual; el historial muestra cuántas veces se aplazó. La nueva fecha debe ser posterior a la actual, y si pasa de 2 meses desde hoy la app pide confirmarla.

### AF-25 El cliente liquida toda la deuda de una vez
- *App:* tras registrar el abono, `remaining = 0` y todo lo programado es sobrante → modal con **Recortar** (cancela todos). Resultado: sin abonos programados, saldo 0.

### AF-26 Abono vencido
- *App:* en Hoy aparece como **aviso único** ("N cobros vencidos ›", nunca uno por uno); al tocarlo abre Dinero ▸ Por cobrar ▸ Vencidos, donde se cobran, reprograman o cancelan. En el calendario se ve resaltado. No hay cancelación automática.

### AF-27 Abono cobrado registrado por error
- *App:* si **no** está en un Abibono confirmado, se edita o borra (lógico) y se recalcula todo. Si ya está entregado → AF-44 (Reabrir).

### AF-29 Bajar el precio acordado de un ejemplar tras pagos
- *App:* recalcula deuda y saldo. Si el nuevo saldo es negativo → **Saldo a favor**. Si los programados exceden lo que falta → modal (sugerido: desde el más lejano).

### AF-30 Subir el precio acordado
- *App:* sube la deuda; aparece "sin programar $X" informativo (no es alerta).

### AF-31 Libro sin cuota inicial ni abonos programados
- *App:* válido. La ficha muestra saldo pendiente y "sin programar".

### AF-32 En la ficha, los abonos programados exceden el saldo
- *App:* franja informativa en línea "Lo programado supera el saldo en $X · **Revisar**"; al tocar Revisar se abre el modal (ajustar/cancelar/dejar). No bloquea. Si suman **menos** que el saldo, no hay aviso (solo "sin programar").

---

## C. Abibonos (entregas al líder)

### AF-40 Entrega sin abonos vinculados (donación)
- *App:* se indica efectivo/transferencia, título explicativo y **nota obligatoria** (`expected = 0`). Recibo obligatorio. Válido.

### AF-41 Entrega con diferencia
- *App:* esperado vs. entregado y diferencia siempre visibles. Faltante (−) o sobrante (+) **exige nota** para confirmar.

### AF-42 Incluir dinero de minibooks
- *App:* se eligen entradas y **cuánto de cada una** (parcial permitido). Suma al esperado; el método de la entrada alimenta efectivo/transferencia. Las entradas `client_credit` no aparecen.

### AF-43 Borrador abandonado
- *App:* se puede editar o borrar; al borrarlo los abonos quedan libres para otro Abibono.

### AF-44 Corregir un Abibono ya confirmado ("Reabrir")
- *App:* siempre se puede editar la **nota** y **añadir fotos**. Para cambiar montos o abonos vinculados: botón discreto **Reabrir** → pide **motivo** → el Abibono vuelve a `draft`, los abonos a `collected`, queda en el historial. Luego se corrige y se vuelve a confirmar (con recibo).

### AF-45 Entrega mixta efectivo + transferencia
- *App:* autocalcula por método según lo vinculado; si lo realmente entregado difiere, se **edita** efectivo/transferencia; la diferencia se refleja y pide nota.

### AF-46 Foto de recibo equivocada o insuficiente
- *App:* una por defecto, "Añadir otra" para más. No se pueden borrar las de un Abibono confirmado; sí añadir. Para sustituir una: Reabrir.

### AF-47 Abonos de un cliente archivado
- *App:* siguen apareciendo en **Dinero** con "(cliente archivado)" y se pueden incluir en un Abibono.

---

## D. Inventario y ejemplares

### AF-50 Registrar libros días después (sin internet o sin celular)
- *App:* al agregar, el **chip de fecha** ("Hoy ▾") permite escoger un día **pasado**. También se edita después como propiedad en línea del ejemplar. No se permiten fechas futuras ni posteriores a la venta.

### AF-51 Agregué de más por error
- *App:* aviso con **Deshacer** unos segundos; o tocar la pastilla numérica y escribir la cantidad correcta (retira los ejemplares **recién agregados** que sobren). Para ejemplares agregados antes: *Eliminar* desde el detalle (nota opcional).

### AF-52 "Con novedad": opciones de resolución
- *Situación:* el líder dice que te entregó 4 y tienes 3 (falta uno), o hay uno de más.
- *Falta uno:* se marca "Con novedad" el ejemplar que falta (nota obligatoria; el **número** ayuda a saber cuál). Sale del físico.
- *Resolución:* **Apareció** → vuelve a inventario. **Perdido (lo asumo yo)** → `lost`, cuenta en "A responder al líder". **Eliminar** (nota opcional) → se borra y no cuenta en nada.
- *Regla de contenido:* ningún texto menciona que el líder pueda asumir pérdidas (BR-COPY-11).

### AF-53 Tengo un libro de más que no está en el sistema
- *App:* se agrega un ejemplar normalmente (con la fecha real de recibido si aplica). Puede dejarse una nota en el historial.

### AF-54 Devolver libros al líder (fin de campaña o libros viejos)
- *App:* en Libros en físico → **Devolver al líder** (lote): se eligen ejemplares `in_stock` (cualquier fecha de recibido) y una nota. Pasan a `returned_to_leader`; salen del físico; no cuentan en "Mi compra" ni "A responder"; columna **Devueltos** en *Hacer inventario*. **Deshacer** con nota si fue un error.

### AF-55 Título desactivado con stock
- *App:* los ejemplares existentes se siguen pudiendo vender y devolver; no se pueden agregar nuevos de ese título.

### AF-56 El admin cambia los precios de un título
- *App:* no afecta ejemplares ya recibidos (snapshots). Los nuevos ejemplares toman el precio vigente.

### AF-57 Intentar vender un ejemplar que no está en inventario
- *App:* no aparece en el selector (solo `in_stock`).

---

## E. Minibooks

### AF-60 Vender más minibooks de los que hay
- *App:* se **bloquea** y ofrece un atajo a "Agregar al inventario" (misma pastilla "+/numérica" que los libros).

### AF-61 Regalar un minibook
- *App:* monto 0 permitido; descuenta stock; cuenta en cantidades, no en ingresos.

### AF-62 Nota de persona interesada
- *App:* texto libre en la entrada (p. ej. "pasar el 3 de noviembre"). No crea recordatorios en la v1.

### AF-63 Corregir o borrar una entrada
- *App:* si **no** tiene asignaciones en un Abibono confirmado, se edita o borra; borrar devuelve los ejemplares al stock. Si está asignada a un Abibono confirmado: bloqueada (Reabrir el Abibono primero).

### AF-64 El dinero de minibooks se usó para otra cosa
- *App:* simplemente **no se asigna** a ningún Abibono. No afecta ninguna otra cuenta. Se puede asignar **parte** si solo se entrega una fracción.

---

## F. Clientes

### AF-70 Posible duplicado al crear
- *App:* aviso **no bloqueante** ("¿Es la misma persona?") si hay mismo teléfono o nombre casi idéntico; enlace al cliente existente; el usuario decide.

### AF-71 Archivar y restaurar un cliente
- *App:* **Archivar** solo si no tiene ejemplares vendidos; sus abonos `scheduled` se cancelan (alerta/confirmación, motivo `customer_archived`); sus abonos cobrados siguen en Dinero. Se ve en **Archivados** y se **restaura**.

### AF-72 Visita sin cliente
- *App:* visita con etiqueta libre; "Crear cliente" con un toque la convierte (precarga el nombre). Una visita sobrevive al archivado del cliente.

### AF-73 Cliente sin teléfono
- *App:* válido; los botones de llamar y WhatsApp no aparecen.

---

## G. Usuarios y acceso

### AF-80 Invitar a un colportor
- *App:* en el panel de admin → "Invitar" → correo → la app muestra un **enlace** para copiar y enviar por WhatsApp. El enlace caduca; se puede **regenerar**. Al abrirlo, la persona crea su contraseña y entra.

### AF-81 Desactivar o reactivar a un usuario
- *App:* el admin lo hace desde la lista de usuarios. Un usuario desactivado no puede entrar; sus datos se conservan.

### AF-82 Olvidé mi contraseña
- *Situación:* el correo automático de Supabase está limitado y no sirve para restablecer contraseñas a usuarios externos (ver ADR-0027).
- *App:* el usuario se lo pide al admin; en el panel de admin → usuario → **"Generar enlace para restablecer contraseña"** (mismo mecanismo que la invitación; enlace para WhatsApp).

### AF-83 Sesión expirada
- *App:* vuelve al login conservando la ruta; en lectura sin conexión se sigue pudiendo consultar lo guardado.

---

## H. Conectividad y fallos

### AF-90 Sin conexión (fase 1)
- *App:* se abre y deja **consultar** lo último sincronizado. Para **registrar o modificar** muestra "Sin conexión: puedes consultar, pero no registrar". Banner persistente de estado de conexión.

### AF-91 La conexión se cae al guardar
- *App:* muestra el error y permite reintentar. Las operaciones son **idempotentes** (mismo UUID) para que un reintento no duplique registros.

### AF-92 Falla la subida de una foto
- *App:* reintento manual; **no** se puede confirmar un Abibono sin recibo subido correctamente.

---

## I. Calendario, tiempo y preferencias

### AF-100 Visita pendiente que ya pasó
- *App:* sigue visible como pendiente (resaltada); se marca *Hecha*, *Cancelada* o se cambia la fecha.

### AF-101 Recordatorios
- *App:* ninguno por defecto; se ofrece al crear. Inicio del día = 07:00. Dentro de la app (push en fase 2).

### AF-102 Formato 12/24 horas
- *App:* cada usuario lo cambia en **Ajustes** (por defecto 12 h). Afecta capacitaciones, visitas con hora y recordatorios.

### AF-103 Semana del calendario
- *App:* empieza el **domingo**.

### AF-104 Ocultar el monto "Por entregar"
- *Situación:* el colportor muestra el celular a un cliente.
- *App:* toca el **ojo** de la tarjeta "Por entregar" en Hoy: los montos se reemplazan por puntos. La preferencia se guarda en el dispositivo (no en el servidor) y se mantiene entre sesiones.

### AF-106 Entregar desde Hoy
- *Situación:* el colportor toca "Entregar" en la tarjeta de Hoy.
- *App:* abre **Nuevo Abibono** con todos los abonos `collected` libres ya seleccionados y efectivo/transferencia autocalculados; puede desmarcar, ajustar, añadir minibooks y subir el recibo. **No se crea borrador hasta guardar**; si cierra sin guardar, no queda nada. Con total 0 el botón no existe. Abonos ya vinculados a **otro borrador** no se preseleccionan.

### AF-107 Abonos antes de agregar el libro
- *Situación:* en la ficha viva se programan abonos y todavía no hay libro.
- *App:* franja informativa **"Aún no tiene libro"** (BR-PAY-14) y, si lo programado supera el saldo (que es 0), también el aviso de BR-PAY-13 con **Revisar**. **Nada se bloquea**: el usuario puede seguir. Al agregar el libro, los avisos se actualizan solos.

### AF-108 Ficha nueva sin nombre
- *Situación:* se abre "Nuevo cliente" y se sale sin escribir el nombre.
- *App:* **no se crea nada**. Con nombre escrito, el cliente ya existe aunque no tenga libros (prospecto).

### AF-112 Descartar un cliente recién creado
- *Situación:* el usuario toca **"Descartar"** en la cabecera de la ficha nueva (antes de tocar "Guardar cliente").
- *App:* pide confirmación con lo que se perderá ("Se quitarán 2 libros y 1 abono"; sin nada, "Se quitará este cliente"). Si confirma: elimina al cliente, sus libros vuelven a `in_stock` (como en BR-COPY-06), se quitan sus abonos y fotos. Si elige "Seguir editando", no pasa nada. Tras "Guardar cliente" ya no existe "Descartar": se usa Archivar (BR-CUS-09). "Archivar" no aparece mientras se crea.

### AF-113 Plan automático que no divide exacto
- *Situación:* el saldo no es múltiplo del valor de cada abono, o el saldo no es múltiplo de $1.000.
- *App:* número de abonos = saldo ÷ valor hacia abajo; el sobrante lo suma el abono más próximo (BR-PAY-15). Si el saldo es menor que el valor, se crea un solo abono por el saldo. La fila del abono mayor no lleva marca.

### AF-109 Sin permiso de ubicación o sin señal de GPS
- *Situación:* el usuario niega el permiso, o está en un lugar donde el GPS no responde.
- *App:* el selector se abre igual (último punto elegido o vista de Colombia) con un aviso breve; el usuario ubica el pin a mano. El permiso se pide solo al tocar el botón. En iPhone el aviso puede repetirse en cada apertura (ADR-0036).

### AF-110 Ubicación aproximada
- *App:* si la precisión del GPS es peor de ~50 m, aviso discreto **"Ubicación aproximada"**; el usuario puede repetir la captura o mover el pin antes de confirmar.

### AF-111 Sin conexión al elegir o ver la ubicación
- *App:* el GPS funciona pero el mapa no carga sus imágenes; en F1 guardar exige conexión. Si ya hay coordenadas guardadas, **"Abrir en Maps"** sigue disponible (lo resuelve la app de mapas del celular). En F2 se podrá capturar el punto sin señal y ajustar el pin después.

### AF-105 "Por entregar" frente a un Abibono en borrador o reabierto
- *App:* los abonos vinculados a un **borrador** siguen contando como por entregar. Al **confirmar**, salen. Al **reabrir** un Abibono, sus abonos vuelven a `collected` y **vuelven a contar**.

---

## Matriz de impacto (qué toca cada acción)

| Acción | Deuda | Saldo | Abonos programados | Abibonos | Inventario |
|---|---|---|---|---|---|
| Vender ejemplar | ↑ | ↑ | — (alerta si exceden) | — | − |
| Devolver ejemplar | ↓ | ↓ (puede ser saldo a favor) | alerta (recorte) | **no cambian** | + |
| Abono extra / cobro mayor | — | ↓ | alerta (recorte) | — | — |
| Bajar precio acordado | ↓ | ↓ | alerta | — | — |
| Cobrar abono programado | — | ↓ | ese pasa a cobrado | — | — |
| Confirmar Abibono | — | — | — | crea | — |
| Reabrir Abibono | — | — | abonos vuelven a `collected` | → borrador | — |
| Entrega de minibook por saldo a favor | — | saldo a favor ↓ | — | — | − (minibook) |
