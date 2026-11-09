# HU-INV-01 · Ejemplar: modelo, numeración, estados e historial

> **Épica:** Inventario · **Depende de:** HU-BASE-04, HU-CLI-01 (la tabla `customer`, a la que apunta `copy.customer_id`) · **Reglas:** BR-COPY-01/03/05/08, BR-PRC-01/02, BR-AUD-01, ADR-0008, ADR-0023, ADR-0043 · **Diseño:** sin pantalla propia (es la base de todo Inventario)

## Historia
**Como** colportor **quiero** que cada libro físico que tengo sea un ejemplar con su número, su estado y su historial **para** saber siempre qué pasó con cada unidad ("Corazón tranquilo #12").

## Contexto
- **Título** = el libro del catálogo; **ejemplar** = cada unidad física (30 libros = 30 ejemplares). Un ejemplar copia los precios del título al crearse y **nunca** los vuelve a leer (BR-COPY-03).
- El número es consecutivo **por usuario y por título**, lo asigna el sistema y **nunca se reutiliza**, ni siquiera si el ejemplar se elimina (BR-COPY-05).
- Los minibooks también son ejemplares (BR-MBK-01), pero **vender** minibooks llega con su módulo (ADR-0041): por eso aquí no se crea `minibook_sale_id`.

## Alcance
- **Incluye:** tablas `copy`, `copy_counter`, `copy_event`, `copy_issue` con checks, índices y RLS; función SQL de numeración; máquina de estados en el dominio; cálculos de precio distinto y diferencia; escritura de eventos dentro de las funciones SQL; lectura del historial de un ejemplar.
- **No incluye:** crear ejemplares (HU-INV-02), venderlos (HU-CLI-09), novedades (HU-INV-07), eliminar (HU-INV-08), devolver al líder (HU-INV-09). Esas HU usan lo que aquí se crea.

## Contrato para el resto del código
- Dominio `Copy = { id, titleId, number, status: 'in_stock' | 'sold' | 'flagged' | 'lost' | 'returned_to_leader', customerId | null, agreedPrice | null, publicPriceSnapshot | null, colportorPriceSnapshot, receivedAt: LocalDate, soldAt: Instant | null, deletedAt | null }`.
- `copyTransitions`: tabla única de transiciones permitidas (DOMAIN-MODEL "Máquinas de estados"), con `canTransition(from, action)` y `apply(copy, action)` que devuelve `Result`.
- `priceDiffers(copy)` = vendido, no minibook, y `agreedPrice ≠ publicPriceSnapshot`; `priceDelta(copy)` = `agreedPrice − publicPriceSnapshot` solo si difiere (BR-PRC-01/02).
- SQL `next_copy_number(owner, title)` → entero, dentro de la misma transacción que inserta el ejemplar.
- `CopyRepository.getHistory(copyId)` → eventos ordenados del más reciente al más antiguo, con su `type`, `at`, nota y datos (cliente, precio anterior y nuevo, motivo).

## Reglas (el sistema DEBE…)
- **R1.** El número DEBE ser consecutivo por (usuario, título), empezar en 1, sin reutilizarse y sin duplicarse aunque se creen ejemplares al mismo tiempo (BR-COPY-05).
- **R2.** CUANDO un ejemplar no está vendido, NO DEBE tener cliente, precio acordado ni fecha de venta (BR-COPY-08; check de la base).
- **R3.** Solo las transiciones de la tabla única DEBEN permitirse; cualquier otra devuelve `INVALID_TRANSITION`.
- **R4.** Todo cambio de estado, de precio acordado o de fecha de recibido DEBE dejar un `copy_event` en la misma transacción (BR-AUD-01).
- **R5.** Un ejemplar borrado (`deleted_at`) NO DEBE aparecer en ninguna lectura ni contar en nada; su número sigue ocupado.
- **R6.** Debe existir como máximo **una** novedad abierta por ejemplar (índice único parcial).

## Criterios de aceptación
- **CA-1.** **Dado** un título sin ejemplares, **cuando** se crean 3, **entonces** reciben los números 1, 2 y 3.
- **CA-2.** **Dado** los ejemplares #1, #2 y #3, **cuando** se elimina el #2 y se crea otro, **entonces** el nuevo es #4.
- **CA-3.** **Dado** 10 inserciones simultáneas del mismo título, **cuando** terminan, **entonces** los números son 1 a 10 sin repetir.
- **CA-4.** **Dado** dos usuarios con el mismo título, **cuando** cada uno crea su primer ejemplar, **entonces** ambos son #1.
- **CA-5.** **Dado** un ejemplar en físico, **cuando** se intenta guardar con un cliente, **entonces** la base lo rechaza.
- **CA-6.** **Dado** un ejemplar vendido con precio público 50.000 y acordado 45.000, **entonces** `priceDiffers = true` y `priceDelta = −5.000`; con acordado 55.000, `priceDelta = +5.000`; con 50.000, `priceDiffers = false` y sin diferencia.
- **CA-7.** **Dado** un ejemplar `lost`, **cuando** se intenta vender, **entonces** `INVALID_TRANSITION`.

## Casos borde y errores
- Un minibook sin precio público tiene `publicPriceSnapshot = null`: nunca tiene "precio distinto".

## Datos
`copy` (sin `minibook_sale_id` por ahora; se agrega con el módulo Minibooks), `copy_counter`, `copy_event` (tipos de DOMAIN-MODEL, incluidos `undo_resolved`, `deleted`, `undo_deleted`), `copy_issue`. Índices de DATABASE.md.

## Cómo se verifica
- **Dominio:** tabla de transiciones (todas las válidas e inválidas), `priceDiffers`, `priceDelta`.
- **Integración:** numeración (incluida la concurrente), checks de la base, RLS A/B de las cuatro tablas.

## Terminado cuando
Se cumple §10 de las reglas comunes.
