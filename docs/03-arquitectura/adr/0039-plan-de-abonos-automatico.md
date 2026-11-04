# ADR-0039: Plan de abonos automático
Estado: Aceptado · Fecha: 2026-11-04

## Contexto
El diseño de Crear cliente añadió un generador: frecuencia (semanal, quincenal, mensual), valor de cada abono y fecha del primer abono, con la tabla "Así quedan los abonos". BR-PAY-03 solo describía abonos programados creados uno a uno. Los libros suelen costar múltiplos de $1.000 y el dueño no quiere abonos con centenas (por ejemplo $15.900) salvo cuando es inevitable.

## Decisión
- El generador crea abonos `scheduled` **normales**; el plan **no** es una entidad ni se guarda.
- Número de abonos = `saldo ÷ valor` **hacia abajo** (mínimo 1). Lo que sobre lo suma el **abono con la fecha más próxima**; los abonos suman exactamente el saldo. Ejemplo: $140.000 con $30.000 → $50.000, $30.000, $30.000, $30.000.
- La fila del abono mayor **no lleva marca**. El valor de cada abono es múltiplo de $1.000.
- La regla de múltiplos de $1.000 aplica **solo al cálculo automático**. Editar un abono a mano acepta cualquier entero; los pagos reales (cuota inicial, cobros, extras) también.
- Cambiar una fecha con "Correr también los siguientes" es la prórroga de BR-PAY-06 (solo se mueven las fechas).

## Alternativas descartadas
- *Último abono con la diferencia* y *un abono extra pequeño al final*: el dueño prefiere que el sobrante lo absorba el más próximo.
- *Guardar el plan como entidad*: complica el modelo sin beneficio (los valores derivados no se guardan).

## Consecuencias
- Función pura del dominio `buildPaymentPlan` con pruebas de propiedades (suma exacta, todos enteros, múltiplos de $1.000 salvo el más próximo, fechas por frecuencia). No requiere cambios visuales.
- Interactúa con BR-PAY-13 (alerta si lo programado excede el saldo).

## Referencias
BR-PAY-15 · AF-113 · RQ-SAL-06 · DECISION-LOG ronda 19
