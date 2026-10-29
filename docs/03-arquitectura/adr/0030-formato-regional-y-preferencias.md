# ADR-0030: Formato regional y preferencias de usuario
Estado: Aceptado · Fecha: 2026-10-28

## Contexto
La app es para Colombia. El dueño pidió que la semana empiece el domingo y que cada usuario pueda elegir 12 h o 24 h.

## Decisión
- Semana desde **domingo**; fechas `dd/mm/aaaa`; zona **America/Bogota**; **hora 12 h/24 h elegible en Ajustes** (`profile.time_format`, por defecto 12 h); tema claro/oscuro **automático**; todo en español; dinero COP entero `$1.250.000`.
- "Inicio del día" para recordatorios = 07:00.
- Todo "hoy" y toda comparación por día pasan por `domain/time`.

## Alternativas descartadas
Zona del dispositivo (errores en viajes y servidores); formato fijo de hora.

## Consecuencias
Pruebas de medianoche Bogotá ≠ UTC. Las preferencias viven en `profile`.

## Referencias
BR-GEN-05/07 · RQ-ACC-07, RQ-QLT-05 · AF-102, AF-103 · DECISION-LOG Q3
