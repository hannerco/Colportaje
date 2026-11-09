# HU-CLI-04 · Lista de clientes

> **Épica:** Clientes · **Depende de:** HU-CLI-01, HU-ABO-01 · **Reglas:** BR-CUS-05/13, BR-GEN-14, BR-GOAL-03 (#8) · **Diseño:** "Escritorio · lista", "filtro de estado", "orden", "filtros activos", "vacío", "sin resultados" (escritorio claro); "Orden · chip de orden con acento + sentido segmentado"

## Historia
**Como** colportor **quiero** ver mis clientes con lo que me deben, su último abono y su estado, por pestañas, filtros y orden **para** saber a quién cobrar primero.

## Contexto
- Pestañas: **Todos**, **Deudores** (Vencido + Pagando), **Saldados**, **Archivados**, cada una con su conteo (BR-CUS-05).
- Los **prospectos** están ocultos salvo el interruptor "Incluir prospectos", que aplica **solo en Todos** (ronda 26). El diseño los muestra sin el interruptor: contradicción C-03.
- "Mayor deuda" ordena por **saldo pendiente**; "Próximo abono" incluye los vencidos; los vacíos van al final (ronda 26).
- Columnas de escritorio: Cliente, Teléfono, Libro(s), Saldo pendiente, **Último abono** y Estado.

## Alcance
- **Incluye:** el modelo de vista de la lista (pestañas, conteos, filtro de estado con sus conteos, interruptor de prospectos, orden con sentido, indicador de "vista por defecto" para el botón Restablecer).
- **No incluye:** la búsqueda (HU-CLI-05, que se combina con esta lectura), la ficha (HU-CLI-12).

## Contrato para el front
### Lecturas
- `useCustomerList({ tab, includeProspects, statusFilter, sort, search? })` →
  `{ counts: { all, debtors, settled, archived }, statusCounts: { current, overdue, settled }, isDefaultView, rows: [{ id, name, avatarEmoji, phone, books: { title, extraCount } | null, isProspect, balance, credit, lastPaymentAt, standing, archived }] }`
  - `tab`: `'all' | 'debtors' | 'settled' | 'archived'`; `statusFilter`: subconjunto de `current | overdue | settled`; `sort`: `{ key: 'recent' | 'modified' | 'name' | 'balance' | 'next_due', dir }`.
  - Por defecto: `tab = 'all'`, `includeProspects = false`, sin filtro, `sort = recent desc`.
- La lógica vive en una función pura `buildCustomerListView(customers, accounts, params, today)`.

## Reglas (el sistema DEBE…)
- **R1.** **Todos** DEBE incluir los clientes no archivados con al menos una venta y, si el interruptor está activo, también los prospectos no archivados. **Deudores** = estado `overdue` o `current`; **Saldados** = `settled`; **Archivados** = todos los archivados (con o sin venta). Nunca los descartados.
- **R2.** Los conteos de pestañas DEBEN calcularse sin búsqueda ni filtro de estado; el de Todos respeta el interruptor de prospectos (es el número junto al título "Clientes").
- **R3.** El filtro de estado DEBE combinarse con la pestaña; con algún estado marcado, los prospectos no aparecen (no tienen estado). `statusCounts` cuenta los clientes no archivados por estado.
- **R4.** Orden: `recent` = fecha de creación; `modified` = `updated_at`; `name` = nombre en español sin tildes; `balance` = saldo pendiente; `next_due` = `nextDueDate`. Sentidos por defecto: recent/modified/balance descendente, name/next_due ascendente. Vacíos al final en ambos sentidos; desempate por nombre (BR-GEN-14).
- **R5.** `books` DEBE ser el título del ejemplar vendido más reciente y `extraCount` = número de los demás ejemplares vendidos; `null` en prospectos.
- **R6.** `isDefaultView` DEBE ser falso si el orden, su sentido, el filtro o el interruptor difieren del valor por defecto.

## Criterios de aceptación
- **CA-1.** **Dado** 10 clientes no archivados con venta (6 Pagando, 3 Vencido, 1 Saldado), 3 archivados y 2 prospectos, **cuando** se pide por defecto, **entonces** `counts = { all: 10, debtors: 9, settled: 1, archived: 3 }`, `statusCounts = { current: 6, overdue: 3, settled: 1 }`, los prospectos no aparecen y `isDefaultView = true`. *(Los conteos del diseño son de muestra y no cuadran entre sí; no se usan como datos de prueba.)*
- **CA-2.** **Dado** "Incluir prospectos" activo, **cuando** la pestaña es Todos, **entonces** aparecen los 2 prospectos con `books = null`, `standing = null` y `counts.all` sube en 2; **cuando** la pestaña es Deudores, **entonces** no aparecen.
- **CA-3.** **Dado** María Camila Henao con 3 libros (el más reciente "Las bellas historias de la Biblia"), **entonces** `books = { title: "Las bellas historias de la Biblia", extraCount: 2 }`.
- **CA-4.** **Dado** saldos 380.000, 260.000 y 0, **cuando** el orden es "Mayor deuda" descendente, **entonces** salen en ese orden; en ascendente, 0, 260.000, 380.000.
- **CA-5.** **Dado** un cliente sin abonos por cobrar, **cuando** el orden es "Próximo abono" en cualquier sentido, **entonces** queda al final.
- **CA-6.** **Dado** el filtro {Vencido, Saldado}, **cuando** se pide Todos, **entonces** solo salen clientes en esos estados y los conteos de pestañas no cambian.
- **CA-7.** **Dado** un cliente con cuota inicial cobrada el 01/10 y un abono cobrado el 22/10, **entonces** `lastPaymentAt` = 22/10/2026.

## Casos borde y errores
- Lista vacía: filas vacías y conteos en 0 (el front muestra el estado vacío).
- Un cliente con saldo a favor muestra `balance` negativo y `credit` > 0; su estado es Saldado.

## Datos
Sin cambios de esquema. Los clientes se cargan completos para trabajar sin conexión (ARCHITECTURE §5).

## Cómo se verifica
- **Dominio:** `buildCustomerListView` con todos los CA, incluidos los vacíos al final en ambos sentidos.

## Terminado cuando
Se cumple §10 de las reglas comunes.
