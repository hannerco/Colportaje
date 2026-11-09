# ADR-0041: Alcance del back de Clientes, Inventario y Dinero, y reglas de extensibilidad
Estado: Aceptado · Fecha: 2026-11-08

## Contexto
El diseño en Claude Design cerró Clientes, Inventario y Dinero (escritorio claro como referencia). El dueño quiere empezar por el back de esos tres módulos, que juntos ya son una app funcional; el resto de módulos (Hoy, Calendario, Minibooks, Hacer inventario, Admin) llegarán después. Pidió que todo sea **escalable y extensible** porque muchas cosas pueden variar, y que nada quede a medias si depende de un diseño que todavía no existe (ronda 26).

## Decisión
- **Qué es "back":** toda la lógica que no es UI ni componentes visibles: migraciones, RLS, funciones SQL (RPC), dominio en TypeScript, repositorios y adaptadores, casos de uso y hooks de datos, búsqueda, orden y filtros, cálculos derivados, compresión de fotos, lectura sin conexión y bloqueo de escrituras sin conexión. El front solo pinta y llama acciones.
- **Dentro:** Clientes, Inventario y Dinero completos según los docs, **incluidas** las reglas de esos módulos que aún no tienen pantalla (devolución con motivo, alerta BR-PAY-13, prórroga, abono extra, archivar, duplicados, emoji, etc.). Lo que no tiene pantalla se lista en `04-diseno/pendientes/`.
- **Cimientos mínimos:** inicio de sesión con correo y contraseña (usuario creado a mano), perfil y rol, RLS, tabla `title` y script de carga del catálogo.
- **Fuera por ahora (sin tablas ni lógica):** visitas, capacitaciones y recordatorios (llegan con Calendario); ventas de minibooks, asignaciones a Abibonos y canje de saldo a favor (llegan con Minibooks); Hoy; Hacer inventario y totalizadores; invitaciones, restablecimiento y panel de admin. Los **ejemplares de minibooks sí** entran (agregar, en físico, novedad, devolver al líder), porque están diseñados en Inventario.
- **Reglas de extensibilidad (obligatorias en toda historia de usuario):**
  1. **Cambiar una tabla sin dañar lo demás:** migraciones aditivas (expandir → migrar datos → contraer), nunca editar una migración ya aplicada; ningún módulo lee tablas ajenas sin pasar por su repositorio; pruebas que detectan la rotura.
  2. **Cada regla en su propio lugar:** una regla `BR-*` vive en un único módulo del dominio y se cita por su ID.
  3. **Valores que pueden cambiar en un solo lugar fácil de encontrar:** p. ej. múltiplo de $1.000, umbral de 50 m, 2 meses de prórroga, días de pago del plan, duración del aviso Deshacer; nunca regados por el código.
  4. **Historial:** todo cambio importante (estado de un ejemplar, de un abono o de un Abibono) deja un evento de solo inserción.

## Alternativas descartadas
- *Adelantar visitas y ventas de minibooks:* obligaría a rehacerlas cuando se diseñen recordatorios, visitas sin cliente y la pantalla de Minibooks. Añadirlas después es aditivo.
- *Asignaciones de minibooks a Abibonos sin ventas:* no se podrían usar ni probar con datos reales.

## Consecuencias
- El cálculo del Abibono (`expected`) se escribe como suma de **aportes** (hoy solo abonos) para que el dinero de minibooks se sume después sin reescribirlo.
- `credit_applied` vale 0 hasta que exista el canje de minibooks; la fórmula del saldo no cambia.
- La sección Minibooks de Nuevo Abibono y la sección Visitas de la ficha quedan ocultas en el front hasta tener su módulo.
- Las historias de usuario viven en `07-historias-usuario/`.

## Referencias
DECISION-LOG ronda 26 · ADR-0019 · ADR-0003 · `04-diseno/pendientes/`
