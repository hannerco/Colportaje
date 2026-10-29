# ADR-0032: Principios de diseño (minimalismo, color con propósito, anti-IA)
Estado: Aceptado · Fecha: 2026-10-29

## Contexto
El primer resultado de Claude Design (`Colportor.html`) no convenció al dueño: demasiada información y texto en móvil, colores en todas partes, "Vender" repetido, calendario redundante dentro de Hoy, sidebar poco parecido al de Notion y rasgos típicos de interfaz generada por IA. Parte de la causa estaba en el brief v1 (pedía subtítulos, desglose y una variante "Hoy denso" con semana). Se investigaron los tells de "hecho con IA" y las leyes de UX.

## Decisión
- **Lista negra anti-IA** y **dirección explícita** (la mejor defensa según las fuentes): gradientes/glow/glass, emojis como íconos, badges y círculos tintados por todas partes, todo en tarjetas, muchos tonos, fuente por defecto de IA, subtítulos de relleno, dobles barras.
- **Color con propósito:** base neutra; estados y categorías en gris; **un acento único** (variantes: casi negro y **#092e53**); **rojo** solo para vencido/error/destructivo; y como **único** color de categoría, un **microícono** (solo el trazo) que distingue cobro / visita / capacitación.
- **Fuente del sistema** (como Notion) en vez de Inter.
- **Presupuesto de densidad móvil:** filas de 2 líneas y una señal; sin subtítulos, contadores ni explicaciones permanentes (ⓘ bajo demanda); máximo 5 bloques; divulgación progresiva.
- **Escala tipográfica** (2026-10-29): móvil 36 / 28 / **17 principal** / **15 secundario** / 13 mínimo; escritorio 40 / 32 / 16 / 14 / 13; campos ≥ 16 px; `rem`. El primer diseño usó sobre todo 13 px (demasiado pequeño) frente a iOS (17/15/13 pt) y Material (cuerpo 16 sp).
- **Más de 5 opciones → grupos** (sidebar tipo Notion con secciones plegables; "Más" con grupos de máximo 4).
- **Una acción principal:** "Vender" aparece una sola vez; cada pantalla tiene como máximo una acción de contexto destacada; **Hoy no tiene botones**.
- **Hoy sin redundancia:** una lista cronológica de hoy, un aviso único de cobros vencidos que lleva a Dinero ▸ Por cobrar ▸ Vencidos, sin semana ni agenda aparte; "Agregar" vive en Inventario.
- **Variantes desde el inicio y realmente distintas:** A casi negro, B marino #092e53, C editorial (sin tarjetas, Vender flotante).
- **Leyes de UX** que gobiernan las decisiones: Hick, Miller, Fitts, Jakob, Von Restorff, proximidad/región común, Tesler, Doherty, meta-gradiente, Zeigarnik, estético-usabilidad, Nielsen #8.

## Alternativas descartadas
- *Mantener el diseño v1 y pulirlo*: heredaba los defectos de raíz.
- *Blanco y negro total*: el dueño valora el microcolor que distingue tipos de evento.
- *Listar los vencidos uno por uno en Hoy*: recarga y duplica Dinero.
- *Primero una sola dirección*: el dueño prefiere ver variantes desde el principio.

## Consecuencias
`04-diseno/DESIGN-BRIEF.md` v2 y `04-diseno/PROMPT-CLAUDE-DESIGN.md` reemplazan a la v1. Los resultados se revisan contra la lista de la sección 15 del brief (renderizando el HTML).

## Referencias
04-diseno/DESIGN-BRIEF.md · BR-GEN-10..12, BR-CAL-07..09 · DECISION-LOG ronda 11 · ADR-0029, ADR-0031
