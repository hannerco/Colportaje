# Reglas comunes a todas las historias de usuario

Toda HU de esta carpeta incluye estas reglas aunque no las repita. Si una HU dice algo distinto, manda la HU solo en lo que diga explícitamente; si contradice los docs normativos, **se detiene el trabajo y se pregunta al dueño**.

## 1. Fuentes de verdad
Jerarquía de `docs/README.md`: decisiones del `00-contexto/DECISION-LOG.md` y ADR aceptados → `01-negocio/BUSINESS-RULES.md` y `02-datos/DOMAIN-MODEL.md` → flujos y requisitos. Nombres: `00-contexto/GLOSSARY.md` (UI y docs en español; código en inglés). Una HU cita las reglas `BR-*`; si una regla y la HU no coinciden, gana la regla y se avisa.

## 2. Qué entrega una HU de back (ADR-0041)
Toda la lógica que no es UI ni componente visible, en las capas de `03-arquitectura/ARCHITECTURE.md`:

| Capa | Qué va | Ejemplo |
|---|---|---|
| `supabase/migrations/` | Tablas, checks, índices, triggers, RLS, funciones SQL (RPC) | `add_copies(...)` |
| `src/domain/` | Tipos, reglas, cálculos y máquinas de estado en TypeScript **puro** | `computeCustomerAccount()` |
| `src/repositories/` | Interfaces (contratos de datos) | `CopyRepository` |
| `src/adapters/` | Implementaciones Supabase, almacenamiento, compresión de imágenes; mapeo fila ↔ dominio con Zod | `SupabaseCopyRepository` |
| `src/features/<área>/use-cases/` | Casos de uso: orquestan dominio y repositorios; devuelven `Result` | `addCopiesBatch()` |
| `src/features/<área>/hooks/` | Hooks de datos (TanStack Query) que el front llama: lecturas listas para pintar y mutaciones | `useCopiesList()` |

**No entrega:** componentes, estilos, tokens, textos de pantalla (`src/copy/es.ts`) ni rutas visuales. Una lectura devuelve un **modelo de vista**: datos ya filtrados, ordenados, calculados y con indicadores (`canCollect`, `isOverdue`…), para que el front solo pinte.

## 3. Contrato con el front
- Cada HU lista sus **lecturas** y **acciones** con nombre, entradas, salida y errores. Los nombres de la HU son el contrato: no se cambian sin actualizar la HU.
- Toda acción devuelve `Result<T, AppError>`; nunca lanza excepciones por un fallo de negocio esperado.
- `AppError = { code, retryable, details? }`. Códigos comunes: `OFFLINE`, `NETWORK_ERROR` (reintentable), `SESSION_EXPIRED`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION` (con `details.field`), `CONFLICT` (el dato cambió mientras tanto). Cada HU añade los suyos en `SCREAMING_SNAKE_CASE`. El front traduce el código a texto en español.
- Tras una acción exitosa, el hook **invalida** las lecturas afectadas (p. ej. cobrar invalida ficha, lista de clientes y Dinero).

## 4. Seguridad y datos
- **RLS** en toda tabla con `owner_id`: un usuario solo ve y cambia lo suyo; el admin tampoco ve datos de negocio de otros (BR-GEN-01). Un usuario con `profile.is_active = false` no lee ni escribe nada.
- La `service_role` **nunca** llega al cliente.
- **IDs UUID generados en el cliente** (BR-GEN-04). Reintentar la misma acción con los mismos IDs **no duplica nada** (idempotencia, AF-91).
- **Operaciones de varias filas** (y todo lo que mueva dinero o inventario) van en **una sola función SQL transaccional**: todo o nada.
- **Borrado lógico** (`deleted_at`, BR-GEN-02); toda lectura excluye lo borrado. Única excepción: borrar un borrador de Abibono (BR-DEP-10).
- **Historial de solo inserción** (`copy_event`, `payment_reschedule`, `payment_event`, `leader_deposit_event`), escrito en la misma transacción que el cambio.
- **Dinero:** enteros COP, nunca decimales. **Fechas de negocio:** America/Bogota; `today` se inyecta (nunca el reloj del dispositivo directamente); `*_date` = día, `*_at` = instante.
- Los **valores derivados** (saldo, deuda, totales, estados) se calculan, nunca se guardan editables (BR-GEN-03).

## 5. Sin conexión (BR-GEN-08, HU-BASE-06)
Toda acción comprueba la conexión **antes** de escribir y, sin ella, devuelve `OFFLINE` sin tocar nada. Toda lectura funciona con lo último sincronizado.

## 6. "Última modificación" del cliente (BR-CUS-16)
Las acciones que el usuario hace sobre los datos de un cliente actualizan `customer.updated_at` en la misma transacción: datos del cliente, libros agregados o quitados, precio acordado de sus ejemplares, abonos creados, cobrados, editados, corregidos, prorrogados, cancelados o borrados, facturas y fotos. **No** lo actualizan: que un abono pase a vencido, confirmar o reabrir un Abibono (no son cambios de la ficha). Ver `INTERPRETACIONES.md` I-01.

## 7. Orden y vacíos (BR-GEN-14)
En todo orden, las filas sin valor en el criterio van **al final en ambos sentidos**. Desempate determinista: el criterio secundario que diga la HU y, al final, el `id`. Comparación de textos en español, sin distinguir mayúsculas ni tildes.

## 8. Configuración de negocio (BR-GEN-15)
Los valores que pueden cambiar viven en `src/domain/config/business-config.ts` (HU-BASE-01) y se leen desde ahí; ninguna HU los repite como número suelto:

| Clave | Valor inicial | Regla |
|---|---|---|
| `timezone` | `America/Bogota` | BR-GEN-05 |
| `defaultPaymentMethod` | `transfer` | BR-PAY-04 |
| `paymentPlan.amountMultiple` | 1.000 | BR-PAY-15 |
| `paymentPlan.paydays.biweekly` | días 15 y 30 (30 = último día si el mes es más corto) | BR-PAY-15 |
| `paymentPlan.paydays.monthly` | día 30 (último día si el mes es más corto) | BR-PAY-15 |
| `paymentPlan.weeklyStepDays` | 7 | BR-PAY-15 |
| `reschedule.confirmBeyondMonths` | 2 | BR-PAY-06 |
| `location.approximateAccuracyMeters` | 50 | BR-CUS-08 |
| `location.defaultCenter` | Colombia (vista país) | BR-CUS-08 |
| `copyDelete.noteRequired` | `false` | BR-COPY-17 |
| `undo.toastSeconds` | 6 | BR-COPY-11/17 (lo usa el front) |
| `photos` | WebP, lado mayor ≤ 1.280 px, ~150 KB, miniatura ~15 KB (lado mayor 320 px); URL firmadas de 1 hora | BR-PHO-01, HU-BASE-05 R3 |
| `search.fuzzyThreshold` | lo fija HU-CLI-05 con su prueba | BR-CUS-07 |
| `duplicates.nameThreshold` | 0,85 (similitud de nombres normalizados; fijado en HU-CLI-02 con su prueba) | BR-CUS-11 |

## 9. Extensibilidad (CONVENTIONS §5b, ADR-0041)
1. Cambiar una tabla sin dañar lo demás: migraciones **aditivas** (expandir → migrar → contraer), nunca editar una migración aplicada; cada módulo accede a tablas ajenas solo por su repositorio.
2. Cada regla en un solo módulo del dominio, citada por su ID (`// BR-PAY-13`).
3. Valores cambiantes solo en la configuración (§8).
4. Todo cambio de estado importante deja historial.
5. Lo que depende de un módulo sin diseño se deja **preparado para sumarse**, no construido a medias (p. ej. el cuadre del Abibono suma "aportes": hoy solo abonos; mañana minibooks).

## 10. Definición de terminado (vale para toda HU)
- [ ] Cada criterio de aceptación tiene al menos una prueba que lo nombra (`it('CA-3: …')`) y pasa.
- [ ] Cada regla `BR-*` tocada tiene prueba de dominio (`it('BR-XXX-NN: …')`); dominio con cobertura ≥ 95 %.
- [ ] Si toca la base de datos: migración nueva, RLS con prueba A/B en `tests/rls/`, y prueba de cada función SQL (incluido el caso "todo o nada").
- [ ] `pnpm lint && pnpm typecheck && pnpm test` (y `pnpm test:rls` si aplica) en verde; sin `any`, sin `@ts-ignore`, sin `console.log`.
- [ ] Ningún import prohibido entre capas (la regla de ESLint lo verifica).
- [ ] Sin números de negocio sueltos (§8) ni textos de pantalla en el back.
- [ ] Si la HU cambió una regla o encontró una contradicción: docs actualizados en el mismo cambio y anotados en `DECISION-LOG`.
