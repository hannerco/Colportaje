# HU-PAN-CLI-01 · Lista de clientes

> **Iteración 1** · **Nivel:** pantalla · **Código:** `CustomerListScreen` en `src/features/customers/screens/`; contenedor `src/app/(app)/clientes/page.tsx` · **Storybook:** `Pantallas/Clientes/Lista` · **Depende de:** HU-UI-28, HU-PAN-BASE-01 · **Back:** HU-CLI-04, HU-CLI-05, HU-CLI-11 · **Diseño:** sección «1 · Lista» de Clientes (escritorio: Escritorio, -filtro, -orden, -filtrado, -sinconexion, -sinresultados, -cargando, -vacio; móvil: Main, Estado-filtrar, Estado-ordenar, Estado-filtros-activos, Estado-sinconexion, Estado-sinresultados, Estado-cargando, Estado-vacio) · **Reglas:** BR-CUS-07, BR-CUS-13, BR-CUS-14, BR-GEN-10, I-10, I-12, I-13, I-14, RV-07

## Historia
**Como** colportor **quiero** ver a mis clientes con lo que me deben, buscar por nombre y filtrar por estado **para** saber a quién cobrar y encontrar a cualquiera en segundos.

## Contrato que usa
- `useCustomerList({ tab, includeProspects, statusFilter, sort, search })` (HU-CLI-04/05).
- `useCreateCustomer` no se usa aquí: «Nuevo cliente» navega a `/clientes/nuevo`.
- Restaurar desde Archivados: `useRestoreCustomer` (HU-CLI-11).

## Pantalla
- **`ListTemplate`:**
  - **Encabezado:** «Clientes» con el conteo de la pestaña y «Nuevo cliente» (escritorio); botón flotante en móvil.
  - **Pestañas:** Todos, Deudores, Saldados, Archivados, con los conteos de `counts`, que no cambian con la búsqueda (I-12).
  - **Barra de vista:**
    - buscador «Buscar cliente»;
    - filtro «Estado» (Pagando, Vencido, Saldado, con `statusCounts`) e «Incluir prospectos»;
    - orden: Más recientes, Última modificación, Nombre, Saldo pendiente, Próximo abono, con su sentido;
    - «Limpiar» cuando la vista no es la de por defecto (`isDefaultView`).
  - **Lista:** `ListTable kind="customer"`.
- Al abrir una fila: la ficha (HU-PAN-CLI-02) en la Ventana de detalle (escritorio, en la forma recordada) o en pantalla (móvil).
- Archivados: la fila muestra «(cliente archivado)» y su detalle ofrece Restaurar.

## Estados (cada uno es una story)
Con datos · Filtro abierto · Orden abierto · Filtros activos (Vencido y Saldado, Mayor deuda) · Sin conexión con datos · Sin resultados · Cargando · Vacío (sin ningún cliente).

## Reglas de pantalla
- **R1.** La búsqueda busca mientras se escribe y actúa dentro de la pestaña actual (I-13). En Todos incluye los prospectos que coinciden.
- **R2.** Sin conexión, «Nuevo cliente» se ve deshabilitado con «Necesita conexión» y la lista sigue consultable (BR-GEN-08).
- **R3.** Los filtros, el orden y la pestaña se reflejan en la URL (`?tab=debtors&status=overdue&sort=balance-desc&q=mar`), para volver a la misma vista con «atrás».

## No incluye
Agregar libro desde la lista; acciones por fila en escritorio.

## Criterios de aceptación
- **CA-1.** **Dado** 48 clientes (21 deudores, 9 saldados, 3 archivados), **entonces** las pestañas dicen Todos 48, Deudores 21, Saldados 9 y Archivados 3, y escribir «Mar» en el buscador no cambia esos números.
- **CA-2.** **Dado** el filtro «Vencido» y el orden «Saldo pendiente» descendente, **entonces** se ven los chips activos, la lista ordenada y «Limpiar»; al pulsar «Limpiar» vuelve la vista por defecto.
- **CA-3.** **Dado** móvil, **entonces** cada fila muestra emoji o persona, nombre, primer libro + «+N» y «Debe» sobre el saldo, y el botón flotante es «Nuevo cliente».
- **CA-4.** **Dado** escritorio, **cuando** pulso un nombre, **entonces** la ficha se abre en la Ventana de detalle y la fila queda marcada.
- **CA-5.** **Dado** una búsqueda sin coincidencias, **entonces** se ve «Sin resultados para «Marta»» con «Quitar filtros».

## Cambios por iteración
*(vacío)*

## Terminado cuando
Se cumple `00-REGLAS-COMUNES-FRONT.md` §13 y la E2E «Búsqueda difusa de clientes» (TESTING.md, flujo 8) pasa en móvil y escritorio.
