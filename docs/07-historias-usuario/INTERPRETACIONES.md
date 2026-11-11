# Interpretaciones tomadas al escribir las HU

Detalles que los docs no fijaban y que el asistente decidió al escribir las historias de usuario (2026-11-08). **No son reglas inventadas del negocio**: son la lectura más simple y coherente de las reglas existentes. El dueño puede **vetar cualquiera** antes de implementar; si lo hace, se corrige la HU y la regla, y se anota en el `DECISION-LOG`.

**Estado (2026-11-11, ronda 28): revisadas y confirmadas por el dueño.** Cambiaron I-06, I-08 y I-17; I-07 se eliminó (ver `DECISION-LOG`, ronda 28 y ADR-0047). Las demás quedan tal como están.

| ID | Qué se decidió | Dónde | Por qué |
|---|---|---|---|
| I-01 | "Última modificación" del cliente cambia con cobrar desde Dinero y con cambiar el precio de un libro desde Inventario; **no** cambia al confirmar ni reabrir un Abibono | Reglas comunes §6 | BR-CUS-16 habla de cambios en los datos del cliente; un Abibono es una operación de entrega, no de la ficha |
| I-02 | Posible duplicado = mismo teléfono (solo dígitos, sin el prefijo 57) o nombre igual sin tildes, o muy parecido (umbral que fija la HU); incluye archivados | HU-CLI-02 | BR-CUS-11 dice "mismo teléfono o nombre casi idéntico" sin más detalle |
| I-03 | El back no impone el tiempo del aviso "Deshacer" (lo controla el front, 6 s configurables) | HU-INV-07, HU-INV-08 | "Unos segundos" es comportamiento de pantalla |
| I-04 | Borrar un borrador de Abibono elimina también sus fotos de recibo (filas y archivos) | HU-DIN-04 | Es la única eliminación física (BR-DEP-10); dejar fotos sin dueño gastaría espacio |
| I-05 | No hay limpieza automática de archivos sin usar (fotos borradas lógicamente, o un recibo subido a un Abibono que nunca se guardó) | HU-BASE-05, HU-DIN-04 | Es poco espacio; una limpieza programada puede agregarse después sin cambiar nada |
| I-06 | El primer abono sugerido es el día de pago **siguiente** a hoy, aunque sea mañana; en semanal, hoy + 7 días. Cada fecha siguiente es el siguiente día de pago posterior a la anterior, **sin separación mínima** (ronda 28, ADR-0047) | HU-ABO-03 | "El 15 o el 30 más cercano" (ronda 26); el cliente suele decir «paso mañana y te pago». Es solo una sugerencia editable |
| ~~I-07~~ | **Eliminada en la ronda 28:** no hay separación mínima entre abonos sugeridos | HU-ABO-03 | El dueño: no importa que los pagos queden seguidos |
| I-08 | Cambiar la fecha de un abono mueve **solo ese abono**, al crear y con el cliente guardado; no existe «Correr también los siguientes». Al crear el cliente, cambiar frecuencia, valor o primer abono del plan sí **recalcula** todos los abonos (ronda 28, ADR-0047) | HU-ABO-03, HU-ABO-04, HU-ABO-05 | El dueño: mover fechas no debe pasar automáticamente; el plan se recalcula porque el cliente aún se está creando |
| I-09 | La nueva fecha de una prórroga, además de ser posterior a la actual, no puede ser anterior a hoy | HU-ABO-05, BR-PAY-06 | Extiende la decisión "no aceptar fechas pasadas" (Q47): un abono prorrogado no debe nacer vencido |
| I-10 | Columna "Libro(s)" = título del ejemplar vendido más reciente, y "+N" = los demás vendidos | HU-CLI-04 | BR-CUS-13 dice "título del más reciente; si hay varios, +N" |
| I-11 | Porcentajes de Dinero: enteros que suman siempre 100 (método del resto mayor). "Abonado el N %" de la ficha: redondeo hacia abajo, tope 100 | HU-DIN-02, HU-CLI-01 | El diseño muestra 52 / 14 / 34; nunca debe verse 101 % |
| I-12 | Los conteos de las pestañas (Clientes, Ejemplares, Dinero) no cambian con la búsqueda ni con los filtros | HU-CLI-04, HU-INV-04, HU-DIN-03 | Así el conteo dice cuántos hay en esa vista, no cuántos coinciden |
| I-13 | La búsqueda de clientes actúa dentro de la pestaña actual; en Todos incluye los prospectos que coinciden aunque "Incluir prospectos" esté apagado | HU-CLI-05 | BR-CUS-14: el prospecto está "oculto en las listas, visible en la búsqueda" |
| I-14 | Con algún estado marcado en el filtro, los prospectos no aparecen | HU-CLI-04 | Los prospectos no tienen estado (BR-CUS-13) |
| I-15 | A un cliente archivado no se le asignan libros ni se le registran cobros nuevos (primero se restaura); sí se pueden corregir sus cobros existentes | HU-CLI-09, HU-ABO-02 | Archivado = "nada pendiente" (BR-CUS-09); sus cobros siguen en Dinero (AF-47) |
| I-16 | Libros en físico muestra títulos desactivados que aún tienen ejemplares; Agregar al inventario solo muestra activos | HU-INV-03, HU-INV-02 | BR-TIT-03 y AF-55 |
| I-17 | "Por resolver" se ordena de la novedad **más nueva a la más antigua** (ronda 28) | HU-INV-03 | Decisión del dueño |
| I-18 | El sufijo " (2)" del título automático del Abibono cuenta los Abibonos no borrados con la misma fecha | HU-DIN-01 | BR-DEP-02 "si ya existe otro ese día" |
| I-19 | Disparadores de la alerta de abonos que no cuadran: la cuota inicial o quitar un libro **durante la creación** muestran franja; registrar un cobro en un cliente guardado y **cobrar más de lo acordado** abren el modal; "Revisar" usa "más lejano" y motivo `manual` | HU-ABO-07 | BR-PAY-13 lista los disparadores; AF-21 pide modal para el cobro mayor; la franja de creación sigue la ronda 22 |
| I-20 | Agregar un libro nunca genera la alerta (la deuda sube) | HU-CLI-09 | Solo puede generar "sin programar" |
| I-21 | El "último punto elegido" del selector de ubicación se guarda en el dispositivo | HU-CLI-06 | BR-CUS-08 no dice dónde; no necesita viajar al servidor |
| I-22 | WhatsApp: `https://wa.me/57` + los 10 dígitos del celular (o los dígitos tal cual si ya traen indicativo) | HU-CLI-12 | Los clientes son de Colombia |
| I-23 | La búsqueda de ejemplares por número es exacta (`12` o `#12`) | HU-INV-04 | Buscar "1" no debe traer el 10, 11, 12… |
| I-24 | En la ficha, los abonos van por fecha ascendente (real si está cobrado, acordada si está por cobrar) | HU-CLI-12 | Coincide con el diseño (03/10, 17/10, 31/10, 14/11) |
| I-25 | Durante la creación, reemplazar el plan borra los programados anteriores sin dejar evento (nunca existieron para el cliente) | HU-ABO-03 | El plan aún se está armando; no es una cancelación |
| I-26 | "Borrar" un programado (error de registro, no queda rastro visible) y "Cancelar" (queda en Cancelados) son acciones distintas | HU-ABO-04 | BR-PAY-11 permite borrar; BR-PAY-13 define cancelar con motivo |
| I-27 | En un Abibono confirmado la nota no puede quedar vacía si la diferencia no es 0 | HU-DIN-05 | Mantiene BR-DEP-06 después de confirmar |
