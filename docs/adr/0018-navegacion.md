# ADR-0018: Navegación base
Estado: Aceptado (alternativa base; el diseño decide) · Fecha: 2026-10-26

## Contexto
La crítica a Notion fue demasiados apartados. Uso real: en la calle, *Pendientes del día*, *Clientes*, *Libros en físico*, *Agregar al inventario*; de noche en escritorio, *Clientes*, *Abonos* (cuánto en efectivo y en transferencia entregar) y *Abibonos*. Los totalizadores son esporádicos. El dueño quiere el **+ Vender** central.

## Decisión
- **Móvil:** barra inferior `Hoy | Clientes | + Vender | Inventario | Más`. **Más:** Dinero, Minibooks, Calendario, Hacer inventario, Ajustes.
- **Escritorio:** menú lateral con los mismos apartados y **Dinero** como pantalla propia.
- **Abonos y Abibonos se presentan juntos como "Dinero".**
- Se pedirán **2–3 variantes** en Claude Design; el dueño elige.

## Alternativas descartadas
- *Un apartado por tabla* (como Notion).
- *Decidir si la venta empieza por cliente o por venta*: se absorbe con **+ Vender**.

## Consecuencias
Rutas en español (`/hoy`, `/clientes`, `/vender`, `/inventario`, `/dinero`…). Sujeto al diseño final.

## Referencias
DESIGN-BRIEF.md · FLOWS F-10, F-15, F-20 · DECISION-LOG Q36, Q44
