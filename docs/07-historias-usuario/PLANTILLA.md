# HU-<ÉPICA>-<NN> · <Título corto en infinitivo o sustantivo>

> **Épica:** <módulo> · **Depende de:** <HU> · **Reglas:** <BR-*, ADR-*, AF-*> · **Diseño:** <nombre de la pantalla en el lienzo, o "sin pantalla" + archivo de `04-diseno/pendientes/`>

## Historia
**Como** <usuario> **quiero** <capacidad> **para** <beneficio>.

## Contexto
Lo que la IA no puede deducir del código: por qué existe, qué decidió el dueño, qué trampas hay. Cortas y con referencias.

## Alcance
- **Incluye:** …
- **No incluye:** … (explícito; los agentes tienden a hacer de más)

## Contrato para el front
### Lecturas
- `nombreDeLectura(params)` → forma del modelo de vista.
### Acciones
- `nombreDeAccion(input)` → `Result<salida, AppError>` · errores propios: `CODIGO_1`, `CODIGO_2`.

## Reglas (el sistema DEBE…)
- **R1.** CUANDO <evento/condición>, el sistema DEBE <comportamiento>. (BR-…)

## Criterios de aceptación
- **CA-1.** **Dado** <estado con números concretos>, **cuando** <acción>, **entonces** <resultado comprobable>.

## Casos borde y errores
- …

## Datos
Tablas, columnas, índices, funciones SQL y RLS que crea o cambia (migración nueva).

## Cómo se verifica
- **Dominio (Vitest):** …
- **Integración (Supabase local):** …

## Terminado cuando
Se cumple la definición de terminado de `00-REGLAS-COMUNES.md` §10 y además: …
