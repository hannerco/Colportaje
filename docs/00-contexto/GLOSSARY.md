# Glosario

**Fuente única de nombres.** UI y docs en español; código (tablas, variables, tipos, rutas internas) en inglés. **Nombre de la app: "Colportor"** (marca de Emprendum; hoy la usa el dueño con unos pocos colportores). Para añadir un concepto, primero se añade aquí. Los nombres de UI marcados 🔶 están en revisión (ver `06-planificacion/OPEN-QUESTIONS.md` RV-01).

## Decisiones de nombre en la interfaz (cerradas)
| En pantalla | Notas |
|---|---|
| **Abonos** (de clientes) | Se queda "Abono" |
| **Abibonos** | Se queda así (chiste interno que el dueño quiere conservar). El tooltip dice **"Entrega al líder"** |
| **Minibooks** | Literalmente "Minibooks" |
| **Dinero**, **Hacer inventario**, **+ Vender**, **Hoy** | Se quedan. "Hoy" lleva el subtítulo "Pendientes del día" |
| **Catálogo** | Sección del admin donde se gestionan los Títulos |
| **Libros** | Lo que ve el colportor en listas y selectores ("Libros en físico", "¿Qué libro recibiste?") |
| **Ejemplar** | Cada unidad física; aparece en detalles y tooltips |
| **Título** | Existe sobre todo en el código y en los tooltips ("un título es un libro del catálogo; un ejemplar es cada copia física tuya") |
| **Archivar** (cliente) | Reemplaza a "eliminar cliente" |
| **Devolver a inventario** | Acción de devolución / quitar un libro de un cliente |
| **Con novedad** | Antes "Sin resolver" |
| Estado del cliente | `payment_standing`: Al día `current` / Con saldo `balance` / Vencido `overdue`; píldora suave con ícono (BR-CUS-13) |
| Barra flotante | Barra inferior móvil tipo píldora con 4 íconos y botón circular "+" (Vender) aparte |
| Aviso de vencidos | Fila única "N cobros vencidos ›" en Hoy; abre Dinero ▸ Por cobrar ▸ Vencidos |
| Microícono de tipo | Único color de categoría: ícono pequeño (solo trazo) que distingue cobro / visita / capacitación |
| Iconos | Cada sección tiene un ícono propio; en móvil la barra inferior muestra solo íconos (como Instagram) y el título está en la cabecera |

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
| Evento de abono | `payment_event` | Recortes, cancelaciones, reaperturas (solo inserción) |
| Evento de Abibono | `leader_deposit_event` | Confirmación y reapertura con motivo |
| Evento de ejemplar | `copy_event` | Historial (recibido, vendido, devuelto…) |
| Favorito | `title_favorite` | Título marcado para agregar a inventario con un toque |
| Foto | `photo` | Imagen de info de cliente, factura o recibo |
| Ajustes | `app_settings` | Meta de bonificación, umbrales de antigüedad, máx. favoritos |
| Meta (de bonificación) | `bonus_goal` | 4.000.000 por defecto, editable por admin |
| Perfil / Rol | `profile` / `user_role` | El perfil guarda el formato de hora (12 h/24 h) y si está activo |

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
| Perdido (lo asumo yo) | `lost` | `copy` |
| Devuelto al líder | `returned_to_leader` | `copy` |
| Por cobrar (antes "Sin reclamar") | `scheduled` | `payment` |
| Cobrado (antes "Reclamado"; tooltip: "ya lo recibiste, falta entregarlo al líder") | `collected` | `payment` |
| Entregado al líder (antes "Entregado") | `delivered` | `payment` |
| Cancelado | `canceled` | `payment` |
| Borrador / Confirmado | `draft` / `confirmed` | `leader_deposit` |
| Pendiente / Hecha / Cancelada | `pending` / `done` / `canceled` | `visit` |
| Apareció / Perdido / Eliminar | `found` / `lost` / `removed` | resolución de `copy_issue` |

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
| Recibido el (fecha recibido) | `received_at` (editable, no futura) |
| Fecha vendido | `sold_at` |
| Precio distinto | `price_differs` (derivado) |
| Diferencia (aumento / descuento) | `price_delta` (derivado) |
| Antigüedad | `age_stage` (derivado): Reciente `fresh`, Normal `normal`, Envejeciendo `aging`, Antiguo `old` |

## Valores derivados (nunca almacenados editables)
| UI | Código | Definición |
|---|---|---|
| Deuda | `debt` | Σ precio acordado de ejemplares vendidos al cliente |
| Suma de abonos | `paid_total` | Σ valor real de abonos cobrados o entregados |
| Saldo pendiente | `balance` | `debt − paid_total + credit_applied` |
| Saldo a favor | `credit` | `max(0, −balance)` |
| Saldo restante | `remaining` | `max(0, balance)` |
| Total programado | `scheduled_total` | Σ valor acordado de abonos por cobrar |
| Sobrante de programados | `excess` | `scheduled_total − remaining`; dispara la **alerta de abonos que no cuadran** |
| Sin programar | `unscheduled` | Saldo aún sin abonos programados (informativo) |
| Perdidos asumidos | `lost_assumed_value` | Σ precio colportor de ejemplares `lost` (libros; sin minibooks) |
| A responder al líder | `owed_to_leader` | Mi compra + perdidos asumidos |
| Dinero en la calle | `street_money` | Σ saldos restantes (abonos `canceled` no cuentan) |
| **Por entregar** (sin subtítulo; ⓘ: "dinero que ya cobraste y aún no has entregado al líder") | `to_deliver_total` | Σ abonos `collected` no entregados; desglose Efectivo `cash_to_deliver` / Transferencia `transfer_to_deliver` |
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
| Devolución | `return` | Ejemplar vendido vuelve a inventario; motivo `customer_returned` o `wrong_registration` |
| Archivar | `archived_at` | Oculta un cliente sin ejemplares vendidos; reversible |
| Reabrir (Abibono) | `reopen` | Devuelve un Abibono confirmado a borrador con motivo |
| Alerta de abonos que no cuadran | `schedule_excess_alert` | BR-PAY-13 |
| Barra de vista | `ViewBar` | Componente único de pestañas, filtro, orden y búsqueda en todos los módulos |
| Cuadre | *(concepto)* | Reconciliación de cuentas con el líder |
| Campaña | `campaign` | **Backlog**; ~3 meses |
| Formato de hora | `time_format` | `12h` (por defecto) o `24h`, elegido en Ajustes |
| Bonificación | *(concepto)* | Regalo de la casa publicadora al alcanzar la meta de compra cultural |
