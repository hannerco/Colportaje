# ADR-0054: Bandeja de fotos: ninguna foto se pierde sin que la persona lo decida

**Estado:** Aceptado (2026-11-27, ronda 40) · **Cambia:** ADR-0051 §3 y BR-CUS-14 (cómo se suben las fotos al guardar un cliente nuevo)

## Contexto
Desde ADR-0051, «Guardar cliente» guardaba el cliente, abría su ficha y **después** subía las fotos, por detrás y sin ninguna señal en pantalla. Las fotos vivían solo en la memoria de la app. Dos reportes del campo:
1. **Samsung:** "La foto se sube desde el celular al crear el cliente. Cuando abro el cliente en desktop, la factura no aparece."
2. **iPhone:** "le tomaba la foto, la usaba, pero realmente no se subía. Ni siquiera me aparecía que estaba cargando."

Causas encontradas en el código:
- Si la persona cerraba la app, bloqueaba el teléfono o se iba a otra app durante la subida, esta se cortaba (el iPhone congela la app apenas sale de la pantalla) y la foto **se perdía para siempre**.
- Si fallaba, el Aviso «No se subió 1 foto · Reintentar» duraba 6 segundos; pasado ese tiempo, la foto también se perdía.
- Una vez guardado el cliente, cerrar la pestaña ya no preguntaba.
- Aparte (arreglado en `fix/ficha-fresca`): la ficha se daba por fresca 30 minutos en cada equipo, así que el otro equipo podía no ver la factura aunque sí hubiera subido.

Se le presentaron al dueño tres opciones: (A) que «Guardar cliente» espere a que suban las fotos; (B) guardar al instante y dejar las fotos en una bandeja del teléfono que se sube sola; (C) subir cada foto apenas se toma, como Notion. **Eligió la B** (2026-11-27). De la A no le gustó que un problema con una foto impidiera guardar el cliente.

## Decisión
1. **Al guardar, las fotos van a una bandeja en el teléfono** (`PhotoOutbox`, IndexedDB `colportor-pending-photos`). Ahí quedan aunque se cierre la app, se reinicie el teléfono o no haya señal. Guardan su archivo (como bytes: Safari ha perdido `Blob` guardados), a qué van (imagen del cliente o factura, con su N.º y fecha) y quién las tomó.
2. **La bandeja se sube sola** al abrir la app, al volver la señal, al volver a la app y al entrar. Sube una por una, en el orden en que se tomaron, con los mismos pasos idempotentes de la ficha: reintentar con los mismos ids no duplica nada. Con señal pero red inestable, vuelve a intentar a los 30 segundos. Dos pestañas no suben a la vez (Web Locks).
3. **Qué hace con cada error:**
   - sin señal, red caída, tiempo agotado o sin sesión: **espera** y reintenta después;
   - el cliente o la factura ya no existen: **se quita** sin avisar (no tiene a dónde ir);
   - cualquier otro (imagen ilegible, cliente archivado): **queda guardada y marcada**. La ficha ofrece «Reintentar» o «Descartar» (este último pregunta antes, porque la foto se borra del teléfono).
4. **Una factura nace con su primera foto (BR-CUS-17).** Si esa foto no puede subirse, la siguiente de la misma factura la crea. Si la que debía crearla sube después, se le agrega. La fecha de la factura es la que quedó escrita al crear el cliente, no la del día en que sube.
5. **La ficha muestra lo que falta** en «Fotos por subir» (`PendingPhotosNote`): «Subiendo 2 fotos…», «1 foto guardada en este teléfono. Se sube sola cuando haya señal.» o «No se pudo subir 1 foto · Reintentar · Descartar». Solo en el teléfono que tiene las fotos.
6. Las fotos solo se suben con la sesión de quien las tomó.

## Alternativas descartadas
- **(A) «Guardar cliente» espera a las fotos.** Sin señal, o se bloquea guardar o la foto se pierde igual.
- **(C) Subir cada foto apenas se toma.** Las fotos llegarían al servidor antes de que exista el cliente (contradice ADR-0051) y quedarían fotos sueltas al salir sin guardar. Sin señal, el problema de fondo sigue. Se puede sumar más adelante sobre esta bandeja sin rehacerla.

## Consecuencias
- Hasta que sube, la foto vive solo en ese teléfono: si se pierde el teléfono o se borran los datos de la app antes, se pierde. El otro equipo no la ve hasta que suba.
- El iPhone no sube nada con la app cerrada: sube al volver a abrirla. Safari puede borrar los datos de un sitio **no instalado** tras 7 días sin abrirlo; la app instalada no tiene ese límite. En Android se pide al navegador conservar los datos (`navigator.storage.persist`).
- Si IndexedDB no está disponible (ventana privada), la bandeja queda en memoria: sube mientras la app siga abierta.
- La bandeja está hecha para crecer: otro destino (fotos agregadas desde la ficha, recibos del Abibono) es otro `type` en `PendingPhotoTarget` y su paso en `uploadOne`. Hoy solo la usa Nuevo cliente.
- Pruebas: `pending-photos.test.ts` (orden, esperas, errores, la factura que crea la siguiente foto), `pending-photos-runner.test.ts`, `photo-outbox.test.ts` (IndexedDB) y la E2E «la foto de la factura no se pierde aunque no suba y se cierre la app».

## Referencias
ADR-0051, BR-CUS-14, BR-CUS-17, BR-PHO-01, BR-GEN-15 · DECISION-LOG ronda 40
