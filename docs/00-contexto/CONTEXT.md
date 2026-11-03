# Contexto del producto

## Qué es
**Colportor** (marca de Emprendum; por ahora la usa el dueño con unos pocos colportores y, cuando se valide, se presentará a Emprendum). PWA **mobile-first** para **colportores** (vendedores de libros a cuotas). Reemplaza el sistema que el dueño del producto construyó y usó en **Notion**, donde 3 personas más lo adoptaron. Debe verse bien también en **escritorio**, porque el cuadre de cuentas se hace de noche en computador.

Trabaja con la casa publicadora vía un **líder** (quien entrega libros y recibe el dinero). El proyecto se enmarca en **Emprendum** (quien en el futuro puede administrar el catálogo de títulos).

## Quién la usa
- ~10 colportores como máximo, **sin presupuesto** (todo en planes gratuitos).
- Primer usuario y primer administrador: el dueño del producto (también colportor).
- Futuro (fase 3): rol **Líder**.

## Dos momentos de uso
| Momento | Dispositivo | Qué hace |
|---|---|---|
| **Calle (día)** | Móvil | **Pendientes del día**, **Clientes** (donde agrega las ventas), **Libros en físico**, **Agregar al inventario** |
| **Cuadre (noche)** | Escritorio | Completar la información de cada cliente; ver **abonos** para saber cuánto tiene en **efectivo y transferencia** para entregar; crear **Abibonos** con la foto del recibo |
| **Esporádico** | Cualquiera | Totalizadores (cuánto vendió, de cuánto fue su compra, su venta), inventario por título |

## Problema que resuelve (y el error a no repetir)
La versión de Notion recibió críticas por **tener demasiados apartados y ser difícil de entender**. La gente se perdía con "abonos" y "abibonos" y terminaba usando **solo Clientes**. La nueva app debe ser muy intuitiva: pocos apartados, un único punto de entrada (**Nuevo cliente**: la ficha del cliente es donde se agregan libros, abonos y factura) y **Dinero** como único lugar para lo que se cobra y se entrega.

## Conceptos del negocio (léelos antes de tocar el modelo)
- **Título vs. Ejemplar.** El Título es el libro (1 registro por libro). El Ejemplar es cada unidad física (30 libros vendidos = 30 Ejemplares). Un Ejemplar **es de** un Título.
- **Tres categorías de Título:** *cultural* (~50 % de ganancia; **cuentan para la bonificación**), *religioso* (~15 %) y *minibook* (libro pequeño que se ofrece cuando el cliente rechaza uno grande; se paga de contado, sin cliente; precio libre, ~1.500 o gratis). El líder lleva estas cuentas por **separado**.
- **Bonificación.** Regalo de la casa publicadora si la **suma del precio colportor de libros culturales vendidos** alcanza una meta (4.000.000 por defecto, editable).
- **Venta a cuotas.** El cliente se compromete a abonos con fecha; puede pedir más plazo (se conserva la fecha original). El colportor **cobra** y luego **entrega** el dinero al líder mediante un **Abibono**, con foto del recibo obligatoria.
- **Hacer inventario.** Así se llama el **cuadre con el líder**: se le informa, por título, cuántos ejemplares se vendieron, cuántos hay en físico y cuánto es el total. Antes había dos vistas: *Inventario* (solo culturales) e *Inventario TODOS* (suma los religiosos). Las cifras de dinero no se muestran todo el tiempo: eso es parte de la emoción de este momento.
- **Con novedad.** Marca un descuadre entre lo registrado y lo físico ("el líder dice que me dio 4 y tengo 3").
- **Devoluciones.** Un cliente puede devolver un libro; vuelve al inventario. Los abonos recibidos y los Abibonos ya hechos **no cambian** (ese dinero ya se entregó al líder). **No hay reembolsos** (no hay de dónde sacar el dinero); lo pagado de más es **saldo a favor**, que puede canjearse por un minibook.
- **Visitas.** Hay clientes que piden "vuelva a pasar en tal fecha". Se crean sin libro (**prospectos**), no afectan los totalizadores, y se pueden agendar visitas. (El dueño observó que muchas de esas visitas nunca dieron fruto; por eso no deben contaminar las cifras.)
- **Minibooks: cuenta aparte.** No suman a libros vendidos ni a las demás cuentas. A veces su dinero se entrega al líder en un Abibono y a veces se usa para otra cosa del día; por eso solo afecta "Total abonado" si se asigna a un Abibono.

## Restricciones
- **Presupuesto cero:** Supabase y Vercel gratis (cuentas nuevas, dedicadas al proyecto), región **us-east-1 / iad1**, elegida **midiendo** la latencia desde Medellín (~85 ms vs ~146 ms de São Paulo): **la lentitud hace que la gente odie la app**. La confiabilidad total no está garantizada en planes gratuitos: se mitiga con backups, ping anti-pausa y paso futuro a Supabase Pro.
- **Almacenamiento de fotos limitado** (1 GB gratis): compresión obligatoria.
- **Sin conexión confiable** en la calle → en la fase 1 se puede **consultar** sin conexión lo último sincronizado; **registrar exige conexión**; escribir sin conexión es fase 2.
- **Arquitectura escalable, con pruebas, sin "parche sobre parche".** Decisiones lógicas y documentadas.

## Calendario de entrega
La **próxima campaña** (~3 meses) empieza pronto; **la fase 1 completa debe estar lista en 14 días** (se construye con IA). Las **campañas** como entidad quedan para después.

## Estilo visual
El sistema original estaba en Notion y el dueño quiere **el mismo estilo visual** (neutro, sutil, bases de datos con pestañas de vista, propiedades editables en línea). Ver `04-diseno/DESIGN-BRIEF.md`.

## Proceso acordado
1. Documentación completa (este directorio).
2. Diseño en **Claude Design** con 2–3 alternativas (ver `04-diseno/DESIGN-BRIEF.md`); el dueño elige.
3. Solo entonces, código: scaffolding por capas + pruebas del dominio primero.

## Dónde está cada cosa
Ver `README.md` (mapa de documentos) y `AGENTS.md` (cómo trabajar aquí).
