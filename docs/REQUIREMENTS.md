# Requisitos funcionales y criterios de aceptación

Formato: `RQ-<área>-NN` · fase `[F1]/[F2]/[F3]` · historia · **criterios de aceptación** (Dado/Cuando/Entonces). Cada criterio debe tener al menos una prueba (`TESTING.md`). Reglas completas en `BUSINESS-RULES.md`; flujos en `FLOWS.md`.

## Acceso y roles
- **RQ-ACC-01 [F1]** Como invitado, entro con correo+contraseña.
  - *Dado* un usuario invitado, *cuando* inicia sesión, *entonces* ve **Hoy**. *Dado* alguien sin invitación, *entonces* no puede registrarse.
- **RQ-ACC-02 [F1]** Como admin, conmuto el modo administrador en Ajustes.
  - *Dado* un usuario sin rol admin, *entonces* no ve el conmutador y las escrituras admin son rechazadas por el servidor.
- **RQ-ACC-03 [F1]** Cada colportor solo ve sus datos.
  - *Dado* dos usuarios A y B, *cuando* A consulta cualquier tabla, *entonces* nunca recibe filas de B (prueba RLS).
- **RQ-ACC-04 [F1]** Como admin veo "Cómo invitar a alguien" y la lista de usuarios con rol.

## Catálogo
- **RQ-TIT-01 [F1]** Como admin creo/edito/desactivo Títulos con todos sus campos.
  - *Dado* un título minibook, *entonces* el precio público es opcional; *dado* cultural/religioso, *entonces* es obligatorio y > 0.
  - *Cuando* desactivo un título con ejemplares, *entonces* no aparece al agregar a inventario y sus ejemplares siguen intactos.
- **RQ-TIT-02 [F1]** Existe un script de carga inicial del catálogo (idempotente).
- **RQ-TIT-03 [F1]** Como admin edito la meta de bonificación, los umbrales de antigüedad y el máximo de favoritos, con valores por defecto 4.000.000, `[2,6,12]` y 6.

## Inventario y ejemplares
- **RQ-INV-01 [F1]** Agrego un ejemplar con un toque desde un favorito o desde la lista.
  - *Cuando* toco el favorito "Corazón tranquilo" 3 veces, *entonces* hay 3 ejemplares con números consecutivos y precios copiados del título.
- **RQ-INV-02 [F1]** Marco/desmarco favoritos (máx. 6). *Dado* 6 favoritos, *cuando* marco el séptimo, *entonces* se rechaza con aviso.
- **RQ-INV-03 [F1]** Veo mis libros en físico por título con cantidad e icono de antigüedad; minibooks al final; "Por resolver" aparte.
  - *Dado* un ejemplar recibido hace 0/2/3/6/7/12/13 días, *entonces* su etapa es reciente/reciente/normal/normal/envejeciendo/envejeciendo/antiguo (con los umbrales por defecto).
- **RQ-INV-04 [F1]** Veo todos los ejemplares en 4 vistas (Todos, En inventario, Vendidos, Con descuentos y aumentos) con orden y búsqueda.
- **RQ-INV-05 [F1]** Edito el precio acordado de un ejemplar vendido y veo Precio distinto y Diferencia.
  - *Dado* precio público 50.000 y acordado 45.000, *entonces* precio_distinto = sí, diferencia = −5.000 (descuento). *Dado* 55.000, *entonces* +5.000 (aumento).
- **RQ-INV-06 [F1]** Marco un ejemplar "Con novedad" (nota obligatoria) y lo resuelvo (Apareció / Perdido / Corregido).
  - *Dado* un ejemplar `flagged`, *entonces* no cuenta en "en físico". *Cuando* se resuelve "Perdido", *entonces* queda `lost` y cuenta en "Perdidos".
- **RQ-INV-07 [F1]** Devuelvo un ejemplar vendido al inventario sin alterar abonos ni Abibonos.
  - *Dado* un cliente con un solo ejemplar a 50.000 que ya pagó 30.000 (de los cuales 30.000 ya están en un Abibono confirmado), *cuando* se devuelve el ejemplar, *entonces* la deuda es 0, los abonos siguen siendo 30.000, el Abibono no cambia, el saldo es −30.000 y la ficha muestra **Saldo a favor 30.000**.
  - *Dado* ese cliente con otro ejemplar de 20.000 también vendido, *cuando* se devuelve solo el de 50.000, *entonces* deuda = 20.000, abonos = 30.000, saldo a favor = 10.000.

## Clientes
- **RQ-CUS-01 [F1]** Creo clientes con o sin libros (prospectos).
  - *Dado* un cliente sin ejemplares, *entonces* es prospecto y no aparece en listas por defecto ni en "Total clientes".
- **RQ-CUS-02 [F1]** La ficha muestra deuda, abonos, saldo pendiente/a favor, fechas de venta derivadas, facturas, fotos, visitas.
- **RQ-CUS-03 [F1]** Listas Recientes (creación desc.), Deudores (saldo > 0), Todos; interruptor "Incluir prospectos".
- **RQ-CUS-04 [F1]** Búsqueda local difusa sobre nombre, teléfono, información, dirección.
  - *Dado* "Marìa Gomes" escrito con error/acento, *cuando* busco "maria gomez", *entonces* aparece.
- **RQ-CUS-05 [F1]** Dirección con texto + enlace Maps + botón "Abrir en Maps" + mapa embebido que carga al tocar.
- **RQ-CUS-06 [F1]** Elimino un cliente solo si no tiene ejemplares vendidos; sus abonos/visitas permanecen con la etiqueta "(cliente eliminado)".

## Vender
- **RQ-SAL-01 [F1]** Flujo **+ Vender** de un solo camino (cliente buscar/crear → ejemplares uno por uno → cuota inicial y abonos programados → foto de factura).
  - *Entonces* los ejemplares quedan `sold` con `customer_id`, `sold_at`, `agreed_price = precio público`; la cuota inicial queda `collected`; los programados `scheduled`.
- **RQ-SAL-02 [F1]** Un cliente existente puede recomprar: se agregan ejemplares y abonos al mismo cliente y el saldo se recalcula.
- **RQ-SAL-03 [F1]** No puedo vender ejemplares que no estén `in_stock`.

## Abonos
- **RQ-PAY-01 [F1]** Registro cuota inicial, abono programado y abono extra.
- **RQ-PAY-02 [F1]** Cobro un abono programado con monto/fecha reales y método.
  - *Dado* acordado 50.000 y pagado 30.000, *entonces* queda `collected` por 30.000, el saldo del cliente conserva 20.000 y se **sugiere** (no se crea) otro abono.
- **RQ-PAY-03 [F1]** Doy prórroga: `original_due_date` no cambia, `due_date` sí, se inserta historial.
  - *Cuando* aplazo dos veces, *entonces* hay 2 filas de historial y la fecha original sigue siendo la primera.
- **RQ-PAY-04 [F1]** Abonos vencidos se resaltan en Hoy y calendario.
- **RQ-PAY-05 [F1]** Un abono en un Abibono confirmado está bloqueado (no se edita/borra).

## Dinero y Abibonos
- **RQ-DEP-01 [F1]** Veo "En mi poder" separado en efectivo y transferencia.
- **RQ-DEP-02 [F1]** Armo un Abibono vinculando abonos `collected` y asignaciones de minibooks; efectivo/transferencia se autocalculan y son editables; el total no.
- **RQ-DEP-03 [F1]** Esperado vs. entregado y diferencia siempre visibles; nota obligatoria si ≠ 0.
  - *Dado* abonos por 100.000 y entrega 95.000 efectivo, *entonces* diferencia −5.000 y no se puede confirmar sin nota.
- **RQ-DEP-04 [F1]** Sin recibo no se confirma; con recibo, los abonos pasan a `delivered`.
- **RQ-DEP-05 [F1]** Un Abibono sin abonos vinculados (donación) es válido con nota.
- **RQ-DEP-06 [F1]** Un abono no puede estar en dos Abibonos; el título y la fecha son automáticos y editables.

## Minibooks
- **RQ-MBK-01 [F1]** Registro entradas (título, cantidad, monto ≥ 0, método, fecha, nota) sin cliente; descuentan stock; sin stock se bloquea con atajo.
- **RQ-MBK-02 [F1]** No afectan libros vendidos, compra, venta al público, diferencia, dinero en la calle ni saldos.
- **RQ-MBK-03 [F1]** Asigno parte del dinero de una entrada a un Abibono; solo lo asignado suma a "Total abonado".
- **RQ-MBK-04 [F1]** Entrego un minibook con origen `client_credit`: reduce saldo a favor, no es ingreso, no va a Abibono, sí descuenta stock.
- **RQ-MBK-05 [F1]** Totalizadores propios: vendidos, ingresos, costo, ganancia neta, entregado, stock.

## Calendario
- **RQ-CAL-01 [F1]** Tres tipos: abono programado, visita, capacitación; filtro por tipo.
- **RQ-CAL-02 [F1]** Visitas con cliente opcional/etiqueta, hora opcional, estado; convertir visita en cliente.
- **RQ-CAL-03 [F1]** Capacitaciones con fecha y hora, lugar, notas.
- **RQ-CAL-04 [F1]** Recordatorios (inicio del día, 1 día, 1 semana, personalizado) mostrados dentro de la app y descartables.
- **RQ-CAL-05 [F1]** **Hoy** resume cobros (hoy y vencidos), visitas, capacitaciones, recordatorios y meta.
- **RQ-CAL-06 [F2]** Push de recordatorios.

## Totalizadores y metas
- **RQ-TOT-01 [F1]** "Hacer inventario" con tabla por título, grupos y vistas Inventario/Todos.
  - *Entonces* `Recibidos = Vendidos + En físico + Con novedad + Perdidos` por título.
- **RQ-TOT-02 [F1]** Los 8 totalizadores con selector Todos | Culturales | Religiosos (1,4,5,6,7); 2,3,8 globales; minibooks aparte.
- **RQ-TOT-03 [F1]** Barra de meta (sin cifras) = Σ precio colportor de culturales vendidos ÷ meta.
  - *Dado* 1.000.000 de compra cultural y meta 4.000.000, *entonces* barra al 25 %.
- **RQ-TOT-04 [F1]** Cada totalizador es una pieza registrada (agregar/quitar con una línea).

## Fotos y calidad
- **RQ-PHO-01 [F1]** Compresión obligatoria (WebP ≤1280 px ~150 KB) + miniatura; bucket privado con URLs firmadas.
- **RQ-PHO-02 [F1]** Alerta de uso al admin al 70 %.
- **RQ-QLT-01 [F1]** Mobile-first y legible en escritorio (menú lateral, tablas).
- **RQ-QLT-02 [F1]** PWA instalable; despliegue en regiones São Paulo.
- **RQ-QLT-03 [F1]** Tooltips en: estados de abono, fecha acordada vs. real, diferencia, esperado vs. entregado, con novedad, saldo a favor, prospecto, antigüedad.
- **RQ-QLT-04 [F1]** Backups semanales y guía de restauración.
- **RQ-QLT-05 [F1]** COP enteros con formato `$1.250.000`, zona America/Bogota, solo español.
- **RQ-OFF-01 [F2]** Offline: base local, cola de escrituras idempotente, cola de fotos, indicadores de sincronización.
- **RQ-LDR-01 [F3]** Vista de líder y transferencia de libros con aceptación del colportor.
