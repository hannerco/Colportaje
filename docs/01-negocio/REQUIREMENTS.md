# Requisitos funcionales y criterios de aceptación

Formato: `RQ-<área>-NN` · fase `[F1]/[F2]/[F3]` · historia · **criterios de aceptación** (Dado/Cuando/Entonces). Cada criterio debe tener al menos una prueba (`03-arquitectura/TESTING.md`). Reglas completas en `01-negocio/BUSINESS-RULES.md`; flujos en `01-negocio/FLOWS.md` y `01-negocio/FLOWS-ALTERNATIVOS.md`.

**Plazo:** la fase 1 completa debe estar lista en **14 días** (ver `06-planificacion/ROADMAP.md`).

## Acceso, roles y administración
- **RQ-ACC-01 [F1]** Entro con correo + contraseña tras aceptar una invitación.
  - *Dado* un invitado, *cuando* abre su enlace y crea contraseña, *entonces* entra a **Hoy** con perfil y rol colportor creados. *Dado* alguien sin invitación, *entonces* no puede registrarse.
- **RQ-ACC-02 [F1]** Conmuto el modo administrador en Ajustes.
  - *Dado* un usuario sin rol admin, *entonces* no ve el conmutador y toda escritura admin es rechazada por el servidor.
- **RQ-ACC-03 [F1]** Cada colportor ve solo sus datos; el admin **tampoco** ve datos de negocio de otros.
  - *Dado* A y B, *cuando* A consulta cualquier tabla (incluso siendo admin), *entonces* nunca recibe filas de negocio de B (prueba RLS).
- **RQ-ACC-04 [F1]** Como admin, **invito** desde el panel: ingreso un correo y recibo un **enlace copiable** para enviar por WhatsApp; puedo **regenerarlo** si caduca.
  - *Entonces* el endpoint comprueba en servidor que quien llama es admin; la `service_role` nunca llega al cliente.
- **RQ-ACC-05 [F1]** Como admin, **genero un enlace de restablecimiento de contraseña** para un usuario.
- **RQ-ACC-06 [F1]** Como admin, **desactivo y reactivo** usuarios; uno desactivado no puede iniciar sesión y conserva sus datos.
- **RQ-ACC-07 [F1]** Elijo mi **formato de hora (12 h/24 h)** en Ajustes; por defecto 12 h.

## Catálogo (admin)
- **RQ-TIT-01 [F1]** Creo/edito/desactivo Títulos en **Catálogo** con todos sus campos.
  - *Dado* un título minibook, *entonces* el precio público es opcional; *dado* cultural/religioso, *entonces* es obligatorio y > 0.
  - *Cuando* desactivo un título con ejemplares, *entonces* no aparece al agregar a inventario y sus ejemplares siguen intactos y vendibles.
- **RQ-TIT-02 [F1]** Existe un script idempotente de carga inicial del catálogo.
- **RQ-TIT-03 [F1]** Edito meta de bonificación, umbrales de antigüedad y máximo de favoritos (por defecto 4.000.000, `[2,6,12]`, 6).

## Inventario y ejemplares
- **RQ-INV-01 [F1]** Agrego ejemplares con "+" (un toque = un ejemplar) desde lista o favoritos, **igual para libros y minibooks**.
  - *Cuando* toco "+" tres veces sobre "Corazón tranquilo", *entonces* hay 3 ejemplares con números consecutivos y precios copiados del título.
  - *Entonces* tras el primer toque el "+" es una **pastilla numérica**; si escribo 5, el total agregado en la sesión pasa a 5 (se crean o retiran los ejemplares recién agregados que sobren).
  - *Entonces* aparece **Deshacer** unos segundos.
- **RQ-INV-02 [F1]** Marco/desmarco favoritos (máx. 6). *Dado* 6 favoritos, *cuando* marco el séptimo, *entonces* se rechaza con aviso.
- **RQ-INV-03 [F1]** Veo mis libros en físico por título con cantidad e icono de antigüedad; minibooks al final; "Por resolver" aparte.
  - *Dado* un ejemplar recibido hace 0/2/3/6/7/12/13 días, *entonces* su etapa es reciente/reciente/normal/normal/envejeciendo/envejeciendo/antiguo (umbrales por defecto).
- **RQ-INV-04 [F1]** Veo todos los ejemplares en 4 vistas (Todos, En inventario, Vendidos, Con descuentos y aumentos) con orden y búsqueda, usando la barra de vista común.
- **RQ-INV-05 [F1]** Edito el precio acordado de un ejemplar vendido y veo Precio distinto y Diferencia.
  - *Dado* público 50.000 y acordado 45.000, *entonces* diferencia −5.000 (descuento); *dado* 55.000, *entonces* +5.000 (aumento).
- **RQ-INV-06 [F1]** Marco "Con novedad" (nota obligatoria) y resuelvo: **Apareció**, **Perdido (lo asumo yo)** o **Eliminar**.
  - *Entonces* un ejemplar `flagged` no cuenta como físico; "Perdido" lo deja `lost` y suma a "A responder al líder"; "Eliminar" lo borra sin contar en nada.
  - *Entonces* ningún texto de la app menciona que el líder pueda asumir una pérdida.
- **RQ-INV-07 [F1]** **Devuelvo** un ejemplar vendido (motivo: *cliente lo devolvió* / *me equivoqué*) sin alterar abonos cobrados ni Abibonos.
  - *Dado* un cliente con un solo ejemplar a 50.000 que pagó 30.000 (ya entregados en un Abibono confirmado), *cuando* se devuelve, *entonces* deuda 0, abonos 30.000, Abibono intacto, **Saldo a favor 30.000**, el ejemplar conserva su `received_at` y su antigüedad.
  - *Dado* ese cliente con otro ejemplar de 20.000, *cuando* se devuelve el de 50.000, *entonces* deuda 20.000, abonos 30.000, saldo a favor 10.000.
  - *Entonces* con motivo *me equivoqué*, no cuenta como devolución en estadísticas.
- **RQ-INV-08 [F1]** Agrego ejemplares con una **fecha de recibido pasada** (chip "Hoy ▾") y puedo **editar "Recibido el"** después (no futura, no posterior a la venta); el cambio queda en el historial.
- **RQ-INV-09 [F1]** **Devuelvo al líder** ejemplares `in_stock` en lote, de cualquier antigüedad, con nota; puedo deshacerlo con nota.
  - *Entonces* no cuentan en "Mi compra" ni en "A responder al líder" y salen en la columna "Devueltos".

## Clientes
- **RQ-CUS-01 [F1]** Creo clientes con o sin libros (prospectos).
  - *Dado* un cliente sin ejemplares, *entonces* es prospecto: no aparece en listas por defecto ni en "Total clientes".
- **RQ-CUS-02 [F1]** La ficha muestra deuda, abonos (con Cancelados plegable), saldo pendiente/a favor, sin programar, fechas de venta derivadas, facturas, fotos, visitas.
- **RQ-CUS-03 [F1]** Listas Recientes (por **fecha de creación** desc.), Deudores (saldo > 0), Todos, Archivados; selector de orden (Recientes, Última actividad, Nombre, Saldo pendiente); interruptor "Incluir prospectos"; cada fila muestra el saldo pendiente del cliente.
- **RQ-CUS-04 [F1]** Búsqueda local difusa sobre nombre, teléfono, información, dirección.
  - *Dado* "María Gómez" guardada, *cuando* busco "maria gomes", *entonces* aparece.
- **RQ-CUS-05 [F1]** Dirección con texto + enlace Maps + "Abrir en Maps" + mapa embebido que carga al tocar.
- **RQ-CUS-06 [F1]** **Archivo** un cliente solo si no tiene ejemplares vendidos; sus abonos programados se cancelan con confirmación; sus abonos cobrados siguen en Dinero; lo restauro desde Archivados.
- **RQ-CUS-07 [F1]** Al crear un cliente, un aviso **no bloqueante** si hay mismo teléfono o nombre casi idéntico.
- **RQ-CUS-08 [F1]** La ficha ofrece **llamar** y **WhatsApp** cuando hay teléfono.

## Vender
- **RQ-SAL-01 [F1]** Flujo **+ Vender** de un solo camino (cliente buscar/crear → ejemplares uno por uno → cuota inicial y abonos programados → foto de factura).
  - *Entonces* los ejemplares quedan `sold` con `customer_id`, `sold_at`, `agreed_price = precio público`; la cuota inicial `collected`; los programados `scheduled`.
- **RQ-SAL-02 [F1]** Un cliente existente puede recomprar sobre el mismo registro; el saldo se recalcula.
- **RQ-SAL-03 [F1]** Solo puedo vender ejemplares `in_stock`; desde la ficha puedo agregar y quitar ejemplares.

## Abonos
- **RQ-PAY-01 [F1]** Registro cuota inicial, abono programado y abono extra (pago fuera del plan, sin fecha acordada).
- **RQ-PAY-02 [F1]** Cobro un abono programado con monto/fecha reales (no futura) y método.
  - *Dado* acordado 50.000 y pagado 30.000, *entonces* `collected` por 30.000, saldo conserva 20.000 y se **sugiere** (no se crea) otro abono.
- **RQ-PAY-03 [F1]** Doy prórroga: `original_due_date` no cambia, `due_date` sí, se inserta historial.
  - *Cuando* aplazo dos veces, *entonces* hay 2 filas de historial y la fecha original sigue siendo la primera.
- **RQ-PAY-04 [F1]** Abonos vencidos se resaltan en Hoy y calendario.
- **RQ-PAY-05 [F1]** Un abono en un Abibono confirmado está bloqueado (se desbloquea solo reabriendo el Abibono).
- **RQ-PAY-06 [F1]** **Alerta de abonos que no cuadran** (BR-PAY-13).
  - *Dado* saldo restante 20.000 y programados 40.000 (4 × 10.000), *cuando* el cliente da un abono extra de 20.000, *entonces* aparece el modal con sobrante 20.000; **Recortar** cancela los **2 más próximos**.
  - *Dado* una devolución con el mismo sobrante, *entonces* **Recortar** cancela los **2 más lejanos**.
  - *Entonces* los cancelados quedan `canceled` con motivo, visibles en "Cancelados", y **no** cuentan en calendario, Hoy ni dinero en la calle.
  - *Cuando* el sobrante es menor que un abono, *entonces* se reduce su `agreed_amount` y el valor anterior queda en `payment_event`.
  - *Cuando* elijo "Dejar como está", *entonces* la ficha muestra un aviso persistente.
  - *Dado* programados menores que el saldo, *entonces* no hay alerta, solo "sin programar".

## Dinero y Abibonos
- **RQ-DEP-01 [F1]** Veo lo **"Por entregar"** en Dinero: el total y su desglose en efectivo y transferencia.
- **RQ-DEP-02 [F1]** Armo un Abibono vinculando abonos `collected` y asignaciones de minibooks; efectivo/transferencia se autocalculan y son editables; el total no.
- **RQ-DEP-03 [F1]** Esperado vs. entregado y diferencia siempre visibles; nota obligatoria si ≠ 0.
  - *Dado* abonos por 100.000 y entrega 95.000, *entonces* diferencia −5.000 y no se confirma sin nota.
- **RQ-DEP-04 [F1]** Sin recibo no se confirma; con recibo, los abonos pasan a `delivered`. Una foto por defecto, "Añadir otra" disponible.
- **RQ-DEP-05 [F1]** Un Abibono sin abonos vinculados (donación) es válido con nota.
- **RQ-DEP-06 [F1]** Un abono no puede estar en dos Abibonos; título y fecha son automáticos y editables.
- **RQ-DEP-07 [F1]** **Reabro** un Abibono confirmado con motivo obligatorio; vuelve a borrador, sus abonos a `collected`, y queda en el historial. Siempre puedo editar la nota y añadir fotos.

## Minibooks
- **RQ-MBK-01 [F1]** Registro ventas (título, cantidad, monto ≥ 0, método, fecha, nota) sin cliente; descuentan stock; sin stock se bloquea con atajo.
- **RQ-MBK-02 [F1]** No afectan libros vendidos, compra, venta al público, diferencia, dinero en la calle ni saldos.
- **RQ-MBK-03 [F1]** Asigno parte del dinero de una entrada a un Abibono; solo lo asignado suma a "Total abonado".
- **RQ-MBK-04 [F1]** Entrego un minibook con origen `client_credit`: reduce saldo a favor (monto ≤ saldo a favor), no es ingreso, no va a Abibono, descuenta stock.
- **RQ-MBK-05 [F1]** Totalizadores propios: vendidos, ingresos, costo, ganancia neta, entregado, stock.

## Calendario
- **RQ-CAL-01 [F1]** Tres tipos: abono programado, visita, capacitación; filtro por tipo; la semana empieza el domingo.
- **RQ-CAL-02 [F1]** Visitas con cliente opcional/etiqueta, hora opcional, estado; convertir visita en cliente.
- **RQ-CAL-03 [F1]** Capacitaciones con fecha y hora, lugar, notas.
- **RQ-CAL-04 [F1]** Recordatorios (inicio del día 07:00, 1 día, 1 semana, personalizado), sin valor por defecto, dentro de la app y descartables.
- **RQ-CAL-05 [F1]** **Hoy** resume cobros (hoy y vencidos), visitas, capacitaciones, recordatorios y meta.
- **RQ-CAL-06 [F2]** Push de recordatorios.
- **RQ-CAL-07 [F1]** **Hoy** muestra la tarjeta **"Por entregar"** (BR-CAL-08).
  - *Dado* abonos cobrados no entregados por 30.000 en efectivo y 20.000 por transferencia, *entonces* la cifra principal es **50.000** y el desglose muestra Efectivo 30.000 · Transferencia 20.000.
  - *Dado* 10.000 de esos abonos en un Abibono **borrador**, *entonces* siguen contando; *dado* que el Abibono se **confirma**, *entonces* dejan de contar.
  - *Dado* dinero de minibooks o abonos `canceled`, *entonces* **no** cuentan.
  - *Cuando* toco el ojo, *entonces* los montos se ocultan y la preferencia persiste en el dispositivo.
  - *Cuando* toco la tarjeta, *entonces* abre Dinero con el atajo a "Nuevo Abibono".
  - *Dado* total 0, *entonces* muestra "Nada por entregar".

## Totalizadores, metas y cuadre
- **RQ-TOT-01 [F1]** "Hacer inventario" con tabla por título, grupos y vistas Inventario/Todos.
  - *Entonces* `Recibidos = Vendidos + En físico + Con novedad + Perdidos + Devueltos` por título.
- **RQ-TOT-02 [F1]** Los 8 totalizadores con selector Todos | Culturales | Religiosos (1,4,5,6,7); 2,3,8 globales; minibooks aparte.
- **RQ-TOT-03 [F1]** Barra de meta (sin cifras) = Σ precio colportor de culturales vendidos ÷ meta.
  - *Dado* 1.000.000 de compra cultural y meta 4.000.000, *entonces* barra al 25 %.
- **RQ-TOT-04 [F1]** Cada totalizador es una pieza registrada (agregar/quitar con una línea).
- **RQ-TOT-05 [F1]** "Perdidos asumidos" y "A responder al líder" = Mi compra + perdidos.
  - *Dado* compra de vendidos 1.000.000 y 2 perdidos con precio colportor 40.000, *entonces* A responder = 1.080.000 y Mi compra sigue 1.000.000.
- **RQ-TOT-06 [F1]** **Copiar resumen** deja en el portapapeles un texto limpio del cuadre. (PDF y CSV: mejora futura.)

## Fotos, conexión y calidad
- **RQ-PHO-01 [F1]** Compresión obligatoria (WebP ≤1280 px ~150 KB) + miniatura; bucket privado con URLs firmadas.
- **RQ-PHO-02 [F1]** Alerta de uso al admin al 70 %.
- **RQ-OFF-00 [F1]** **Lectura sin conexión:** sin internet la app abre y permite consultar lo último sincronizado; para registrar exige conexión con mensaje claro.
- **RQ-QLT-01 [F1]** Mobile-first y legible en escritorio (menú lateral, tablas), estilo visual **Notion**, barra de vista idéntica en todos los módulos, íconos propios por sección (barra inferior solo con íconos en móvil).
- **RQ-QLT-02 [F1]** PWA instalable; despliegue en us-east-1 (Supabase) e iad1 (Vercel), elegidas midiendo la latencia (ADR-0002).
- **RQ-QLT-03 [F1]** Tooltips en: estados de abono, fecha acordada vs. real, diferencia, esperado vs. entregado, con novedad, saldo a favor, prospecto, antigüedad, Abibono ("Entrega al líder"), título vs. ejemplar.
- **RQ-QLT-04 [F1]** Backups cada 2 días al inicio, luego semanales, con guía de restauración probada; ping anti-pausa cada 3 días.
- **RQ-QLT-05 [F1]** COP enteros `$1.250.000`, zona America/Bogota, español, `dd/mm/aaaa`, tema claro/oscuro automático.
- **RQ-OFF-01 [F2]** Offline de escritura: base local, cola idempotente, cola de fotos, indicadores, número de ejemplar provisional.
- **RQ-LDR-01 [F3]** Vista de líder y transferencia de libros con aceptación del colportor.
