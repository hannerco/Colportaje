# Modelo de dominio

Convenciones comunes a **todas** las tablas de negocio (salvo donde se indica):

| Columna | Tipo | Nota |
|---|---|---|
| `id` | `uuid` PK | Generado en el cliente (BR-GEN-04) |
| `owner_id` | `uuid` FK → `auth.users` | Aislamiento por usuario (BR-GEN-01) |
| `created_at` | `timestamptz` | `default now()` |
| `updated_at` | `timestamptz` | Trigger en cada UPDATE (necesario para sync en fase 2) |
| `deleted_at` | `timestamptz null` | Borrado lógico (BR-GEN-02) |

Dinero: `integer` COP (sin decimales). Fechas calendario: `date`. Instantes: `timestamptz`. Enumeraciones: tipos `enum` de Postgres (nombres en `00-contexto/GLOSSARY.md`). SQL borrador: `02-datos/DATABASE.md`. Reglas: `01-negocio/BUSINESS-RULES.md`.

## Diagrama de relaciones

```
auth.users ─1──1─ profile ─1──N─ user_role
     │
     ├─N─ customer ─1──N─ payment ─N──1─ leader_deposit ─1──N─ leader_deposit_minibook_allocation ─N──1─ minibook_sale
     │         │            ├─1──N─ payment_reschedule      └─1──N─ leader_deposit_event
     │         │            └─1──N─ payment_event
     │         ├─1──N─ copy ───N──1─ title
     │         └─0..N─ visit (agregación: customer_id nullable)
     ├─N─ copy ─1──N─ copy_event ; copy ─1──N─ copy_issue
     ├─N─ minibook_sale ─N──1─ title ; minibook_sale ─0..1─ customer (origen client_credit)
     ├─N─ training
     ├─N─ reminder  →  (visit | training)
     ├─N─ title_favorite ─N──1─ title
     └─N─ photo  (polimórfica: customer_info | customer_invoice | deposit_receipt)
app_settings (fila única, admin)    title (compartido, admin)
```

---

## `profile`
| Columna | Tipo | Restricciones |
|---|---|---|
| `id` | `uuid` | PK = `auth.users.id` |
| `full_name` | `text` | not null |
| `email` | `text` | copia informativa (lista de admin) |
| `time_format` | `enum('12h','24h')` | default `12h` (BR-GEN-07) |
| `is_active` | `boolean` | default true; el admin puede desactivar (BR-USR-07) |
| `created_at`, `updated_at` | | |

Se crea automáticamente (trigger sobre `auth.users`) al aceptar una invitación, junto con el rol `colportor`.

## `user_role`
`user_id uuid`, `role enum('colportor','admin','leader')`. PK `(user_id, role)`. Todo usuario tiene `colportor`. `leader` reservado (F3).

## `app_settings` (una sola fila, solo admin escribe)
| Columna | Tipo | Defecto |
|---|---|---|
| `id` | `smallint` PK | `1` (check `= 1`) |
| `bonus_goal` | `integer` | `4000000` |
| `age_thresholds` | `integer[3]` | `{2,6,12}` (límites superiores de reciente / normal / envejeciendo; mayor = antiguo). Check: estrictamente creciente, > 0 |
| `max_favorites` | `smallint` | `6` |

## `title` (catálogo compartido; sin `owner_id`)
| Columna | Tipo | Restricciones |
|---|---|---|
| `name` | `text` | not null |
| `image_path` | `text` | bucket público `title-images` |
| `author` | `text` | |
| `description` | `text` | corta |
| `public_price` | `integer` | `> 0` si categoría ≠ minibook; **null permitido** si minibook |
| `colportor_price` | `integer` | `≥ 0` |
| `category` | `enum('cultural','religious','minibook')` | not null |
| `is_active` | `boolean` | default true. Nunca se borra |

Lectura: todo autenticado. Escritura: admin.

## `copy` (Ejemplar)
| Columna | Tipo | Restricciones |
|---|---|---|
| `title_id` | `uuid` | FK, not null |
| `number` | `integer` | not null; único `(owner_id, title_id, number)`; asignado por el sistema; nunca reutilizado |
| `status` | `enum('in_stock','sold','flagged','lost','returned_to_leader')` | default `in_stock` |
| `customer_id` | `uuid null` | FK; solo con `status = sold` a cliente |
| `minibook_sale_id` | `uuid null` | FK; solo para minibooks vendidos |
| `agreed_price` | `integer null` | `≥ 0`; no nulo si vendido a cliente; nulo si `in_stock` |
| `public_price_snapshot` | `integer null` | copia del título al recibirse (nulo en minibooks sin precio) |
| `colportor_price_snapshot` | `integer` | copia del título al recibirse |
| `received_at` | `date` | por defecto hoy; editable (BR-COPY-04); `≤ hoy` y `≤ sold_at` |
| `sold_at` | `timestamptz null` | |

Checks: `status <> 'sold' ⇒ customer_id, agreed_price, sold_at, minibook_sale_id nulos`. `customer_id not null ⇒ status = 'sold'`.
Índices: `(owner_id,status)`, `(owner_id,title_id,status)`, `(customer_id)`.

Derivados por consulta/dominio: `price_differs`, `price_delta`, `age_stage`.

## `copy_event` (solo inserción, historial)
`copy_id`, `type enum('received','sold','returned','flagged','resolved','price_changed','received_date_changed','minibook_sold','returned_to_leader','undo_returned_to_leader')`, `data jsonb`, `at timestamptz`.
- `returned` guarda `data.reason ∈ {customer_returned, wrong_registration}` (BR-COPY-09).
- `resolved` guarda `data.resolution ∈ {found, lost, removed}` y la nota.
Se escribe en la misma transacción que el cambio.

## `copy_issue` (Novedad)
`copy_id`, `note text not null`, `resolution enum('found','lost','removed') null`, `resolution_note text`, `resolved_at timestamptz null`. Una novedad abierta por ejemplar a la vez. `removed` borra lógicamente el ejemplar. **Ningún texto de la app** alude a que el líder pueda asumir una pérdida (BR-COPY-11).

## `customer`
| Columna | Tipo | Restricciones |
|---|---|---|
| `name` | `text` | not null |
| `phone` | `text` | |
| `info` | `text` | texto libre; indexado para la búsqueda local |
| `address` | `text` | |
| `maps_url` | `text` | opcional |
| `archived_at` | `timestamptz null` | archivado (BR-CUS-09); no es borrado lógico |

Fotos de información y facturas: tabla `photo`. Todo lo demás se **deriva** (BR-CUS-04).

## `payment` (Abono)
| Columna | Tipo | Restricciones |
|---|---|---|
| `customer_id` | `uuid` | FK, not null |
| `kind` | `enum('down_payment','scheduled','extra')` | not null |
| `status` | `enum('scheduled','collected','delivered','canceled')` | not null |
| `original_due_date` | `date null` | **inmutable** una vez fijada |
| `due_date` | `date null` | la que sale en calendario |
| `paid_at` | `date null` | fecha real; no futura |
| `agreed_amount` | `integer null` | `> 0` |
| `paid_amount` | `integer null` | `> 0`; no nulo si `collected`/`delivered` |
| `method` | `enum('cash','transfer') null` | no nulo si `collected`/`delivered` |
| `leader_deposit_id` | `uuid null` | FK |
| `canceled_at` | `timestamptz null` | solo si `status = canceled` |
| `cancel_reason` | `enum('book_returned','overpaid','manual','customer_archived') null` | |

Checks: `status in ('scheduled','canceled') ⇒ kind = 'scheduled' ∧ agreed_amount, due_date, original_due_date no nulos`; `status in ('collected','delivered') ⇒ paid_amount, paid_at, method no nulos`; `status = 'canceled' ⇒ canceled_at, cancel_reason no nulos`; `status='delivered' ⇔ deposit.status='confirmed'` (trigger/servicio). Trigger bloquea UPDATE/DELETE si `status='delivered'`.

## `payment_reschedule` (solo inserción)
`payment_id`, `previous_due_date date`, `new_due_date date`, `changed_at timestamptz`, `note text null`.

## `payment_event` (solo inserción)
`payment_id`, `type enum('amount_reduced','canceled','reopened')`, `data jsonb` (p. ej. `{previous_amount, new_amount, trigger}`), `at timestamptz`. Registra los recortes de la alerta BR-PAY-13.

## `leader_deposit` (Abibono 🔶 — "Entrega al líder")
| Columna | Tipo | Restricciones |
|---|---|---|
| `title` | `text` | not null; automático `Abibono – dd/mm/aaaa [(n)]` |
| `deposit_date` | `date` | default hoy (Bogota) |
| `cash_amount` | `integer` | `≥ 0` |
| `transfer_amount` | `integer` | `≥ 0` |
| `note` | `text null` | obligatoria para confirmar si `difference ≠ 0`; editable siempre |
| `status` | `enum('draft','confirmed')` | default draft |
| `confirmed_at` | `timestamptz null` | |

Derivados: `total = cash + transfer`, `expected`, `difference`. Recibos: `photo` (kind `deposit_receipt`), **≥ 1** para confirmar; se pueden añadir más siempre.

## `leader_deposit_event` (solo inserción)
`leader_deposit_id`, `type enum('confirmed','reopened')`, `reason text null` (obligatorio en `reopened`), `at timestamptz`.

## `minibook_sale` (Entrada de minibooks)
| Columna | Tipo | Restricciones |
|---|---|---|
| `title_id` | `uuid` | debe ser categoría `minibook` |
| `quantity` | `integer` | `≥ 1` |
| `amount` | `integer` | `≥ 0`; con `client_credit` `≤` saldo a favor vigente |
| `method` | `enum('cash','transfer')` | not null |
| `payment_source` | `enum('cash','client_credit')` | default `cash` |
| `customer_id` | `uuid null` | obligatorio si `client_credit` |
| `sold_at` | `date` | default hoy |
| `note` | `text null` | |

Efecto: consume `quantity` copies `in_stock` del título (FIFO por `received_at`), enlazándolas por `copy.minibook_sale_id`.

## `leader_deposit_minibook_allocation`
`leader_deposit_id`, `minibook_sale_id`, `amount integer > 0`. Único `(deposit, sale)`. Σ por entrada ≤ `amount`. No se permite para `payment_source='client_credit'`.

## `visit`
`customer_id uuid null` (FK, agregación), `label text null` (obligatorio si no hay cliente), `scheduled_date date not null`, `scheduled_time time null`, `note text`, `status enum('pending','done','canceled')` default pending.

## `training`
`title text not null`, `place text` (empresa/lugar), `scheduled_at timestamptz not null` (fecha **y hora**), `note text`.

## `reminder`
`target_type enum('visit','training')`, `target_id uuid`, `kind enum('start_of_day','one_day_before','one_week_before','custom')`, `custom_minutes_before integer null`, `dismissed_at timestamptz null`. Sin recordatorio por defecto; inicio del día = 07:00 Bogota. Los abonos no tienen filas: usan siempre inicio del día (BR-CAL-05).

## `title_favorite`
`owner_id`, `title_id`; PK `(owner_id,title_id)`; máximo `app_settings.max_favorites` por usuario.

## `photo`
| Columna | Tipo | |
|---|---|---|
| `kind` | `enum('customer_info','customer_invoice','deposit_receipt')` | |
| `customer_id` / `leader_deposit_id` | `uuid null` | exactamente uno según `kind` |
| `path` | `text` | `{owner_id}/{kind}/{uuid}.webp` |
| `thumb_path` | `text` | miniatura ~15 KB |
| `bytes` | `integer` | para medir uso (BR-PHO-04) |

---

## Derivaciones (dominio, puras)

```
debt(c)            = Σ copy.agreed_price           donde copy.customer_id = c ∧ status = sold
paid_total(c)      = Σ payment.paid_amount         donde payment.customer_id = c ∧ status ∈ {collected, delivered}
credit_applied(c)  = Σ minibook_sale.amount        donde customer_id = c ∧ payment_source = client_credit
balance(c)         = debt − paid_total − credit_applied
credit(c)          = max(0, −balance)
remaining(c)       = max(0, balance)
scheduled_total(c) = Σ payment.agreed_amount       donde status = scheduled          (canceled NO cuenta)
excess(c)          = scheduled_total − remaining   → alerta BR-PAY-13 si > 0
unscheduled(c)     = max(0, remaining − scheduled_total)   (informativo)
street_money       = Σ remaining(c)                (global; excluye clientes archivados con saldo 0)
is_prospect(c)     = ¬∃ copy vendida
price_differs(k)   = k.agreed_price ≠ k.public_price_snapshot
price_delta(k)     = k.agreed_price − k.public_price_snapshot
age_days(k)        = días calendario (Bogota) entre received_at y hoy
age_stage(k)       = fresh si ≤ t0; normal si ≤ t1; aging si ≤ t2; old si > t2   (t = age_thresholds)
overdue(p)         = p.status = scheduled ∧ p.due_date < hoy
deposit.total      = cash + transfer
deposit.expected   = Σ paid_amount(payments vinculados) + Σ allocation.amount
deposit.difference = total − expected
cash_to_deliver    = Σ paid_amount de payments collected con method = cash       (análogo transfer_to_deliver)
to_deliver_total   = cash_to_deliver + transfer_to_deliver   (tarjeta "Por entregar" en Hoy; excluye minibooks y canceled)
bonus_progress     = Σ colportor_price_snapshot de copies culturales vendidas ÷ bonus_goal   (barra: min(1, ·))
lost_assumed_value = Σ colportor_price_snapshot de copies lost
owed_to_leader     = Mi compra (Σ colportor_price_snapshot de vendidos) + lost_assumed_value
minibooks.income   = Σ amount de minibook_sale con payment_source = cash
minibooks.cost     = Σ colportor_price_snapshot de copies vendidas con minibook_sale_id
minibooks.net      = income − cost
```

## Máquinas de estados

**Copy**
- `in_stock → sold` (vender a cliente o por entrada de minibooks)
- `sold → in_stock` (devolver / quitar del cliente; conserva `received_at`)
- `in_stock → flagged` (marcar novedad; requiere nota)
- `flagged → in_stock` (Apareció) · `flagged → lost` (Perdido, lo asumo) · `flagged → [borrado lógico]` (Eliminar)
- `in_stock → returned_to_leader` (devolver al líder, en lote, con nota) · `returned_to_leader → in_stock` (deshacer, con nota)
- Un ejemplar `sold` no se marca `flagged` directamente: primero se devuelve.

**Payment**
- `scheduled → collected` (cobrar) · `scheduled → canceled` (alerta BR-PAY-13, archivar cliente o manual)
- `collected → delivered` (solo al confirmar su Abibono) · `delivered → collected` (solo al reabrir el Abibono, con motivo)
- `scheduled` mantiene `due_date` editable (prórroga).
- `canceled` y `delivered` (mientras esté confirmado) no se editan.

**LeaderDeposit:** `draft → confirmed` (con recibo, total > 0, nota si hay diferencia) · `confirmed → draft` (**Reabrir**, con motivo; queda en historial).

**Visit:** `pending → done | canceled`.

**Customer:** activo ↔ archivado (`archived_at`); archivar solo sin ejemplares vendidos.
