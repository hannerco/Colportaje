# Glosario

**Fuente única de nombres.** UI y docs en español; código (tablas, variables, tipos, rutas internas) en inglés. 🔶 = nombre aún abierto a discusión con el dueño (dijo: "todos los nombres… vamos a discutirlos para escoger el que tenga más sentido y sea más fácil"). Para añadir un concepto, primero se añade aquí.

## Roles
| UI / docs | Código | Notas |
|---|---|---|
| Colportor | `colportor` | Vendedor de libros. Usuario de la v1 |
| Administrador | `admin` | Gestiona catálogo, ajustes, invitaciones. Modo conmutable en Ajustes |
| Líder | `leader` | Entrega libros y recibe dinero. **Fase 3** |

## Entidades
| UI / docs | Código (tabla) | Descripción |
|---|---|---|
| Cliente | `customer` | Persona a quien se vende o visita. Sin libros vendidos = prospecto (derivado) |
| Prospecto | *(derivado)* `is_prospect` | Cliente sin ejemplares vendidos |
| Título 🔶 | `title` | Un libro del catálogo (un registro por libro). Categoría cultural / religioso / minibook |
| Ejemplar 🔶 | `copy` | Una unidad física de un Título. Tiene `number` consecutivo por título y colportor |
| Número (de ejemplar) | `copy.number` | "Corazón tranquilo #12" |
| Abono | `payment` | Pago de un cliente (cuota inicial, programado o extra) |
| Prórroga | `payment_reschedule` | Cambio de fecha de un abono programado (historial) |
| Abibono 🔶 | `leader_deposit` | Entrega de dinero al líder, con recibo |
| Asignación de minibooks a un Abibono | `leader_deposit_minibook_allocation` | Cuánto de una entrada de minibooks se entrega |
| Entrada de minibooks 🔶 | `minibook_sale` | Venta en lote de un título minibook, sin cliente |
| Visita | `visit` | Cita para volver a ver a un cliente o prospecto (agregación) |
| Capacitación | `training` | Evento con una empresa, con fecha y hora |
| Recordatorio | `reminder` | Aviso de una visita o capacitación |
| Novedad | `copy_issue` | Descuadre de un ejemplar ("Con novedad") |
| Evento de ejemplar | `copy_event` | Historial (recibido, vendido, devuelto…) |
| Favorito | `title_favorite` | Título marcado para agregar a inventario con un toque |
| Foto | `photo` | Imagen de info de cliente, factura o recibo |
| Ajustes | `app_settings` | Meta de bonificación, umbrales de antigüedad, máx. favoritos |
| Meta (de bonificación) | `bonus_goal` | 4.000.000 por defecto, editable por admin |
| Perfil / Rol | `profile` / `user_role` | |

## Categorías de Título
| UI | Código | Ganancia orientativa | Cuenta para bonificación |
|---|---|---|---|
| Cultural | `cultural` | ~50 % | **Sí** |
| Religioso | `religious` | ~15 % | No |
| Minibook | `minibook` | libre (precio colportor bajo, ~1.500 o gratis) | No |

## Estados
| UI | Código | Entidad |
|---|---|---|
| En inventario | `in_stock` | `copy` |
| Vendido | `sold` | `copy` |
| **Con novedad** (antes "Sin resolver") | `flagged` | `copy` |
| Perdido | `lost` | `copy` |
| Por cobrar (antes "Sin reclamar") | `scheduled` | `payment` |
| Cobrado — *en mi poder* (antes "Reclamado") | `collected` | `payment` |
| Entregado al líder (antes "Entregado") | `delivered` | `payment` |
| Borrador / Confirmado | `draft` / `confirmed` | `leader_deposit` |
| Pendiente / Hecha / Cancelada | `pending` / `done` / `canceled` | `visit` |
| Apareció / Perdido / Corregido | `found` / `lost` / `corrected` | resolución de `copy_issue` |

## Tipos de abono (`payment.kind`)
| UI | Código | Nace |
|---|---|---|
| Cuota inicial | `down_payment` | cobrado |
| Abono programado | `scheduled` | por cobrar, con fecha |
| Abono extra | `extra` | cobrado, sin fecha acordada |

## Campos de abono
| UI | Código |
|---|---|
| Fecha acordada **inicial** | `original_due_date` (inmutable) |
| Fecha acordada (actual) | `due_date` (la del calendario) |
| Fecha real | `paid_at` |
| Valor acordado | `agreed_amount` |
| Valor real | `paid_amount` |
| Método de pago | `method`: `cash` (Efectivo) / `transfer` (Transferencia) |

## Campos de Abibono
| UI | Código |
|---|---|
| Título | `title` |
| Fecha | `deposit_date` |
| Efectivo | `cash_amount` |
| Transferencia | `transfer_amount` |
| Total | `total` (derivado) |
| Esperado | `expected` (derivado) |
| Diferencia | `difference` (derivado; + sobrante / − faltante) |
| Recibo | `photo` con `kind = deposit_receipt` |

## Campos de ejemplar
| UI | Código |
|---|---|
| Precio acordado | `agreed_price` |
| Precio público (congelado) | `public_price_snapshot` |
| Precio colportor (congelado) | `colportor_price_snapshot` |
| Fecha recibido | `received_at` |
| Fecha vendido | `sold_at` |
| Precio distinto | `price_differs` (derivado) |
| Diferencia (aumento / descuento) | `price_delta` (derivado) |
| Antigüedad | `age_stage` (derivado): Reciente `fresh`, Normal `normal`, Envejeciendo `aging`, Antiguo `old` |

## Valores derivados (nunca almacenados editables)
| UI | Código | Definición |
|---|---|---|
| Deuda | `debt` | Σ precio acordado de ejemplares vendidos al cliente |
| Suma de abonos | `paid_total` | Σ valor real de abonos cobrados o entregados |
| Saldo pendiente | `balance` | `debt − paid_total − credit_applied` |
| Saldo a favor | `credit` | `max(0, −balance)` |
| Dinero en la calle | `street_money` | Σ saldos positivos |
| En mi poder (efectivo / transferencia) | `cash_on_hand` / `transfer_on_hand` | Σ abonos `collected` por método |
| Vencido | `overdue` | abono `scheduled` con `due_date < hoy` |
| Fecha de la venta | `first_sale_at` / `last_sale_at` | |
| Progreso de bonificación | `bonus_progress` | Σ precio colportor de culturales vendidos ÷ meta |

## Procesos y pantallas
| UI | Código / ruta | Notas |
|---|---|---|
| **Hoy** (alias "Pendientes del día", "Agenda del día") | `/hoy` | Resumen del día |
| **+ Vender** | `/vender` | Flujo central de venta |
| **Hacer inventario** | `/hacer-inventario` | Cuadre con el líder; incluye totalizadores |
| Inventario (vista de culturales) / Inventario TODOS (cultural + religioso) | `view = cultural` / `view = all` | Minibooks siempre aparte |
| Libros en físico | `/inventario` | Ejemplares `in_stock` por título |
| Agregar a inventario | `/inventario/agregar` | Lista + favoritos |
| Dinero | `/dinero` | Abonos y Abibonos presentados juntos |
| Modo administrador | `/admin` | |
| Totalizador | `totalizer` | Pieza registrada en `features/totals/registry.ts` |
| Devolución | `return` | Ejemplar vendido vuelve a inventario |
| Cuadre | *(concepto)* | Reconciliación de cuentas con el líder |
| Campaña | `campaign` | **Backlog**; ~3 meses |
| Bonificación | *(concepto)* | Regalo de la casa publicadora al alcanzar la meta de compra cultural |
