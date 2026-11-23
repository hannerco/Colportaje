# ADR-0051: El cliente nuevo solo existe al guardarlo

**Estado:** Aceptado (2026-11-22, ronda 35, issue #57) · **Reemplaza:** ADR-0038 («ficha viva») en lo que toca a crear un cliente · **Cambia:** BR-CUS-14

## Contexto
Desde ADR-0038, Nuevo cliente era una **ficha viva**. El cliente existía apenas tenía nombre y cada dato se guardaba solo un momento después. Lo mismo pasaba con cada libro: se vendía al tocarlo y volvía a físico al quitarlo. Por eso, elegir y quitar un libro durante la creación dejaba rastro en el historial del ejemplar, y «Descartar» tenía que deshacer en la base todo lo creado.

Al probar la app, el dueño pidió: **"El cliente no existe a menos que yo lo guarde. Si hago todo, pero no lo guardé, no existe. No se queda como borrador ni nada."** Luego decidió tres cosas:
1. Hasta guardar, el libro elegido sigue En físico y sin historial.
2. Al salir sin guardar, la app pregunta.
3. Al guardar se guardan juntos cliente, libros, cuota y plan, y después las fotos. Si una foto falla, el cliente queda guardado y se ofrece reintentar (opción A).

## Decisión
1. **Todo vive en el teléfono mientras se crea:** datos, emoji, ubicación, libros elegidos (con precio acordado y fecha de venta), cuota inicial, plan, fotos de información y facturas. Nada se escribe en la base.
2. **«Guardar cliente» llama a una sola función, `save_new_customer`,** que en una transacción:
   - crea el cliente;
   - le vende cada libro con `assign_copy_to_customer` y, si cambió, `update_agreed_price`;
   - guarda la cuota inicial con `set_creation_down_payment`;
   - guarda el plan con `apply_payment_plan`.

   O queda todo o no queda nada: si un libro ya no está en físico (otro dispositivo lo vendió), no se guarda nada y la app lo dice. Reintentar con el mismo id no duplica.
3. **Las fotos se suben después**, con el cliente ya guardado. Si una falla, el Aviso dice «No se subió 1 foto · Reintentar» (las fotos siguen en el teléfono mientras la app esté abierta).
4. **Salir con algo escrito pregunta** «¿Salir sin guardar?». Salir no deja nada: no hay borrador ni nada que borrar. Cerrar la pestaña también pide confirmación al navegador.
5. Los libros de un cliente **ya guardado** siguen como antes: quitar uno es una devolución (BR-COPY-09) y queda en el historial.

## Alternativas descartadas
- **Mantener la ficha viva y borrar el historial al descartar.** El historial no se borra (BR-GEN-02), y el dueño no quiere que exista nada antes de guardar.
- **Guardar con varias llamadas desde el teléfono, una por libro, cuota y plan.** Si la señal se cae a mitad, queda un cliente a medias: justo lo que se quiere evitar.
- **No guardar nada si una foto falla (opción B).** Por una foto se perdería lo importante: los libros y el dinero.

## Consecuencias
- `discard_new_customer` y `customer_discard_summary` ya no se usan al crear; quedan en la base para no romper versiones anteriores de la app.
- Mientras se crea, los libros elegidos siguen apareciendo En físico en Inventario.
- Pruebas: `tests/integration/save-new-customer.test.ts` (todo de una vez, nada si algo falla y sin duplicar al reintentar) y las E2E de Nuevo cliente y Agregar libro.

## Referencias
ADR-0038, BR-CUS-14, BR-COPY-06, BR-COPY-09, BR-GEN-02 · DECISION-LOG ronda 35 · issue #57
