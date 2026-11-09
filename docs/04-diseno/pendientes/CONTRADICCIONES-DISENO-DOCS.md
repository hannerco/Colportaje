# Contradicciones entre el diseño y los docs

Lo que el diseño exportado (05/11/2026) muestra distinto de los docs. En todos los casos de la tabla principal **mandan los docs** con las decisiones de la ronda 26: el diseño se debe corregir. Los nombres de pantalla son los del lienzo (y los archivos de `fuente/`).

## A corregir en el diseño

| # | Módulo · pantalla | El diseño muestra | Debe ser (docs) | Regla |
|---|---|---|---|---|
| C-01 | Clientes · Crear cliente (llena y vacía, escritorio y móvil) | Botón **"Cancelar"** en la cabecera | **"Descartar"** (secundario) con su confirmación | BR-CUS-14, ADR-0038 |
| C-02 | Clientes · Crear cliente | Indicador **"Borrador guardado"** | Sin indicador: un cliente con nombre ya existe | BR-CUS-14 (ronda 24) |
| C-03 | Clientes · Lista (escritorio) | El prospecto «Carlos Andrés Gómez» aparece en Todos sin activar "Incluir prospectos" | Prospectos ocultos salvo el interruptor, y solo en Todos | BR-CUS-05 |
| C-04 | Clientes · Ficha (escritorio) | Avatar con **iniciales "MH"** aunque el cliente tiene el emoji 📚 en la lista | Emoji del cliente o ícono de persona; nunca iniciales | BR-CUS-15 |
| C-05 | Clientes · Crear cliente | Botón "Agregar **ícono** o emoji" | Solo emoji (no hay íconos propios en la v1) | BR-CUS-15, ADR-0037 |
| C-06 | Clientes · Ficha | Cada abono programado dice **"Cuota quincenal"**; el Resumen dice "4 quincenales de $35.000" | La frecuencia no es una propiedad del abono y no se guarda; el texto no puede depender de ella | BR-PAY-15, ADR-0045 |
| C-07 | Clientes · Ficha | Abono vencido con el **monto en rojo** | El monto no va en rojo; lo marca el ícono y la fecha | BR-CUS-13 (ronda 24) |
| C-08 | Clientes · Ficha | **"Cobrar"** solo en el abono vencido | "Cobrar" en todo abono por cobrar | BR-PAY-05 |
| C-09 | Clientes · Crear (Cuota inicial) y Dinero · Cobrar | Método marcado por defecto: **Efectivo** | **Transferencia** por defecto, siempre | BR-PAY-04 |
| C-10 | Clientes · Crear (Factura) | N.º y fecha se escriben **sin foto**; la fecha aparece llena (03/11/2026) sin ninguna foto | Sin foto no hay factura: primero la foto; luego N.º y fecha (por defecto, el día de la foto). Varias facturas por cliente y varias fotos por factura | BR-CUS-17, ADR-0042 |
| C-11 | Clientes · Ficha y Crear | "Fotos" en la ficha y "Fotos de la casa" al crear | Un solo nombre para las fotos de información | BR-CUS-01 |
| C-12 | Inventario · Agregar (móvil) | Aviso "Un corazón tranquilo **#14 agregado** · Deshacer" en cada toque, como si ya se guardara | Por lote: nada se guarda ni se numera hasta "Agregar N" en el Resumen | BR-COPY-02, ADR-0043 |
| C-13 | Inventario · Ejemplares | La columna Fecha mezcla vendido y recibido y el botón dice "Orden: Recibido" | La fecha de la fila es la del orden elegido: Recibido → recibido; Vendido → vendido (no vendidos al final) | BR-COPY-12 |
| C-14 | Inventario · Ejemplar (escritorio) | "Recibido el" sin forma de editarlo (en móvil sí) | Editable en línea, de forma discreta | BR-COPY-04 |
| C-15 | Inventario · Por resolver | Sin campo de nota; Deshacer solo para "Apareció" | Nota opcional; Deshacer también para Perdido y Eliminar (y en el historial para Apareció y Perdido) | BR-COPY-11 |
| C-16 | Inventario · Ejemplar devuelto al líder | "Deshacer" sin pedir nota | Deshacer pide nota obligatoria | BR-COPY-16 |
| C-17 | Dinero · Abonos de clientes · Todos | Muestra un abono **Cancelado** y lo cuenta (Todos 64 = 23 + 6 + 34 + 1) | Los cancelados no van en Todos ni en su conteo; tienen su quinta pestaña "Cancelados" | BR-DEP-14, ADR-0046 |
| C-18 | Dinero · Por cobrar | Filtro "Método" visible (los abonos por cobrar no tienen método) | Oculto en Por cobrar y en Cancelados | BR-DEP-14 |
| C-19 | Dinero · pantallas que no son la exploración (Todos, Por entregar, Entregados, Por cobrar, Abibonos, estados) | Barra de 3 tramos, botón "Nuevo Abibono" y Entregado en dorado | Lo de la exploración elegida: tarjeta "Por entregar (Cobrado)", medidor, tres tarjetas, "Dinero total", botón "Entregar al líder", Entregado en verde oscuro | BR-DEP-14, BR-PAY-02, ADR-0046 |
| C-20 | Dinero · Exploración elegida | Seis formas distintas de la pastilla "Entregado" en la misma tabla | Una sola forma (por elegir) | BR-PAY-02 |
| C-21 | Dinero · Exploración elegida frente a las demás | Vencido como fecha roja + "hace N días" (exploración) y como "Vencido · hace N días" bajo el estado (demás) | Una sola forma: la de la exploración | BR-PAY-08 |

## Resueltas cambiando los docs (no hay que tocar el diseño)
Para trazabilidad: en estos casos el diseño se aceptó y se actualizaron los docs en la ronda 26.

| Tema | Lo que se aceptó del diseño | Regla actualizada |
|---|---|---|
| Agregar libro en la ficha | Lista por ejemplar, sin agotados, ordenada por título y antigüedad | BR-COPY-06, ADR-0044 |
| Agregar al inventario | Por lote con Resumen; sin favoritos | BR-COPY-02, BR-INV-02, ADR-0043 |
| Devolver al líder | Por unidad (minibooks por cantidad) | BR-COPY-16 |
| Eliminar ejemplar en físico | Permitido (nota opcional) | BR-COPY-17 |
| Precio en Libros en físico | Precio de referencia por título | BR-INV-03, BR-GOAL-06 |
| Columna "Último abono" en Clientes | Aceptada | BR-CUS-04/05 |
| Dinero | Exploración elegida, "Dinero total", "Entregar al líder" | BR-DEP-14, ADR-0046 |
| Color de Entregado | Verde (cierra DT-11) | BR-PAY-02 |

## No son contradicciones
Los conteos de ejemplo no cuadran entre sí (p. ej. Deudores 21 frente a Pagando 18 + Vencido 15; Libros en físico 23 frente a la pestaña En físico 21; Por cobrar 23 con 8 filas). Son datos de muestra.
