# HU-PAN-DIN-01 · Dinero: resumen y abonos de clientes

> **Iteración 1** · **Nivel:** pantalla · **Código:** `MoneyScreen` en `src/features/money/screens/`; contenedor `src/app/(app)/dinero/page.tsx` · **Storybook:** `Pantallas/Dinero/Abonos de clientes` · **Depende de:** HU-UI-25, HU-UI-28, HU-PAN-BASE-01 · **Back:** HU-DIN-02, HU-DIN-03 · **Diseño:** secciones «1 · Abonos de clientes», «2 · Por cobrar y Cobrar» y «5 · Estados» (escritorio: Dinero-d-todos, -por-entregar, -entregados, -cancelados, -por-cobrar, -vencidos, -sin-programar, -cargando, -vacio, -sinconexion; móvil: Dinero-m-res-b, -res-b-abierto, -todos, -fila-icono, -fila-estados, -ap-*) · **Reglas:** BR-DEP-13, BR-DEP-14, BR-CAL-08, ADR-0046, I-11, I-12

## Historia
**Como** colportor **quiero** ver cuánto tengo que entregar al líder y la lista de abonos de mis clientes por estado **para** cobrar lo que se venció y entregar lo cobrado.

## Contrato que usa
`useMoneySummary`, `usePaymentsList(params)` (vistas Todos, Por cobrar, Por entregar, Entregados, Cancelados; filtro Vencidos y Método; orden), `useUnscheduledCustomers` (lista «Sin programar»).

## Pantalla
- **Encabezado:** «Dinero».
  - **Escritorio:** `MoneySummary` arriba de la lista.
  - **Móvil:** botón de resumen «Por entregar $385.000» que abre la hoja con `MoneySummary` (opción 3A, «Resumen B»).
- **Segmento:** «Abonos de clientes | Abibonos» (Abibonos: HU-PAN-DIN-03).
- **Pestañas:** Todos, Por cobrar, Por entregar, Entregados, Cancelados (FD-01), con conteos que no cambian con la búsqueda (I-12).
- **Por cobrar:**
  - filtro «solo Vencidos»;
  - la lista «Sin programar» (clientes con saldo sin abonos programados);
  - acción «Cobrar» en la fila o en el detalle (HU-PAN-DIN-02).
- **Lista:** `ListTable kind="payment"`. Si el lienzo de escritorio muestra columnas que la Fila de lista de la biblioteca no tiene (p. ej. método o fecha real), **se pide al dueño agregarlas a la ficha** antes de programarlas: no se agregan sueltas.
- **«Entregar al líder»:** abre Nuevo Abibono precargado (HU-PAN-DIN-04).
- Abrir una fila abre el detalle del abono (HU-PAN-DIN-02).

## Estados (stories)
Todos · Por cobrar · Solo vencidos · Sin programar · Por entregar (con ⓘ abierto) · Entregados · Cancelados · Cargando · Vacío · Sin conexión · Móvil con la hoja de resumen abierta.

## No incluye
Deslizar en móvil (HU-PAN-DIN-02); el «Totalizador B» del lienzo (`Dinero-d-tot-b`, alternativa no elegida); minibooks (FD-10).

## Criterios de aceptación
- **CA-1.** **Dado** Por entregar $385.000 ($280.000 efectivo + $105.000 transferencia), **entonces** el resumen lo muestra y «Entregar al líder» abre Nuevo Abibono con esos abonos.
- **CA-2.** **Dado** la pestaña Por cobrar con el filtro Vencidos, **entonces** solo se ven abonos con la Pastilla «Vencido».
- **CA-3.** **Dado** abonos cancelados, **entonces** solo aparecen en la pestaña Cancelados y no cuentan en Todos ni en el Dinero total.
- **CA-4.** **Dado** móvil, **cuando** pulso «Por entregar $385.000», **entonces** sube la hoja con el medidor y las tarjetas en forma leyenda.

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13.
