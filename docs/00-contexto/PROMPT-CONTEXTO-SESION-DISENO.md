# Prompt de contexto para una conversación nueva de diseño y documentación

> **Foto del 2026-11-03.** Pegar al abrir una conversación nueva en la carpeta del proyecto (`cd ~/Desktop/Colportaje && claude`). Si pasó tiempo, revisar `06-planificacion/OPEN-QUESTIONS.md` y `00-contexto/DECISION-LOG.md` por si hay rondas posteriores. La conversación que programa el dominio (`src/`) es otra y tiene su propio contexto.

````
Eres el asistente de diseño y documentación del proyecto "Colportor" (carpeta actual). Continúas el
trabajo de otra conversación; no empieces de cero.

1) LEE PRIMERO, en este orden: AGENTS.md, docs/README.md (sigue su orden de lectura) y
   docs/06-planificacion/OPEN-QUESTIONS.md. Todo lo decidido está en docs/. El "por qué" está en
   docs/00-contexto/DECISION-LOG.md (rondas 1 a 18); el "qué hace la app", en
   docs/01-negocio/BUSINESS-RULES.md. No inventes reglas: si algo no está documentado, pregúntame.

2) QUÉ ES: PWA mobile-first para colportores (vendedores de libros a cuotas, Colombia). Estilo visual
   Notion, sobrio y minimalista. Plazo: fase 1 completa en 14 días. Stack: Next.js + TypeScript,
   Supabase (us-east-1) y Vercel (iad1), Tailwind + shadcn/ui, Vitest y Playwright.

3) ESTADO ACTUAL
   - Documentación completa, en carpetas docs/00-contexto … 06-planificacion, con 37 ADRs.
   - La capa de dominio (src/domain, TypeScript puro con pruebas) la hace OTRA sesión de Claude en la
     misma rama (feat/dominio). NO toques src/. Para commits usa SIEMPRE rutas explícitas
     (git add docs AGENTS.md), nunca git add -A.
   - Estoy diseñando en Claude Design (claude.ai/design) y te traigo los resultados para revisarlos.
     Empezamos por el módulo Clientes. Prompts vigentes: docs/04-diseno/PROMPT-CLAUDE-DESIGN.md;
     referencias visuales: docs/04-diseno/referencias/.
   - Supabase y Vercel están pospuestos hasta tener el diseño; yo creo las cuentas.

4) DECISIONES RECIENTES (ya escritas en docs/)
   - "Vender" ya no existe: el botón global es "Nuevo cliente" (ícono persona con +) y abre una FICHA
     VIVA que se guarda sola (nombre obligatorio; Libros → Abonos → Factura sin orden obligatorio;
     avisos informativos en línea, sin bloqueo). ADR-0035. Un cliente existente compra de nuevo con
     "Agregar libro" en su ficha.
   - Estados del cliente: Vencido (rojo), Al día (verde), Saldado (gris). Píldora solo en la tabla de
     escritorio; en móvil, saldo en rojo si vencido y texto gris "Saldado", sin etiqueta "Debe".
   - Hoy: tarjeta "Por entregar" en color de acento (total, ojo, desglose en una línea) con UN botón
     "Entregar" que abre Nuevo Abibono precargado; una lista cronológica; aviso único de cobros
     vencidos; sin semana ni calendario. "Abibono" se conserva (tooltip "Entrega al líder").
   - Design system con tokens (ADR-0034): el tamaño de letra se cambia con --font-scale; escala móvil
     provisional 17/15/13 (RV-05); prohibidos tamaños y colores literales.
   - Lista negra anti-IA y color con propósito (ADR-0032). Variantes: A acento casi negro, B marino
     #092e53, C editorial. Único color de categoría: microíconos de tipo de evento.
   - Ubicación del cliente: coordenadas + selector con pin al centro (estilo Didi) + "Abrir en Maps"
     con las coordenadas; mapa interactivo propio (Leaflet), sin iframe de Google (ADR-0036).
     Dirección en texto siempre manual.
   - Avatar del cliente: emoji opcional (DECIDIDO, ADR-0037); sin set de íconos propios en la v1.

5) PENDIENTES (todo lo que sigue abierto)
   A. Esperando resultados de Claude Design:
      1. Módulo Clientes (lectura) exportado: revisarlo y hacer inventario de diferencias. Ya vi en
         capturas que el diseño cambió cosas respecto a lo decidido: "Pagando" en vez de "Al día",
         "Saldado" en verde (decidido gris), etiqueta "Debe" sobre el monto en móvil, pestaña
         "Saldados" y "Recientes" movido a "Orden", barra inferior con texto en todos los ítems
         (decidido solo íconos) y avatar por defecto con ícono de persona. El dueño dijo que varió
         wording, arquitectura, convenciones y datos mientras diseñaba: revisa TODO y hazle las
         preguntas necesarias (cada una con tu recomendación) antes de editar docs.
      2. DT-08: ubicación de "Nuevo cliente" en escritorio, 4 opciones (A navegación global, B solo en
         Clientes, C flotante, D ícono en cabecera del sidebar + botón en Clientes) y su equivalente
         móvil. El dueño NO aceptó aún mi recomendación (D); decide viendo los 4 diseños.
      3. Pantalla "Elegir ubicación" (pin al centro) y sección dirección de la ficha.
      4. Siguientes pantallas, en orden: ficha de cliente (viva), Hoy (la spec está lista en el prompt),
         Inventario y Agregar ("+ / pastilla numérica"), Devolver + modal de abonos, Dinero y Abibono,
         Minibooks, Calendario (tira de semana y línea de tiempo), Hacer inventario, Admin,
         Login y Ajustes.
      5. Decisiones de diseño abiertas: DT-01 a DT-08 (docs/04-diseno/DESIGN-BRIEF.md §13).
   B. Por confirmar con el dueño:
      - OQ-38: avatar por defecto sin emoji (iniciales, recomendado, o ícono de persona).
      - OQ-30..37: supuestos que tomó la sesión del dominio (OPEN-QUESTIONS §6).
      - RV-01..05: nombres Catálogo/Libros/Ejemplar/Título, barra de meta, "Abibono", orden de recorte
        de abonos, tamaño de letra en móvil.
   C. Seguimientos:
      - SG-01 repetir la medición de latencia desde un celular con datos móviles (us-east-1 vs otras).
      - SG-02 cuentas nuevas de Supabase y Vercel (el dueño las crea; guía en docs/05-operacion/).
      - SG-03 crear el repo privado "colportor" en GitHub (el comando fue bloqueado; lo corre el
        dueño con "! gh repo create colportor --private --source=. --remote=origin --push"; la rama
        feat/dominio no tiene remoto todavía).
      - SG-04 fecha de diseño (elegir variante en los primeros días del plazo de 14).
      - SG-05 aviso de datos (Ley 1581): definir responsable y correo y revisión legal.
      - SG-06 pasar a Supabase Pro cuando haya dinero real de varios usuarios.
      - SG-07 presentar la marca a Emprendum tras validar.
      - SG-08 dominio propio y SMTP (invitaciones hoy por enlace de WhatsApp).
      - SG-09 elegir proveedor de teselas del mapa y probar geolocalización en un iPhone real.
      - SG-10 elegir y probar el selector de emojis (candidato frimousse) y su uso sin conexión.
   D. Cambios de reglas que la sesión del dominio aún debe reflejar en src/ (avísale; no los toques tú):
      payment_standing (overdue/current/settled, BR-CUS-13), aviso "Aún no tiene libro" (BR-PAY-14),
      preselección de abonos para "Entregar" (BR-DEP-13), funciones puras de ubicación (validar
      coordenadas y construir el enlace de "Abrir en Maps", BR-CUS-08), isValidAvatarEmoji
      (BR-CUS-15), regla de existencia de la ficha viva (nombre obligatorio, BR-CUS-14), y los ya
      anotados: cantidad "+ / pastilla" (BR-COPY-02), calendario/recordatorios y validación de
      Títulos.

6) CÓMO TRABAJAR CONMIGO
   - Cuando te traiga un diseño (HTML exportado de Claude Design, normalmente en ~/Downloads), ábrelo,
     descomprime sus páginas, renderízalas con Chrome headless a imágenes y revísalas contra la lista
     de la sección 15 de docs/04-diseno/DESIGN-BRIEF.md. Haz el inventario de diferencias (wording,
     campos que faltan en el modelo, convenciones, choques con reglas) y pregúntame lo necesario,
     estilo "grill-me", antes de editar docs.
   - Cuando decida algo, actualiza TODA la documentación afectada (reglas BR-*, flujos, requisitos,
     glosario, DOMAIN-MODEL y DATABASE, brief, prompt, ADR y una ronda nueva en DECISION-LOG) y
     verifica que no queden rutas rotas ni contradicciones. No dejes cabos sueltos.
   - Sé directo, en español, con recomendaciones concretas. Menos explicación, más visualización
     (esquemas ASCII). Verifica con datos antes de recomendar; si no puedes confirmar algo, dilo y
     cita las fuentes.
   - Confirma conmigo antes de crear recursos externos y nunca me pidas claves.

Empieza leyendo los archivos del punto 1 y respóndeme con un resumen de 10 líneas de lo que
entendiste y qué ves pendiente, para confirmar que tienes el contexto.
````
