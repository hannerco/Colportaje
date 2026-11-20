# Preguntas para cerrar el diseño de lo que falta

**Fecha:** 2026-11-11. Una duda por pregunta, con un ejemplo y una recomendación. Cuando el dueño responda, la respuesta se anota en `DECISION-LOG.md`, se actualiza la regla `BR-*` que corresponda y se marca aquí como resuelta (no se borra).

Orden sugerido: **Hoy → Calendario → Minibooks → Hacer inventario → Admin → Login y Ajustes → Transversal**. Hoy y Calendario primero porque son lo que el colportor abre todos los días.

Las pantallas ya definidas en las reglas que solo faltan por dibujar están en `FALTA-CLIENTES.md`, `FALTA-INVENTARIO.md`, `FALTA-DINERO.md` y `FALTA-TRANSVERSAL.md`; aquí solo van las **decisiones**.

---

## 1. Hoy

**PD-01 · ¿La tarjeta «Por entregar» se queda en Hoy?** (OQ-40)
Ejemplo: tienes $320.000 recibidos de clientes que aún no has entregado al líder.
- A) Hoy no lo muestra; lo ves en Dinero, que ya tiene su tarjeta y el botón «Nuevo Abibono».
- B) Hoy lo muestra abajo, discreto.
- C) Hoy lo muestra arriba, destacado, como ahora.
**Recomiendo A:** dijiste que sería «menos importante» y tu orden de Hoy no la nombra. Con A también desaparece el botón «Entregar» de Hoy.

**PD-02 · ¿Qué eran las «figuras geométricas» del calendario?** (OQ-41)
Ejemplo de la línea de Hoy: «● 3 cobros · ◆ 1 visita · ▲ 1 capacitación».
Mi suposición: cada tipo de evento tiene su propia figura, y por eso se distinguen sin depender solo del color. ¿Es eso lo que recordabas, o era otra cosa?

---

## 2. Calendario

**PD-03 · ¿Cómo quieres ver el calendario?**
- A) Mes completo, y al tocar un día se ve el detalle.
- B) Semana (domingo a sábado) con los eventos en columnas.
- C) Solo una lista de los próximos días.
**Recomiendo A**, con la semana empezando en domingo: es lo más fácil de entender de un vistazo y ya tienes el detalle del día al tocar.
**Resuelta en parte (ronda 32, 2026-11-18):** el dueño quiere ver **A (mes)** y **B (semana con línea de tiempo)** dibujadas en Claude Design antes de elegir. Se descarta C.

**PD-04 · ¿Las capacitaciones se repiten?**
Ejemplo: una capacitación todos los lunes a las 8:00 a. m.
- A) No; cada capacitación se crea una por una.
- B) Sí, con «repetir cada semana».
**Recomiendo A** para la primera versión (es nuevo y no está en las reglas; se agrega después si de verdad lo usas).
**Resuelta (ronda 32, 2026-11-18): A.** Cada capacitación se crea una por una (BR-CAL-03).

**PD-05 · Cuando marcas una visita como «hecha», ¿qué esperas que pase?**
Ejemplo: visitaste a la panadería de la esquina y le interesó un libro.
- A) Solo queda marcada como hecha.
- B) La app te ofrece «Convertir en cliente» en ese momento.
La regla ya permite convertir con un toque en cualquier momento; esta pregunta es si quieres que además te lo sugiera al marcarla.
**Ronda 32:** se decide viendo las dos opciones en Claude Design (exploración pequeña del prompt del Calendario).

---

## 3. Minibooks

**PD-06 · ¿Minibooks tiene su propia pantalla en el menú?**
- A) Sí, un ítem «Minibooks» con sus ventas y sus totales (es una cuenta aparte).
- B) No; las ventas van dentro de Inventario y los totales dentro de Dinero.
**Recomiendo A**: su dinero es independiente del de los libros, y mezclarlos confundiría.

**PD-07 · ¿Se puede registrar una venta de minibook con fecha de otro día?** (OQ-34)
Ejemplo: hoy es 11 de noviembre y vendiste uno el 9.
- Pasado: la regla actual dice que sí.
- Futuro (por ejemplo el 15): la regla actual también lo acepta, pero no tiene sentido para algo ya vendido.
**Recomiendo** permitir pasado y **bloquear futuro**, para evitar errores de dedo.

---

## 4. Hacer inventario

**PD-08 · ¿Qué mensaje mandas hoy al líder con el inventario?**
El botón «Copiar resumen» debe dejar un texto limpio para pegar en WhatsApp. Para que salga igual a lo que ya haces, **pégame un ejemplo real del mensaje** (sin nombres de clientes).

**PD-09 · ¿Qué columnas quieres ver en la tabla por título?**
Ejemplo: título, cuántos recibiste, cuántos vendiste, cuántos tienes en físico. Cuéntame qué columnas usas hoy en tu Notion y cuáles te sobran.

---

## 5. Admin

**PD-10 · ¿Cada cuánto cambian los precios o entran títulos nuevos al catálogo?**
- Si es **pocas veces por campaña**: el catálogo se mantiene con el script y la pantalla de Catálogo puede esperar.
- Si es **seguido** o lo hará otra persona sin programar: conviene diseñar la pantalla ya.
**Recomiendo** esperar la pantalla si es poco frecuente (ya existe el script de carga).

**PD-11 · Si un colportor se va, ¿qué pasa con sus datos?**
La regla actual: se desactiva, no puede entrar y **sus datos se conservan**. Confirma que eso es lo que quieres (y que nadie más los ve, ni siquiera tú como admin, según BR-GEN-01).

---

## 6. Login y Ajustes

**PD-12 · ¿Qué más va en Ajustes además del formato de hora (12 h / 24 h) y el modo administrador?**
Ejemplo: tamaño de la letra (ya existe la variable que lo cambia todo a la vez), modo oscuro, cerrar sesión.
**Recomiendo** para la primera versión: formato de hora, modo administrador y cerrar sesión; lo demás después.

**PD-13 · Si un colportor olvida su contraseña, ¿qué ve?**
Hoy no hay correo automático, así que solo tú (admin) generas un enlace.
- Texto sugerido en la pantalla de entrar: «¿Olvidaste tu contraseña? Pídele un enlace a tu líder por WhatsApp.»
¿Te sirve ese texto o prefieres otro?

---

## 7. Transversal

**PD-14 · Identificador visual del título (DT-10 / FT-03).** Hoy es un cuadro gris. Opciones: ícono de un solo color, portada del libro o emoji. Las portadas de ejemplo tienen proporciones distintas (673×995, 600×600…), así que exigirían recorte. **Se decide viendo las tres variantes** en las listas ya diseñadas; hay que pedirlas a Claude Design.

**PD-15 · «Buscar ⌘K» del menú (FT-01).** No está definido qué busca. Opciones: A) quitarlo en la primera versión (cada lista ya tiene su búsqueda); B) que busque clientes y libros a la vez. **Recomiendo A.**

**PD-16 · «Cambiar de cuenta» junto al nombre (FT-02).** No hay varias cuentas. **Recomiendo quitar el botón.**

**PD-17 · Modo oscuro y móvil de Dinero (FT-05 / FD-09).** ¿Entran en la primera versión o después? **Recomiendo** móvil sí (los colportores usan el celular) y oscuro después.
