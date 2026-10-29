# ADR-0012: Calendario con tres tipos de evento
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
El texto original pedía distinguir abonos y capacitaciones, con recordatorios. Luego el dueño añadió **visitas** (volver a ver a un cliente o prospecto) y precisó que la visita no es una composición del cliente sino una **agregación**, igual que el abono.

## Decisión
- **Abono programado:** derivado de `payment` (`status = scheduled`, por `due_date`); no hay entidad de evento duplicada.
- **Visita:** `customer_id` **opcional** + etiqueta libre; fecha, hora opcional, nota, estado; sobrevive al cliente; convertible en cliente.
- **Capacitación:** título, lugar/empresa, fecha **y hora**, notas.
- **Recordatorios:** inicio del día (**07:00 Bogota**), un día antes, una semana antes o personalizado, solo para visitas y capacitaciones; **ninguno por defecto** (se ofrece al crear). Los abonos usan siempre inicio del día. En **F1 se muestran dentro de la app**; **push en F2**.
- La semana del calendario empieza el **domingo**; el formato de hora (12 h/24 h) es una preferencia del usuario (ADR-0030).
- **Hoy** (también "Pendientes del día") resume cobros, vencidos, visitas, capacitaciones y recordatorios.

## Alternativas descartadas
- *Tabla única de eventos*: duplicaría datos de abonos.
- *Visita obligatoriamente ligada a un cliente*: impide agendar con personas aún no registradas.
- *Push desde la v1*: requiere servidor de envío y PWA instalada en iOS.

## Consecuencias
Los recordatorios se guardan desde la v1 para que F2 solo añada el envío.

## Referencias
BR-CAL-01..07 · FLOWS F-18..F-20 · DECISION-LOG Q19, Q27, Q31, Q39
