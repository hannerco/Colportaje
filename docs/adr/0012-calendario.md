# ADR-0012: Calendario con tres tipos de evento
Estado: Aceptado · Fecha: 2026-10-26

## Contexto
El texto original pedía distinguir abonos y capacitaciones, con recordatorios. Luego el dueño añadió **visitas** (volver a ver a un cliente o prospecto) y precisó que la visita no es una composición del cliente sino una **agregación**, igual que el abono.

## Decisión
- **Abono programado:** derivado de `payment` (`status = scheduled`, por `due_date`); no hay entidad de evento duplicada.
- **Visita:** `customer_id` **opcional** + etiqueta libre; fecha, hora opcional, nota, estado; sobrevive al cliente; convertible en cliente.
- **Capacitación:** título, lugar/empresa, fecha **y hora**, notas.
- **Recordatorios:** inicio del día, un día antes, una semana antes o personalizado, solo para visitas y capacitaciones. Los abonos usan siempre inicio del día. En **F1 se muestran dentro de la app**; **push en F2**.
- **Hoy** (también "Pendientes del día") resume cobros, vencidos, visitas, capacitaciones y recordatorios.

## Alternativas descartadas
- *Tabla única de eventos*: duplicaría datos de abonos.
- *Visita obligatoriamente ligada a un cliente*: impide agendar con personas aún no registradas.
- *Push desde la v1*: requiere servidor de envío y PWA instalada en iOS.

## Consecuencias
Los recordatorios se guardan desde la v1 para que F2 solo añada el envío.

## Referencias
BR-CAL-01..07 · FLOWS F-18..F-20 · DECISION-LOG Q19, Q27, Q31, Q39
