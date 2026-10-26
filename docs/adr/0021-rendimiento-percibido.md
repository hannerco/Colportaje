# ADR-0021: Rendimiento percibido
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
"Tenemos que asegurarnos que el lugar donde despleguemos esté cerca, para que no se note lentitud en la app, eso hace que la gente odie la app."

## Decisión
Regiones **São Paulo** (Supabase `sa-east-1`, Vercel `gru1`); **UI optimista** con TanStack Query; **miniaturas** en listas; mapa **al tocar**; caché del shell vía service worker; medir en dispositivos reales antes de lanzar.

## Alternativas descartadas
Regiones por defecto en EE. UU. (latencia perceptible desde Colombia).

## Consecuencias
Objetivos: primera interacción < 2 s en 4G; acciones de un toque < 300 ms percibidos.

## Referencias
ARCHITECTURE.md §5 · DECISION-LOG Q50
