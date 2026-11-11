# HU-INV-04 · Lista de ejemplares

> **Épica:** Inventario · **Depende de:** HU-INV-01, HU-CLI-01 · **Reglas:** BR-COPY-12, BR-PRC-01/02, BR-GEN-14 · **Diseño:** "Inventario · Ejemplares", "Vendidos", "Con descuentos y aumentos", "Ordenar" (escritorio claro)

## Historia
**Como** colportor **quiero** ver todos mis ejemplares uno por uno, con su estado, cliente, precio y diferencia, y poder filtrarlos, ordenarlos y buscarlos **para** encontrar cualquier unidad y ver dónde di descuentos o aumentos.

## Contexto
- La lista **excluye minibooks** y ejemplares borrados (ronda 26).
- Cada fila muestra **una sola fecha**, la del orden elegido: Recibido → fecha de recibido; Vendido → fecha de venta (los no vendidos van al final, sin fecha); Título, Precio acordado y Diferencia → fecha de recibido.
- **Sin sumas de dinero** al pie: los totales viven en Hacer inventario.

## Alcance
- **Incluye:** lectura de la lista con vistas, conteos, filtro de estado, orden, búsqueda y fecha de fila.
- **No incluye:** el detalle de un ejemplar (HU-INV-05), paginación en el servidor (si algún día crece, la función pura se mueve a SQL sin cambiar el contrato).

## Contrato para el front
### Lecturas
- `useCopiesList({ view, statusFilter, search, sort })` →
  `{ counts: { all, inStock, sold, priceChanged }, rows: [{ copyId, titleName, number, status, customer: { id, name, avatarEmoji } | null, rowDate, receivedAt, soldAt, price, priceDelta | null, priceDiffers }] }`
  - `view`: `'all' | 'in_stock' | 'sold' | 'price_changed'` (Todos, En físico, Vendidos, Con descuentos y aumentos).
  - `statusFilter`: conjunto de `in_stock | sold | flagged | lost | returned_to_leader` (vacío = sin filtro).
  - `sort`: `{ key: 'received' | 'sold' | 'title' | 'agreed_price' | 'price_delta', dir: 'desc' | 'asc' }`; por defecto `received`, `desc` ("Mayor primero").
- La lógica vive en una función pura `buildCopiesListView(copies, titles, customers, params, today)`.

## Reglas (el sistema DEBE…)
- **R1.** `price` DEBE ser el precio acordado si el ejemplar está vendido; si no, su precio público copiado (referencia).
- **R2.** `priceDelta` DEBE existir solo en vendidos con precio distinto (BR-PRC-02).
- **R3.** `rowDate` DEBE seguir la regla de la fecha del orden elegido (Contexto).
- **R4.** En todo orden, los vacíos (p. ej. sin fecha de venta, sin precio acordado, sin diferencia) DEBEN ir al final en ambos sentidos (BR-GEN-14); desempate: título, luego número.
- **R5.** Los conteos de las pestañas NO DEBEN depender de la búsqueda ni del filtro de estado.
- **R6.** La búsqueda DEBE encontrar por título (sin tildes ni mayúsculas), por número (`12` o `#12`, coincidencia exacta del número) y por nombre del cliente.

## Criterios de aceptación
- **CA-1.** **Dado** "Psiconutrición #6" recibido el 20/10 y vendido el 02/11 a María Camila Henao por 93.000 (público 98.000), **cuando** la vista es Todos y el orden Recibido, **entonces** su fila tiene fecha 20/10/2026, precio 93.000 y diferencia −5.000.
- **CA-2.** **Dado** el mismo ejemplar y "Bebidas saludables #9" en físico (recibido 30/10), **cuando** el orden es Vendido (cualquier sentido), **entonces** Psiconutrición va antes y Bebidas va al final sin fecha.
- **CA-3.** **Dado** 46 ejemplares (21 en físico, 19 vendidos, 4 con precio distinto) y 15 minibooks, **cuando** se pide la lista, **entonces** los conteos son 46, 21, 19 y 4.
- **CA-4.** **Dado** la vista "Con descuentos y aumentos", **cuando** se pide, **entonces** solo aparecen vendidos con precio distinto.
- **CA-5.** **Dado** la búsqueda "corazon", **cuando** se pide, **entonces** aparecen los "Un corazón tranquilo"; con "#13" aparece solo el número 13; con "gloria" aparecen los vendidos a Gloria Inés Patiño.
- **CA-6.** **Dado** el filtro Estado = {Con novedad, Perdido}, **cuando** se pide Todos, **entonces** solo aparecen ejemplares en esos estados y los conteos de pestañas no cambian.
- **CA-7.** **Dado** el orden Diferencia "Menor primero", **cuando** se pide, **entonces** primero los descuentos más grandes, luego aumentos, y al final los que no tienen diferencia.

## Casos borde y errores
- Un ejemplar `returned_to_leader`, `lost` o `flagged` aparece en Todos, con su precio público como referencia y sin cliente.

## Datos
Sin cambios de esquema.

## Cómo se verifica
- **Dominio:** `buildCopiesListView` con todos los CA, incluidos los vacíos al final en ambos sentidos.

## Terminado cuando
Se cumple §10 de las reglas comunes.
