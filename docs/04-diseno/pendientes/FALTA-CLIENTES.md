# Clientes: lo que falta por diseñar

Reglas de Clientes que el back cubre (ADR-0041) y que no tienen pantalla en el diseño del 05/11/2026. Al diseñarlas, marcar aquí como resueltas.

| # | Qué falta | Dónde iría | Regla |
|---|---|---|---|
| FC-01 | Confirmación de **Descartar** (con lo que se perderá: "Se quitarán 2 libros y 1 abono"; sin nada: "Se quitará este cliente") y el aviso cuando el descarte se rechaza porque un abono ya está en un Abibono | Crear cliente | BR-CUS-14, AF-112 |
| FC-02 | **Selector de emoji** del avatar (abrir, elegir, quitar) | Ficha y Crear | BR-CUS-15 |
| FC-03 | Aviso no bloqueante de **posible duplicado** ("¿Es la misma persona?") con acceso al existente | Crear cliente | BR-CUS-11, AF-70 |
| FC-04 | Franja **"Aún no tiene libro"** | Ficha y Crear | BR-PAY-14, AF-107 |
| FC-05 | Franja persistente **"Lo programado supera el saldo en $X · Revisar"** y el **modal** (saldo restante, total programado, sobrante, lista con casillas; Recortar automáticamente / Cancelar los que marque / Dejar como está, este último solo si aún debe) | Ficha, Crear, tras cobrar en Dinero | BR-PAY-13, F-29 |
| FC-06 | *(Programado sin diseño propio, ronda 40: `ReturnBookDialog` con el Diálogo y la Selección de la biblioteca; falta dibujarlo en el lienzo.)* **Devolver un libro** de un cliente guardado: motivo (*El cliente lo devolvió* por defecto / *Me equivoqué de cliente o de registro*) y confirmación ("los abonos y los Abibonos no cambian"); también desde el ejemplar vendido | Ficha (botón "−" y "Más acciones") e Inventario · Ejemplar | BR-COPY-09, F-16 |
| FC-07 | **Saldo a favor** en la ficha, con su nota ("No hay reembolsos") | Ficha | BR-CUS-06 |
| FC-08 | **Saldo sin programar** y **fecha(s) de venta** en la ficha | Ficha | BR-CUS-10 |
| FC-09 | Formulario **"Registrar abono"** (cuota inicial o abono extra: valor, método con Transferencia por defecto, fecha) | Ficha (el botón existe, el formulario no) | BR-PAY-01/03/04 |
| FC-10 | **"Programar abono"** en un cliente ya guardado: plan (reparte solo lo sin programar) o un abono suelto | Ficha (el enlace existe, el formulario no) | BR-PAY-15/16 |
| FC-11 | **Editar** y **borrar** un abono; **cancelar** uno por cobrar | Ficha | BR-PAY-11/13 |
| FC-12 | **Prórroga** ("Dar más plazo"): nueva fecha, nota opcional, confirmación si pasa de 2 meses, fecha original tachada e historial de prórrogas | Ficha | BR-PAY-06, F-14 |
| FC-13 | Contenido de la sección plegable **Cancelados** | Ficha | BR-CUS-10 |
| FC-14 | **Archivar** (con confirmación de que se cancelarán los abonos programados) y **Restaurar** desde Archivados; etiqueta "(cliente archivado)" | Ficha ("Más acciones") y lista | BR-CUS-09, F-27 |
| FC-15 | Edición de datos de un cliente **ya guardado** (el enlace "Editar" existe) | Ficha | BR-CUS-01 |
| FC-16 | Campo para pegar el **enlace de Maps** a mano | Ficha y Crear (Dirección) | BR-CUS-08 |
| FC-17 | **Varias facturas** por cliente, **varias fotos** por factura, **borrar** una foto de factura o de información | Ficha y Crear | BR-CUS-17, BR-PHO-03 |
| FC-18 | Estados de la ficha: sin conexión, error al guardar con reintento | Ficha y Crear | BR-GEN-08, AF-91 |
| FC-19 | **Visitas** ("Agendar visita"): formulario y estados. **Pospuesto** con el módulo Calendario (ADR-0041); la sección se oculta hasta entonces | Ficha y Crear | BR-CAL-02 |
| FC-20 | **Entregar un minibook** por saldo a favor. **Pospuesto** con el módulo Minibooks | Ficha | BR-MBK-07 |
