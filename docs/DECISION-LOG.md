# Registro de decisiones (entrevista de diseño, 2026-10-26)

Registro cronológico de todas las preguntas, recomendaciones y respuestas del dueño del producto. Las respuestas del dueño están en **negrita**. Es la fuente de verdad del *por qué* de cada decisión. Para el *qué* normativo ver `BUSINESS-RULES.md`; para el modelo, `DOMAIN-MODEL.md`.

Convención: **[D]** = decidido · **[A]** = asumido por defecto, pendiente de confirmar (ver `OPEN-QUESTIONS.md`) · **[B]** = backlog.

---

## Ronda 1 — Fundamentos

| # | Tema | Resultado |
|---|---|---|
| Q1 | Multiusuario | **"Sí, por ahora es multiusuario, en el futuro tendrá su parte de líder."** [D] Cuenta por colportor, datos aislados; solo rol Colportor en la v1; el modelo prevé el Líder. |
| Q2 | Offline | Pregunta del dueño: *"¿cómo haremos eso si no tenemos tiempo aún de programar una app?"* Se explicó que es decisión de arquitectura, no de código. Resultado en Q9. |
| Q3 | Stack/presupuesto | **"No tenemos presupuesto, si mucho la usarán 10 personas… typescript y next… el stack que mencionas es el que conozco."** [D] Next.js + TypeScript + Supabase + Vitest/Playwright. Se puede entregar como PWA. |
| Q4 | Idioma | **"Sí, perfecto… para las partes complejas haya un tooltip en la ui."** [D] UI y docs en español, código en inglés, `GLOSSARY.md`; tooltips en conceptos complejos. |
| Q5 | ¿Varias ventas por cliente? | **"No. Un cliente solo es un cliente… Si compra otro libro, se puede agregar un libro nuevo al cliente, eso automáticamente le cambia el saldo."** [D] **No hay entidad Venta.** El asistente de IA admitió haber exagerado el riesgo de inconsistencia; solo se limpió que "Fecha de la venta" se **deriva** y que la factura puede tener **varias fotos**. |
| Q5-extra | UI: ¿cliente primero o venta primero? | Recomendación aceptada más adelante (Q36): botón central **+ Vender** que absorbe ambas rutas. |
| Q6 | Valores derivados | Aclaración: "rendimiento" = no optimizar prematuramente. [D] Todo lo calculable se deriva; nunca columnas editables. |
| Q7 | Fotos | **"Sí."** [D] Compresión en cliente, cola de subida, bucket privado con URLs firmadas. |

## Ronda 2 — Modelo de dinero y operación

| # | Tema | Resultado |
|---|---|---|
| Q8 | Hosting/fotos | **"Actualmente no es comercial así que se hará gratis."** Peor escenario de fotos explicado: sin compresión 1 GB se agota en ~1 mes. [D] Vercel gratis + Supabase gratis. |
| Q9 | Fases | **"Deja en claro fase 1 y fase 2… ¿se puede como PWA?"** [D] F1 online, F2 offline+push, F3 líder. Offline es posible como PWA (IndexedDB + service worker); iOS sin background sync; push en iOS exige PWA instalada ≥16.4. |
| Q10 | Una tabla de abonos | **"Correcto."** [D] `payments` con `kind`. |
| Q11 | Prórrogas | **"Sí."** [D] `original_due_date` inmutable + `due_date` + historial. |
| Q12 | Abono parcial | **"En efecto."** [D] Solo sugerir, no crear automático. |
| Q13 | Nombres de estados | **"Vale, está bien."** [D] Por cobrar → Cobrado → Entregado al líder. |
| Q14 | Cuadre del Abibono | **"Sí."** [D] Guarda lo entregado; esperado = suma vinculada; diferencia con nota; borrador→confirmado con recibo. |
| Q15 | "Sin resolver" | **"Cuando mis cuentas estaban descuadradas, había un libro que tenía de más, o… el líder decía que me había dado 4 libros, pero en realidad yo solo tenía en físico 3. Es como para saber que hay un problema con ese libro."** [D] Marcador de descuadre. |
| Q16 | Minibooks y dinero | **"Eso hay que pensarlo… a veces se usa para comprarse algo en el día. Entonces la app debe permitir agregarlo a un abibono. Dado que este dinero es muy inestable, no debe afectar el resto de cuentas, excepto la de total abonado, en caso de que abone algo de minibooks."** Truco histórico: un cliente llamado "minibooks". [D] Ver Rondas 3–4. |
| Q17 | Catálogo | **"Dame una pantalla de admin para poder crear ese catálogo de títulos."** [D] |

## Ronda 3 — Operación, seguridad, minibooks

| # | Tema | Resultado |
|---|---|---|
| Q17b | Rol admin | **"El primer usuario seré yo… en alguna parte, ni tan visible ni tan escondida, podré cambiar a rol administrador."** [D] Conmutador en Ajustes. |
| Q18 | Política de fotos | **"Sí."** [D] WebP ≤1280 px ~150 KB, miniatura ~15 KB, `StorageRepository`, R2 al 70%. |
| Q19 | Recordatorios | **"Sí."** [D] Dentro de la app en F1; push en F2. |
| Q20 | "Con novedad" | **"Me parece bien, pero no sé cómo aparecerá en la UI. Cualquier cosa te aviso en el momento."** [D] Diseño de UI abierto. |
| Q21 | Congelar precios | **"Correcto… estos precios no deben cambiar antes de la campaña… Yo voy a agregar los Títulos y sus precios por un script."** [D] Snapshots por ejemplar. |
| Q22 | Invitaciones | **"Sí. Pero deja en la parte de admin unas instrucciones de cómo invitar a alguien."** [D] |
| Q23 | Alcance admin | **"Sí, correcto."** [D] CRUD de Títulos, desactivar, usuarios y rol. |
| Q24 | Entrada de minibooks | **"Va, me encanta."** [D] Título + cantidad + monto + nota. |
| Q25 | Minibooks → Abibono | **"Sí, perfecto."** [D] Asignación parcial por entrada. |
| Q26 | Stock de minibooks | **"Sí, los minibooks tienen inventario físico. Deben aparecer al final o aparte, pero sí deben aparecer porque sí o sí, el líder nos hará firmar que nos los entregó."** [D] |
| Q27 | Prospectos | **"Quiero que el cliente se pueda crear sin un libro, pero no puede afectar los totalizadores de los clientes, a menos que escoja ver absolutamente todos… el calendario debe poder distinguir entre visita, abono programado y capacitación."** Contexto: al inicio anotaba visitas que casi nunca dieron fruto. [D] |
| Q8 (ronda 3) | Hosting | Confirmado Vercel+Supabase gratis, región cercana (ver Ronda 6/Q50). |

## Ronda 4 — Detalles de clientes, devoluciones, navegación

| # | Tema | Resultado |
|---|---|---|
| Q28 | Minibooks y stock | **"Eso no puede pasar, porque… los minibooks también se agregan al inventario de manera normal, solo que están un tris separados."** [D] Se mantiene una validación que impide vender más de lo que hay. |
| Q29 | Totalizadores de minibooks | **"Sí… Y debo poder agregar minibooks tanto ahí como en donde agrego en general el inventario."** [D] |
| Q30 | Prospectos derivados | **"Vale."** [D] |
| Q31 | Eventos de calendario | **"Bien, pero la visita no tiene relación de composición con el cliente, sino de agregación, tal y como el abono."** [D] Visita y abono sobreviven al cliente; cliente opcional en visita. |
| Q32 | Campañas | **"Por ahora no. Déjalo anotado para la siguiente fase. Por ahora solo lo usaremos para esta campaña."** [B] |
| Q33 | Devoluciones | **"No es justo que un cliente devuelva un libro que ya se comprometió a pagar… el pago ya se lo dimos al líder… Sí, el cliente puede devolver el libro y se debe regresar al inventario. Si ya dimos un abibono, el abibono debe seguir allí, y la información del cliente con los abonos que ya dio, también… lo mejor sería obviar [el reembolso]."** [D] Sin reembolsos. |
| Q34 | Mapa | **"¿No hay una forma como en Notion de Embed Google Maps?"** → Sí; se corrigió la afirmación previa. [D] |
| Q35 | Selección de ejemplares | **"No, no estoy de acuerdo. Cuando vendes escoges un ejemplar específico… te deja escoger entre los ejemplares que tienes en físico y los vas añadiendo uno por uno. Si quieres venderlo a un precio diferente debes entrar al ejemplar individual y cambiar su precio acordado."** [D] Reemplaza "título + cantidad". |
| Q36 | Navegación | **"Me gusta que haya en el centro el + vender… pero ten en cuenta… [uso real]"** [D] Ver `DESIGN-BRIEF.md`. |
| — | Proceso "Hacer inventario" | **"Cuando cuadramos cuentas con el líder se le llama 'hacer inventario'. Ahí le decimos cuántos ejemplares hemos vendido de cada título y cuántos tenemos en físico y cuánto es el total. En mi Notion tenía 2 vistas: Inventario (normal) e Inventario TODOS (sumaba los religiosos)."** [D] |
| — | Categorías | **"Dos categorías: religiosos (~15% de ganancia) y culturales (~50%). El líder lleva estas cuentas aparte y además la 'bonificación'… se logra solo con la cantidad de libros CULTURALES vendidos. Y lo tercero son los minibooks."** [D] |

## Ronda 5 — Detalles finos

| # | Tema | Resultado |
|---|---|---|
| Q37 | Identidad del ejemplar | **"Está bien tu idea [número consecutivo]. Sin embargo, no me llama la atención que el usuario tenga tan presente cuántos libros lleva… una manera podría ser un loguito parecido a una fruta… que se vaya pudriendo. No quiero que sea una fruta, ya que es poco profesional, pero sí un ícono que va cambiando por etapas."** [D] Icono de antigüedad por etapas. |
| Q38 | Dirección y mapa | **"Sí, aunque… el embed de Maps si no hay conexión muestra el cuadrito del mapa pero con un error. Supongo que eso lo maneja Google."** [D] |
| Q39 | Visita sin cliente | **"Sí."** [D] |
| Q40 | Saldo a favor | **"Vale, está bien. Y también ten en cuenta que con ese saldo a favor se le puede dar un minibook."** [D] |
| Q41 | Totalizadores por categoría | **"Vale."** [D] |
| Q42 | Meta | **"Habrá un apartado de metas… no necesariamente un apartado único, sino que se incrustará en una página, sujeto a cambios. La bonificación es por la compra de libros culturales. Debe ser de 4 millones. Esta será la meta por defecto, pero yo como admin debo poder modificarla. Se mostrará con una barra de progreso. No mostrará números… eso es lo que le da emoción a hacer el inventario con el líder."** [D] |
| Q43 | Hacer inventario | **"Vale, sí… podría mostrárselos [los totalizadores] en el apartado de Hacer inventario. Mi vista Inventario normal eran solo los culturales."** [D] |
| Q44 | Navegación base | **"Sí, como alternativa base para el diseño. Pediré 2 o 3 variantes en Claude Design."** [D] |

## Ronda 6 — Cierre

| # | Tema | Resultado |
|---|---|---|
| Q45 | Antigüedad | **"Sí, pero varían los días. Reciente de 0 a 2, normal de 3 a 6, de 7 a 12 envejeciendo y mayor a 12 ya es antiguo."** [D] **Más adelante:** **"las etapas de antigüedad, es decir, la cantidad de días, podrán ser modificados por el admin."** [D] |
| Q46 | Saldo a favor → minibook | **"Correcto, sí a todo."** [D] |
| Q47 | Medición de meta | **"Exacto, es con la suma del precio colportor y se ve donde dices, en Hoy-metas."** [D] |
| Q48 | Totalizadores | **"Vale."** [D] Dentro de "Hacer inventario". **"Puede que en el futuro te mande a borrar esos totalizadores."** |
| Q49 | Backups | **"Está bien."** [D] |
| Q50 | Acceso/formato | **"Exactamente tal y como dices. Tenemos que asegurarnos que el lugar donde despleguemos esté cerca, para que no se note lentitud… eso hace que la gente odie la app."** [D] Correo+contraseña, COP enteros, America/Bogota, solo español, aislamiento por usuario, regiones São Paulo. |
| Q51 | Arquitectura/docs | **"Sí."** [D] |
| — | Agregar a inventario | **"Yo tenía un botón por cada libro, sin embargo eso no es escalable. Puede escogerse por medio de una lista, y el colportor puede añadir a favoritos el Título que desee para que aparezca como botón. Puede agregar tantos libros favoritos como consideremos que no dañarán la UI."** [D] Tope propuesto 6. |
| — | Último mensaje | **"Me pareció que escribiste todo muy básico. Asegúrate de que todo lo que hablamos y todas las convenciones estén copiadas correctamente, que no haya ambigüedad… conecta github, vercel y supabase… sé exhaustivo para que se base el siguiente agente en una base sólida."** |

---

## Ronda 7 — Cierre de cabos sueltos (2026-10-28)

| # | Tema | Resultado |
|---|---|---|
| Q1 | "Recientes" en Clientes | **"Sí, es por fecha de creación. Pero si quieres ponerte creativo, está bien eso del selector. Quiero que el diseño sea muy atractivo, así que este tipo de filtros/selectores deben seguir un mismo estilo en todos los módulos."** [D] Barra de vista única (ADR-0029). |
| Q2 | Fecha de recibido y cantidad | **"Debe haber manera de editar el día que lo recibí, ya que puede que haya un día entero en que no tenga acceso a internet o al celular… no tan grande el CAMBIAR FECHA DE RECIBIDO, la idea es que no lo cambien, pero debe existir la posibilidad. Debe seguir la forma en que se hace en diferentes páginas web."** [D] Chip de fecha + propiedad editable en línea. **"No quiero que esté tan visual cargar muchos de un solo Título, usualmente el líder da 2 o máximo 4… los minibooks sí suelen darnos bastantes."** |
| — | Estilo | **"El mayor estilo específico que quiero seguir es el de Notion… quiero que siga el mismo estilo visual."** [D] |
| Q3 | Tiempo y formato | **"La semana empieza el domingo; el usuario debería poder escoger en ajustes si el formato es 12 o 24 horas. El resto está bien."** [D] Inicio del día 07:00, sin recordatorio por defecto, fechas dd/mm/aaaa, tema automático. |
| Q4 | Después de devolver | **"No. Aunque sí se debe conservar la información, al devolverse un libro el cliente ya no va a dar esa plata de los abonos programados, y ese es el campo que usamos para saber cuánto tenemos en la calle, así que no debería guardarse eso… a veces eliminaba el cliente. Por favor escribe todos los diferentes flujos que pueden suceder."** [D] → alerta de abonos que no cuadran, estado `canceled`, `FLOWS-ALTERNATIVOS.md`. Tope del saldo a favor en minibooks confirmado. |
| Q5 | Compartir "Hacer inventario" | **"Por ahora simplemente copiar el resumen, pero explícitamente que en el futuro se podrá descargar en PDF o CSV."** [D] |
| Q6 | Libros perdidos | **"Usualmente el colportor asume la pérdida, por lo que se nos sigue cobrando el libro. Puede haber un líder muy amigable que acepte asumir la pérdida, por lo que el libro se resolvería eliminándose, como si uno se hubiera equivocado al agregarlo."** [D] |
| Q7 | Abono extra | **"Considero que se debería dejar, ya que en efecto puede suceder. El sistema debe ser capaz de calcular que si el cliente dio un abono extra, el abono programado ya no debería ser del mismo valor, por lo que debería surgir algún tipo de alerta, ya sea modal, popup o lo que sea mejor."** [D] → BR-PAY-13. |
| Q8 | Nombres | **"Abonos, Abibonos déjalo así con el nombre, porque es un chiste interno que quiero conservar y en el tooltip puedes dejar 'Entrega al líder'… minibooks literalmente 'Minibooks'. Dinero, hacer inventario, + vender está bien. Quiero que cada uno tenga un ícono que lo caracterice, así como en Instagram."** [D] |
| Q9 | Cifras de dinero | **"Correcto. Pero creo que sí deberías dar la opción de mostrar el total de deuda en Clientes. Eso lo veremos bien cuando sea el momento."** [D] → DT-01 (se decide en el diseño). |
| Q10 | Duplicados y llamar/WhatsApp | **"Sí a los dos, me encanta esa creatividad."** [D] |
| Q11 | Fotos | **"Un abibono debería tener una sola [foto de recibo], sin embargo deja la opción de agregar más."** [D] |
| Q12 | Admin | **"Correcto."** [D] El admin no ve datos de otros; puede desactivar usuarios. |
| Q13 | Piezas técnicas | **"Todo correcto, excepto lo de la invitación. Considero que no debería andar tocando la base de datos directamente, por lo que desde mi panel de admin debería ser capaz de enviar la invitación."** [D] → ADR-0027. |
| Q14 | Nombre de la app | **"Pon 'Colportor' como nombre. Es marca de Emprendum, pero por ahora la estoy usando yo y unos pocos. Cuando lo valide con ellos, se la voy a presentar a Emprendum."** [D] |
| Q15 | Ley 1581 | **"Va."** [D] → plantilla con huecos (SG-05). |
| Q16 | Entornos y cuenta de Supabase | **"Debería crear una cuenta nueva de Supabase porque ya tengo varios proyectos y quiero que este no se caiga por nada del mundo. Ayúdame a escoger cómo le hacemos, en qué plataformas montarlo."** [D] Cuenta nueva, 2 proyectos, mitigaciones, Pro más adelante (ADR-0002, DEPLOYMENT §7). |
| Q17 | Plazo | **"Tenemos dos semanas."** [D] → ROADMAP de 14 días. |
| Q18 | Número de ejemplar offline | **"Vale."** [D] Provisional con marca (F2). |
| Q19 | Un Abibono por abono | **"Correcto."** [D] |

## Ronda 8 — Plazo, devoluciones y plataformas

| # | Tema | Resultado |
|---|---|---|
| Q20 | Alcance en 14 días | **"No tengas miedo, intentemos hacer esto en las dos semanas. Lo voy a construir con IA, entonces se podrá."** [D] La fase 1 completa en 14 días; el orden propuesto sirve de prioridad y de orden de recorte. |
| Q21 | Lectura sin conexión | **"Vale, estoy de acuerdo."** [D] |
| Q22 | Alerta de abonos que no cuadran | **"Perfecto."** [D] BR-PAY-13 y estado `canceled`. |
| Q23 | Detalles de devolución | **"Perfecto."** [D] Motivo opcional, conserva `received_at`, prospecto, **Archivar**. |
| Q24 | Perdidos | **"No debería haber un 'El líder lo asume' porque eso es comprometer al líder… él no debe saber eso, ya que es un acto de bondad del líder y muchos no lo harán."** [D] Salidas: Apareció / Perdido (lo asumo yo) / Eliminar. **Ningún texto menciona que el líder pueda asumir.** |
| Q25 | Devolver libros al líder | **"Es cierto, sí ocurre. Además, puede que tengas un libro hace mucho tiempo y el líder acepte que lo devuelvas. Hay que contemplar ese caso."** [D] `returned_to_leader`, cualquier antigüedad. |
| Q26 | Reabrir Abibono | **"Perfecto."** [D] |
| Q27 | Cambiar de cliente | **"No entiendo la pregunta. Si me equivoco de cliente, probablemente tenga que devolver el libro de vendido a inventario, y ahí sí pasarlo al otro cliente. Cuando le agrego un libro a un cliente puedo tanto agregar como eliminar y eso debería cambiar el estado del ejemplar."** [D] Se **eliminó** la propuesta "Cambiar de cliente"; motivo "Me equivoqué de cliente" en la devolución. |
| Q28 | Cantidad en Notion | **"El concepto está bien, pero el botón discreto ×N no me parece muy estético. Piensa cómo lo haría Notion."** [D] → "+ / pastilla numérica". |
| Q29 | Estilo, íconos, nombres | **"Okay, estoy de acuerdo por ahora. Yo había propuesto Títulos y Ejemplares porque me parecía la forma menos ambigua, pero si crees que se va a entender bien, estoy de acuerdo."** [D] |
| Q30 | Invitar desde el panel | **"Exactamente eso es lo que te pido."** [D] Enlace copiable para WhatsApp. |
| Q31 | Cuenta Supabase | **"Va. Déjame instrucciones muy claras… no estoy muy familiarizado con Supabase o Vercel… ¿A la final decidimos Vercel o Render?"** [D] Guía `GUIA-DESPLIEGUE-PASO-A-PASO.md`. **Vercel**, no Render. |
| Q32 | Hosting y región | **"Creo que voy a usar una cuenta Vercel nueva, y sí, por ahora el plan gratuito. ¿Estás seguro que São Paulo es mejor? Investigué y se menciona que aunque la de EE. UU. está más lejos, suele ser más rápida."** [D] **Se midió** desde Medellín (us-east-1 ~85 ms vs sa-east-1 ~146 ms): el dueño tenía razón → **us-east-1 / iad1**. |

## Ronda 9 — Últimos ajustes

| # | Tema | Resultado |
|---|---|---|
| Q33 | Perdidos sin mencionar al líder | **"Sí."** [D] |
| Q34 | Devolver al líder | **"Sí a todo."** [D] Cualquier antigüedad, deshacer con nota, columna "Devueltos". |
| Q35 | Cliente equivocado | **"Correcto."** [D] |
| Q36 | Cantidad estilo Notion | **"Vaaale, vale. Me gusta. Pero haz lo mismo tanto en minibooks como en libros normales."** [D] Misma pastilla en ambos (sin selector visible desde el inicio en minibooks). |
| Q37 | Región | **"Perfecto."** [D] us-east-1 + iad1. Pendiente repetir la medición desde un celular (SG-01). |
| Q38 | Nombres Título/Ejemplar | **"No. Por ahora prefiero lo que tú consideras mejor. Si en un futuro veo confusión, te pediré que lo cambies. Déjalo anotado en cosas por revisar."** [D] *Catálogo* (admin), *Libros* (colportor), *Ejemplar*; RV-01. |

---

## Decisiones derivadas (consecuencias lógicas de las respuestas, no preguntadas aparte)
1. **Restablecer contraseña también por enlace del admin** (AF-82, ADR-0027): el mismo límite de correo de Supabase que impide invitar por correo impide los restablecimientos automáticos.
2. **Repositorio de GitHub llamado `colportor`** (en vez de `colportaje`), coherente con el nombre de la app.
3. **Estado `returned_to_leader`** y columna "Devueltos" en *Hacer inventario*; la identidad de control del inventario se actualiza.
4. **Recorte automático de abonos**: tras abono extra, desde el más próximo; tras devolución/baja de precio/archivado, desde el más lejano (modificable en el modal).
5. **Archivar** sustituye a "eliminar" cliente (conserva información, que el dueño quiere guardar).

## Correcciones al propio asistente (para no repetir errores)
1. Se afirmó que "Venta" era necesaria; el dueño la rechazó (Q5). No existe.
2. Se propuso "título + cantidad" al vender; el dueño exige elegir ejemplares uno por uno (Q35).
3. Se afirmó que el mapa embebido necesitaba clave de pago; se corrigió: el iframe de "Compartir → Insertar mapa" funciona sin clave (Q34/Q38).
4. Se calculó mal el espacio de fotos al inicio; la tabla correcta está en ADR-0013.
5. Se supuso que la meta se medía por cantidad; es por **suma de precio colportor** de culturales (Q47).
6. Se había omitido la vista **Ejemplares** (Todos / En inventario / Vendidos / Con descuentos y aumentos, con ordenar y buscar) del texto original; ahora está en `DESIGN-BRIEF.md`.
7. Se había omitido el método (efectivo/transferencia) en las entradas de minibooks, necesario para autocalcular el Abibono; añadido.
8. **Región:** se recomendó São Paulo por cercanía geográfica; el dueño dudó y la **medición** desde Medellín mostró que us-east-1 (~85 ms) es más rápida que sa-east-1 (~146 ms). Corregido en todos los documentos.
9. Se propuso "Cambiar de cliente" en un ejemplar vendido sin entender el flujo real del dueño; se retiró (quitar y volver a agregar ya cambia el estado).
10. Se propuso la resolución "El líder lo asume", que comprometía al líder; se reemplazó por *Eliminar* sin mención al líder.
11. Se propuso invitar por correo con el SMTP de Supabase; está limitado a 2/hora y solo a miembros de la organización; se cambió a enlace por WhatsApp.
12. Se propuso el botón "×N" para cantidades; el dueño lo rechazó por poco estético; se cambió a "+ / pastilla numérica" estilo Notion.
