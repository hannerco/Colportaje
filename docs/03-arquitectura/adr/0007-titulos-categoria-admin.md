# ADR-0007: Títulos con categoría y catálogo de admin
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
El texto original dejaba abierto quién agrega los Títulos (colportor, líder o Emprendum). Hay libros **culturales** (~50 % de ganancia, cuentan para la bonificación), **religiosos** (~15 %) y **minibooks**; el líder lleva las cuentas aparte.

## Decisión
- `title.category` ∈ {`cultural`, `religious`, `minibook`} (reemplaza el booleano "Religioso/Cultural" y el flag de minibook).
- El **catálogo lo gestiona el admin** en `/admin`: crear, editar y **desactivar** (no borrar). La carga inicial es un **script**.
- Precio público obligatorio y > 0 salvo en minibooks (puede ser nulo); precio colportor ≥ 0.
- Lectura del catálogo: todo autenticado. Escritura: solo admin.

## Alternativas descartadas
- *Cada colportor crea sus Títulos*: catálogos duplicados y precios inconsistentes.
- *El líder crea los Títulos*: puede generar problemas (palabras del dueño); queda para fase 3 evaluar.

## Consecuencias
Los ejemplares de un título desactivado se conservan. Cambios de precio no afectan lo ya recibido (ADR-0008).

## Referencias
BR-TIT-01..07 · RQ-TIT-01..03 · DECISION-LOG Q17, Q23 y "categorías"
