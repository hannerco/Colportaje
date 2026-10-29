# ADR-0015: Totalizadores dentro de "Hacer inventario"
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
El texto original pedía los 8 totalizadores "cada uno en su propio apartado". El dueño aclaró que los abría esporádicamente, que **no quiere cifras de dinero a la vista** (es la emoción del cuadre con el líder) y que podría pedir borrar totalizadores en el futuro. Además existe el proceso "Hacer inventario" con dos vistas (Inventario = culturales; TODOS = culturales + religiosos).

## Decisión
- No hay pantalla "Totalizadores". Viven en **Hacer inventario**, con selector **Todos | Culturales | Religiosos** (aplica a 1, 4, 5, 6, 7; los 2, 3 y 8 son globales). Minibooks siempre aparte, con totalizadores propios.
- Cada totalizador es una **pieza registrada** (`features/totals/registry.ts`): quitar o añadir uno cuesta una línea.
- Se añaden las líneas **"Perdidos asumidos"** y **"A responder al líder"** (= Mi compra + perdidos), fuera de los 8 originales (ADR-0028).
- Vista en vivo; se comparte con **"Copiar resumen"** (texto para pegar en WhatsApp). **PDF y CSV son mejora futura** declarada. **Sin cortes históricos** en la v1.

## Alternativas descartadas
- *Apartado por totalizador*: contradice la crítica de Notion (demasiados apartados).
- *Mostrarlos en Hoy*: exhibe dinero todo el tiempo.

## Consecuencias
Identidad de control `Recibidos = Vendidos + En físico + Con novedad + Perdidos`.

## Referencias
BR-GOAL-02..06, BR-COPY-14 · FLOWS F-22 · RQ-TOT-01..04 · DECISION-LOG Q41, Q43, Q48
