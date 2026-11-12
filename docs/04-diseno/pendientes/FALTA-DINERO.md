# Dinero: lo que falta por diseñar

Reglas de Dinero que el back cubre (ADR-0041) y que no tienen pantalla en el diseño del 05/11/2026. El dueño no alcanzó a cerrar Dinero (se quedó sin tokens): la referencia es la «Exploración elegida».

| # | Qué falta | Dónde iría | Regla |
|---|---|---|---|
| FD-01 | **Quinta pestaña "Cancelados"** | Dinero · Abonos de clientes | BR-DEP-14, ADR-0046 |
| FD-02 | Aplicar la exploración elegida a **todas** las vistas y estados (Por cobrar, Por entregar, Entregados, Abibonos, cargando, vacío, sin conexión) | Dinero | BR-DEP-14 |
| FD-03 | Menú **Ordenar** (Abonos: fecha acordada, fecha real, valor acordado, valor real, cliente; Abibonos: fecha, total, nombre) | Dinero | BR-DEP-14 |
| FD-04 | Menú del filtro **Método** abierto | Dinero | BR-DEP-14 |
| FD-05 | Abrir, editar y **borrar un borrador** de Abibono | Dinero · Abibonos | BR-DEP-10 |
| FD-06 | Etiqueta **"(cliente archivado)"** en abonos cobrados de clientes archivados | Dinero · Abonos de clientes | BR-CUS-09, AF-47 |
| FD-07 | Cobro **mayor** al acordado que dispara el modal de abonos que no cuadran | Dinero · Cobrar | BR-PAY-13, AF-21 |
| FD-08 | Error al confirmar un Abibono (falta recibo, falla la subida) | Nuevo Abibono | BR-DEP-09, AF-92 |
| FD-09 | **Dinero en móvil** (no está diseñado; tampoco en oscuro) | Dinero | — |
| FD-10 | Sección **Minibooks** de Nuevo Abibono: existe en el diseño, pero queda **oculta** hasta el módulo Minibooks | Nuevo Abibono | BR-MBK-06, ADR-0041 |
| FD-11 | **Nombre automático «Abibono (n)»** en lugar de «Abibono – fecha» (ronda 29): actualizar la lista de Abibonos y Nuevo Abibono; en borradores sin número, el nombre es solo una sugerencia | Dinero · Abibonos, Nuevo Abibono | BR-DEP-02 |
