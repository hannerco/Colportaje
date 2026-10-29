# ADR-0021: Rendimiento percibido
Estado: Aceptado · Fecha: 2026-10-26 · Revisado: 2026-10-28 (región medida)

## Contexto
"Tenemos que asegurarnos que el lugar donde despleguemos esté cerca, para que no se note lentitud en la app, eso hace que la gente odie la app." El dueño además había leído que EE. UU. suele ser más rápido que São Paulo desde Colombia.

## Decisión
- Región **us-east-1 / iad1**, elegida **midiendo** (ver ADR-0002).
- **UI optimista** con TanStack Query; **miniaturas** en listas; mapa **al tocar**; caché del shell vía service worker; **lectura sin conexión**; medir en dispositivos reales (incluida la repetición de la prueba de latencia desde un celular, SG-01).

## Alternativas descartadas
São Paulo (más lejos en la práctica: ~146 ms vs ~85 ms).

## Consecuencias
Objetivos: primera interacción < 2 s en 4G; acciones de un toque < 300 ms percibidos.

## Referencias
03-arquitectura/ARCHITECTURE.md §5 · DECISION-LOG Q37 (ronda 8) y mediciones
