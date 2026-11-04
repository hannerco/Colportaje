# ADR-0038: Guardado, resumen y descarte de la ficha de cliente nueva
Estado: Aceptado · Fecha: 2026-11-04

## Contexto
ADR-0035 definió la ficha viva: se guarda sola y el nombre es lo único obligatorio. El diseño de Claude Design (módulo Clientes, Crear) añadió un borrador guardado, botones "Cancelar / Guardar cliente" y una pantalla final "Antes de guardar". El dueño decidió conservar el guardado automático, **mantener** esos botones con otro sentido y renombrar la pantalla final a **"Resumen"**. También aparecieron campos nuevos: N.º y fecha de factura, y la fecha de factura automática.

## Decisión
- El cliente **existe desde que tiene nombre** (ADR-0035) y aparece en la lista con el indicador "Borrador guardado". Todo se guarda solo.
- **"Guardar cliente"** (cabecera y Resumen) no escribe nada nuevo: **confirma que se terminó y cierra** la ficha. Deshabilitado sin nombre. **"Seguir editando"** vuelve a la ficha desde el Resumen. Si se cierra la app sin tocar ningún botón, el cliente queda guardado como está.
- **"Descartar"** (cabecera) elimina al cliente recién creado: devuelve sus libros al inventario y quita sus abonos y fotos, tras una **confirmación** que resume lo que se pierde. Solo existe **hasta tocar "Guardar cliente"**; después se usa **Archivar** (BR-CUS-09), que no aparece mientras se crea.
- **"Resumen"** muestra de un vistazo qué información se metió y cuál falta; no bloquea nada.
- **Factura:** N.º de factura de texto opcional; fecha de factura opcional, por defecto el día en que se agrega la foto (America/Bogota), editable (BR-CUS-17). Se guardan en `photo` (kind `customer_invoice`).
- **Última modificación** (`customer.updated_at`, BR-CUS-16) es criterio de orden de la lista; se actualiza con cualquier cambio de la ficha y no con cambios automáticos.

## Alternativas descartadas
- *Borrador invisible hasta "Guardar cliente"*: contradice "se guarda sola" y exige definir dónde se recupera un borrador abandonado.
- *Sin botón de guardar*: el dueño quiere un cierre explícito.
- *Archivar durante la creación*: el cliente apenas se está creando; el descarte es lo natural.

## Consecuencias
- Una operación de dominio "descartar cliente nuevo" que revierte libros y abonos (AF-112); debe ser atómica.
- `photo` suma `invoice_number` y `invoice_date` (solo `customer_invoice`).
- Pruebas: descartar con libros y abonos, sin nada, y después de "Guardar cliente".

## Referencias
BR-CUS-14, BR-CUS-16, BR-CUS-17 · AF-112 · RQ-SAL-05 · DECISION-LOG ronda 19 · ADR-0035
