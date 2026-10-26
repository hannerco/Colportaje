# Estrategia de pruebas

Requisito del dueño: **la app debe tener pruebas**. Se escriben **junto con** el código, no después. El orden de prioridad refleja dónde está el riesgo (dinero y datos del cliente).

## Pirámide
| Nivel | Herramienta | Qué cubre | Cuándo corre |
|---|---|---|---|
| **Unitarias de dominio** | Vitest | Todas las reglas `BR-*` y derivaciones (sin red, sin UI) | Cada commit (pre-push) y CI |
| **Integración de datos/RLS** | Vitest + Supabase local (`supabase start`) | Políticas RLS, checks, triggers, funciones RPC (vender, confirmar Abibono, entrada de minibooks), numeración de ejemplares | CI |
| **Componentes** | Testing Library | Formularios críticos, tooltips, estados vacíos | CI |
| **E2E** | Playwright (viewport móvil + escritorio) | Flujos clave de `FLOWS.md` | CI (antes de desplegar) |
| **Accesibilidad / PWA** | axe + Lighthouse CI | Contraste, instalable, rendimiento | CI (informativo → bloqueante al madurar) |

## Prioridad 1 — Dominio (casos mínimos obligatorios)
Un archivo por módulo en `src/domain/**/*.test.ts`. Cada prueba cita la regla.

- **Saldo** (`BR-CUS-04`): sin pagos; con parciales; con prórroga; con precio acordado distinto; tras devolución; **saldo a favor**; con `client_credit`; varios ejemplares.
- **Precio** (`BR-PRC-*`): igual / mayor / menor; precio público nulo (minibook) no aplica.
- **Antigüedad** (`BR-COPY-13`): límites exactos 0,2,3,6,7,12,13 días; umbrales personalizados; cambio de zona horaria (medianoche Bogota ≠ UTC).
- **Abonos** (`BR-PAY-*`): nacimiento por tipo, cobrar, parcial (sugerencia, no creación), sobrepago, prórroga (la original no cambia; historial), vencido, bloqueo por entrega.
- **Abibono** (`BR-DEP-*`): autocálculo por método, edición manual, total derivado, esperado/diferencia (faltante, sobrante, cero), nota obligatoria, **donación sin abonos**, recibo obligatorio, un abono en un solo Abibono, minibooks parciales, `client_credit` excluido.
- **Minibooks** (`BR-MBK-*`): consumo FIFO de stock, bloqueo sin stock, monto 0, ingresos/costo/ganancia neta, no afecta totalizadores de libros.
- **Totalizadores y meta** (`BR-GOAL-*`): los 8, con selector de categoría, exclusión de minibooks, progreso de meta (0 %, 25 %, ≥100 %), **identidad** `Recibidos = Vendidos + En físico + Con novedad + Perdidos`.
- **Calendario** (`BR-CAL-*`): qué aparece en "Hoy", recordatorios activos/descartados, visita sin cliente.
- **Máquinas de estado**: transiciones válidas e inválidas de `copy`, `payment`, `leader_deposit`, `visit`.
- **Propiedades (property-based, `fast-check`)**: nunca saldo derivado inconsistente con la suma de piezas; `total = cash + transfer`; reorden de pagos no cambia el saldo.

## Prioridad 2 — RLS y base de datos (obligatorio antes de producción)
Carpeta `tests/rls/`. Con dos usuarios A y B sembrados:
- A no puede `select/insert/update/delete` filas de B en **ninguna** tabla con `owner_id`.
- Un no-admin no puede escribir `title`, `app_settings`, `user_role`.
- Un admin **no** lee datos de negocio de otros.
- Storage: A no puede leer/escribir bajo el prefijo de B.
- Checks y triggers: no se puede editar/borrar un `payment` `delivered`; no se confirma un Abibono sin recibo o con diferencia sin nota; numeración consecutiva sin huecos ni reutilización ni condiciones de carrera (inserciones concurrentes); `copy` `in_stock` sin cliente.

## Prioridad 3 — E2E (Playwright, móvil y escritorio)
Datos de prueba sembrados y reiniciables. Flujos mínimos:
1. **Invitación → login → Hoy.**
2. **Agregar a inventario** (favorito y lista) y números consecutivos.
3. **+ Vender** de punta a punta (cliente nuevo; cliente existente que recompra; con y sin cuota inicial) y verificación de saldo.
4. **Cobrar** un abono, parcial, y **prórroga**.
5. **Abibono** completo: autocálculo, diferencia con nota, recibo, confirmación y bloqueo.
6. **Minibooks**: entrada, bloqueo sin stock, asignación parcial al Abibono, `client_credit`.
7. **Devolución** con Abibono ya confirmado: abonos y Abibono intactos, saldo a favor.
8. **Búsqueda difusa** de clientes.
9. **Hacer inventario** y selector de categorías; barra de meta.
10. **Modo admin**: crear título, cambiar meta/umbrales; un no-admin no ve ni puede hacerlo.

## Convenciones de pruebas
- Nombre: `describe('<módulo>')` / `it('BR-XXX-NN: <comportamiento>')`.
- Datos con **builders/fábricas** (`aCustomer()`, `aCopy()`, `aPayment()`), nunca JSON gigante copiado.
- Sin dependencia del reloj real: `today` se inyecta (zona Bogota).
- Cada bug corregido añade una prueba que lo reproduce **antes** del arreglo.
- Cobertura orientativa: dominio **≥ 95 %** de líneas y ramas; el resto sin cifra obligatoria, pero ningún flujo de dinero sin prueba.

## CI (GitHub Actions)
`pnpm install` → `lint` → `typecheck` → `test:unit` → `supabase start` + `test:rls` → `build` → `test:e2e`. Un PR no se fusiona si falla algo. Despliegue de **preview** en Vercel por PR.
