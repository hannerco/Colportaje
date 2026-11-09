# ADR-0045: Plan de abonos: días de pago, corregir frente a prorrogar y cliente existente
Estado: Aceptado · Fecha: 2026-11-08 · Amplía ADR-0039

## Contexto
ADR-0039 dejó abiertas las fechas que sugiere el plan y trató todo cambio de fecha como prórroga. Al revisar el diseño (ronda 26) el dueño explicó que "quincenal" y "mensual" en Colombia se refieren a los días de pago (el 15 y el 30), que al crear un cliente un cambio de fecha es solo una corrección, y que la ficha de un cliente existente también debe poder programar.

## Decisión
- **Días sugeridos (configurables):** quincenal = **15 y 30** de cada mes (en febrero, el último día); mensual = **30** (febrero, último día); semanal = cada **7 días**. El primer abono por defecto es el día de pago más cercano **después de hoy**. Si se cambia una fecha, las siguientes caen en el siguiente día de pago con una separación mínima (configurable: 7 días en quincenal, 20 en mensual). Domingos y festivos no se mueven. Fuente: práctica de nómina en Colombia (pago el 15 y el último día; mes de 30 días).
- **Ninguna fecha de abono programado puede ser anterior a hoy** (America/Bogota), sea al programar, al corregir o al prorrogar.
- **Durante la creación** del cliente: aplicar o cambiar el plan **reemplaza** todos sus abonos programados; cambiar una fecha es una **corrección** (cambia `due_date` y `original_due_date`, sin historial; puede ir hacia atrás sin pasar de hoy).
- **Con el cliente ya guardado:** un plan nuevo reparte **solo lo sin programar** y no toca los abonos existentes; cambiar una fecha es una **prórroga** (BR-PAY-06). El valor de un abono programado se puede editar siempre (BR-PAY-11).
- **Nunca** se regenera solo: si el saldo cambia, aparece "sin programar" o la alerta BR-PAY-13.
- El plan exige **saldo > 0**; un abono suelto se puede programar siempre, aunque no haya libro (aviso "Aún no tiene libro").
- La frecuencia **no se guarda** en el abono (no es una propiedad).

## Alternativas descartadas
- *Sumar 7, 14 o 30 días a la fecha de venta:* no coincide con cuándo cobran los clientes.
- *Toda corrección como prórroga:* llenaría el historial de "prórrogas" que solo fueron errores al crear.

## Consecuencias
- El front decide qué acción usar (corregir o prorrogar) porque la base no guarda si el cliente está en creación (ADR-0038).
- OQ-33 queda resuelta por esta decisión.

## Referencias
BR-PAY-06, BR-PAY-11, BR-PAY-15 · ADR-0039 · AF-113 · DECISION-LOG ronda 26 (Q12–Q15, Q45–Q48)
