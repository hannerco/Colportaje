# Estrategia de pruebas

Requisito del dueño: **la app debe tener pruebas**. Se escriben **junto con** el código, no después. El orden de prioridad refleja dónde está el riesgo (dinero y datos del cliente).

## Pirámide
| Nivel | Herramienta | Qué cubre | Cuándo corre |
|---|---|---|---|
| **Unitarias de dominio** | Vitest | Todas las reglas `BR-*` y derivaciones (sin red, sin UI) | Cada commit (pre-push) y CI |
| **Integración de datos/RLS** | Vitest + Supabase local (`supabase start`) | Políticas RLS, checks, triggers, funciones RPC (vender, confirmar Abibono, entrada de minibooks), numeración de ejemplares | CI |
| **Componentes** | Testing Library | Formularios críticos, tooltips, estados vacíos | CI |
| **E2E** | Playwright (viewport móvil + escritorio) | Flujos clave de `01-negocio/FLOWS.md` | CI (antes de desplegar) |
| **Accesibilidad / PWA** | axe + Lighthouse CI | Contraste, instalable, rendimiento | CI (informativo → bloqueante al madurar) |

## Prioridad 1 — Dominio (casos mínimos obligatorios)
Un archivo por módulo en `src/domain/**/*.test.ts`. Cada prueba cita la regla.

- **Saldo** (`BR-CUS-04`): sin pagos; con parciales; con prórroga; con precio acordado distinto; tras devolución; **saldo a favor**; con `client_credit`; varios ejemplares.
- **Precio** (`BR-PRC-*`): igual / mayor / menor; precio público nulo (minibook) no aplica.
- **Antigüedad** (`BR-COPY-13`): límites exactos 0,2,3,6,7,12,13 días; umbrales personalizados; cambio de zona horaria (medianoche Bogota ≠ UTC).
- **Abonos** (`BR-PAY-*`): nacimiento por tipo, cobrar, parcial (sugerencia, no creación), sobrepago, prórroga (la original no cambia; historial), vencido, bloqueo por entrega, **cancelado** (no cuenta en calendario/Hoy/totales).
- **Alerta de abonos que no cuadran** (`BR-PAY-13`): `excess` con y sin sobrante; disparadores (abono extra, sobrepago, devolución, baja de precio, edición/borrado de abono, archivar, asistente de venta); **recorte más próximo** tras abono extra y **más lejano** tras devolución; reducción parcial del último abono con registro en `payment_event`; "dejar como está" mantiene el aviso; saldo sin programar **no** alerta.
- **Devoluciones** (`BR-COPY-09`, `FLOWS-ALTERNATIVOS` AF-01..AF-12): cada caso A, con ambos motivos; se conserva `received_at`; abonos cobrados y Abibonos intactos; saldo a favor; cliente sin libros = prospecto; `wrong_registration` no cuenta como devolución.
- **Pérdidas y devueltos al líder** (`BR-COPY-11/16`, `BR-GOAL-07`): resoluciones Apareció/Perdido/Eliminar; `lost_assumed_value` y `owed_to_leader`; `returned_to_leader` y su deshacer; la identidad `Recibidos = Vendidos + En físico + Con novedad + Perdidos + Devueltos`.
- **Fecha de recibido** (`BR-COPY-04`): no futura, no posterior a la venta, cambio registrado en historial; antigüedad recalculada.
- **Cantidad "+ / pastilla"** (`BR-COPY-02`): crear N, ajustar hacia arriba y hacia abajo solo sobre los ejemplares recién agregados, deshacer; igual para minibooks.
- **"Por entregar"** (`BR-CAL-08`): total = efectivo + transferencia; cuenta abonos de Abibonos borrador; deja de contar al confirmar y vuelve a contar al reabrir; excluye minibooks y `canceled`; cero → "Nada por entregar".
- **Formato regional** (`BR-GEN-07`): semana desde domingo; 12 h/24 h; fechas `dd/mm/aaaa`.
- **Abibono** (`BR-DEP-*`): autocálculo por método, edición manual, total derivado, esperado/diferencia (faltante, sobrante, cero), nota obligatoria, **donación sin abonos**, recibo obligatorio (una o varias), un abono en un solo Abibono, minibooks parciales, `client_credit` excluido, **reabrir** con motivo (abonos a `collected`, historial).
- **Minibooks** (`BR-MBK-*`): consumo FIFO de stock, bloqueo sin stock, monto 0, ingresos/costo/ganancia neta, no afecta totalizadores de libros.
- **Totalizadores y meta** (`BR-GOAL-*`): los 8, con selector de categoría, exclusión de minibooks, progreso de meta (0 %, 25 %, ≥100 %), **identidad** `Recibidos = Vendidos + En físico + Con novedad + Perdidos`.
- **Calendario** (`BR-CAL-*`): qué aparece en "Hoy", recordatorios activos/descartados, visita sin cliente.
- **Máquinas de estado**: transiciones válidas e inválidas de `copy`, `payment`, `leader_deposit`, `visit`.
- **Propiedades (property-based, `fast-check`)**: nunca saldo derivado inconsistente con la suma de piezas; `total = cash + transfer`; reorden de pagos no cambia el saldo.

**Estado de la Prioridad 1 (2026-10-29):** implementado y probado en `src/domain` (cobertura ≥ 99 %) todo lo anterior **salvo**: la cantidad "+ / pastilla" (BR-COPY-02), el calendario (visitas, capacitaciones y recordatorios: BR-CAL-02..06) y las máquinas de estado de `visit`. Quedan pendientes y se harán cuando se pidan.

## Prioridad 2 — RLS y base de datos (obligatorio antes de producción)
Carpeta `tests/rls/`. Con dos usuarios A y B sembrados:
- A no puede `select/insert/update/delete` filas de B en **ninguna** tabla con `owner_id`.
- Un no-admin no puede escribir `title`, `app_settings`, `user_role`.
- Un admin **no** lee datos de negocio de otros.
- Storage: A no puede leer/escribir bajo el prefijo de B.
- Un admin **no** puede leer clientes, ventas ni abonos de otro usuario.
- Endpoints `/api/admin/*`: rechazan sin sesión, con sesión de no-admin y con usuario desactivado; devuelven enlace y nunca claves.
- `profile.is_active = false` impide acceso a datos.
- Checks y triggers: no se puede editar/borrar un `payment` `delivered` (salvo `reopen_leader_deposit`); no se confirma un Abibono sin recibo o con diferencia sin nota; numeración consecutiva sin huecos ni reutilización ni condiciones de carrera (inserciones concurrentes); `copy` `in_stock` sin cliente.

## Prioridad 3 — E2E (Playwright, móvil y escritorio)
Datos de prueba sembrados y reiniciables. Flujos mínimos:
1. **Invitación → login → Hoy.**
2. **Agregar a inventario** (favorito y lista) y números consecutivos.
3. **Nuevo cliente (ficha viva)** de punta a punta (cliente nuevo; cliente existente que recompra con "Agregar libro"; con y sin cuota inicial; avisos "Aún no tiene libro" y "Revisar") y verificación de saldo.
4. **Cobrar** un abono, parcial, y **prórroga**.
5. **Abibono** completo: autocálculo, diferencia con nota, recibo, confirmación y bloqueo.
6. **Minibooks**: entrada, bloqueo sin stock, asignación parcial al Abibono, `client_credit`.
7. **Devolución** con Abibono ya confirmado: abonos y Abibono intactos, saldo a favor.
8. **Búsqueda difusa** de clientes.
9. **Hacer inventario** y selector de categorías; barra de meta.
10. **Modo admin**: crear título, cambiar meta/umbrales; invitar (enlace) y generar enlace de restablecimiento; desactivar usuario; un no-admin no ve ni puede hacerlo.
11. **Devolución completa** con abonos programados: modal de alerta, recorte desde el más lejano, cancelados visibles y fuera del calendario.
12. **Abono extra** con programados: modal, recorte desde el más próximo.
13. **Reabrir un Abibono confirmado** con motivo y volver a confirmarlo.
14. **Archivar y restaurar** un cliente; los abonos cobrados siguen en Dinero.
15. **Devolver al líder** en lote y deshacer.
16. **Lectura sin conexión**: con la red cortada se consulta, y guardar muestra el mensaje de BR-GEN-08.
17. **Copiar resumen** de Hacer inventario produce el texto esperado.

## Pruebas de arquitectura (UI)
- **Sin valores visuales literales (BR-GEN-13):** un test recorre `src/` (excluyendo `src/ui/tokens/tokens.css`) y falla si encuentra `font-size` con `px`/`rem` literales, clases de Tailwind con valores arbitrarios de tamaño o color (`text-[..]`, `bg-[#..]`) o colores `#hex`/`rgb()` fuera de los tokens.
- **Escala cambiable:** un test de componente comprueba que cambiar `--font-scale` en la raíz cambia el tamaño calculado de los roles (`--text-body`, etc.).
- Se mantienen las pruebas de límites entre capas (ESLint).

## Convenciones de pruebas
- Nombre: `describe('<módulo>')` / `it('BR-XXX-NN: <comportamiento>')`.
- Datos con **builders/fábricas** (`aCustomer()`, `aCopy()`, `aPayment()`), nunca JSON gigante copiado.
- Sin dependencia del reloj real: `today` se inyecta (zona Bogota).
- Cada bug corregido añade una prueba que lo reproduce **antes** del arreglo.
- Cobertura orientativa: dominio **≥ 95 %** de líneas y ramas; el resto sin cifra obligatoria, pero ningún flujo de dinero sin prueba.

## CI (GitHub Actions)
`pnpm install` → `lint` → `typecheck` → `test:unit` → `supabase start` + `test:rls` → `build` → `test:e2e`. Un PR no se fusiona si falla algo. Despliegue de **preview** en Vercel por PR.
