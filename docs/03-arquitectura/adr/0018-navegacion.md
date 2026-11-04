# ADR-0018: Navegación base
Estado: Aceptado (alternativa base; el diseño decide) · Fecha: 2026-10-26

## Contexto
La crítica a Notion fue demasiados apartados. Uso real: en la calle, *Pendientes del día*, *Clientes*, *Libros en físico*, *Agregar al inventario*; de noche en escritorio, *Clientes*, *Abonos* (cuánto en efectivo y en transferencia entregar) y *Abibonos*. Los totalizadores son esporádicos. El dueño quiso primero un **+ Vender** central; luego lo convirtió en **Nuevo cliente** (ADR-0035).

## Decisión
- **Móvil:** barra inferior `Hoy | Clientes | Inventario | Más` + botón flotante **Nuevo cliente** (ADR-0035), **íconos con su nombre (label)** (decisión del dueño, ronda 19; antes solo íconos; el título está en la cabecera). **Más:** Dinero, Minibooks, Calendario, Hacer inventario, Ajustes.
- **Escritorio:** menú lateral con ícono y texto y **Dinero** como pantalla propia.
- Cada sección tiene un **ícono propio**. Estilo visual **Notion** y una **barra de vista** única en todos los módulos (ADR-0029).
- **Abonos y Abibonos se presentan juntos como "Dinero".**
- Se pedirán **2–3 variantes** en Claude Design; el dueño elige.

## Alternativas descartadas
- *Un apartado por tabla* (como Notion).
- *Decidir si la venta empieza por cliente o por venta*: se resuelve con **Nuevo cliente** (la ficha del cliente es el centro; ADR-0035).

## Consecuencias
Rutas en español (`/hoy`, `/clientes`, `/clientes/nuevo`, `/inventario`, `/dinero`…). Sujeto al diseño final.

## Referencias
04-diseno/DESIGN-BRIEF.md · FLOWS F-10, F-15, F-20 · DECISION-LOG Q36, Q44
