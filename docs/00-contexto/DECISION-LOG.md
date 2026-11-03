# Registro de decisiones (entrevista de diseño, 2026-10-26)

Registro cronológico de todas las preguntas, recomendaciones y respuestas del dueño del producto. Las respuestas del dueño están en **negrita**. Es la fuente de verdad del *por qué* de cada decisión. Para el *qué* normativo ver `01-negocio/BUSINESS-RULES.md`; para el modelo, `02-datos/DOMAIN-MODEL.md`.

Convención: **[D]** = decidido · **[A]** = asumido por defecto, pendiente de confirmar (ver `06-planificacion/OPEN-QUESTIONS.md`) · **[B]** = backlog.

---

## Ronda 1 — Fundamentos

| # | Tema | Resultado |
|---|---|---|
| Q1 | Multiusuario | **"Sí, por ahora es multiusuario, en el futuro tendrá su parte de líder."** [D] Cuenta por colportor, datos aislados; solo rol Colportor en la v1; el modelo prevé el Líder. |
| Q2 | Offline | Pregunta del dueño: *"¿cómo haremos eso si no tenemos tiempo aún de programar una app?"* Se explicó que es decisión de arquitectura, no de código. Resultado en Q9. |
| Q3 | Stack/presupuesto | **"No tenemos presupuesto, si mucho la usarán 10 personas… typescript y next… el stack que mencionas es el que conozco."** [D] Next.js + TypeScript + Supabase + Vitest/Playwright. Se puede entregar como PWA. |
| Q4 | Idioma | **"Sí, perfecto… para las partes complejas haya un tooltip en la ui."** [D] UI y docs en español, código en inglés, `00-contexto/GLOSSARY.md`; tooltips en conceptos complejos. |
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
| Q36 | Navegación | **"Me gusta que haya en el centro el + vender… pero ten en cuenta… [uso real]"** [D] Ver `04-diseno/DESIGN-BRIEF.md`. |
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
| Q4 | Después de devolver | **"No. Aunque sí se debe conservar la información, al devolverse un libro el cliente ya no va a dar esa plata de los abonos programados, y ese es el campo que usamos para saber cuánto tenemos en la calle, así que no debería guardarse eso… a veces eliminaba el cliente. Por favor escribe todos los diferentes flujos que pueden suceder."** [D] → alerta de abonos que no cuadran, estado `canceled`, `01-negocio/FLOWS-ALTERNATIVOS.md`. Tope del saldo a favor en minibooks confirmado. |
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
| Q31 | Cuenta Supabase | **"Va. Déjame instrucciones muy claras… no estoy muy familiarizado con Supabase o Vercel… ¿A la final decidimos Vercel o Render?"** [D] Guía `05-operacion/GUIA-DESPLIEGUE-PASO-A-PASO.md`. **Vercel**, no Render. |
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

## Ronda 10 — Dinero por entregar en Hoy (2026-10-28)

| # | Tema | Resultado |
|---|---|---|
| Idea | El dueño: *"sería bueno que en 'hoy' el colportor supiera cuánto tiene recolectado o reclamado para posteriormente dárselo al líder."* | Propuesta aceptada con matices. |
| Q1 | Mostrar en Hoy | **"Exacto. Eso no quita emoción, porque de hecho es un dato importante: saber cuánto dinero tengo que entregarle al líder en Abibonos. Pero no me gusta ese 'En mi poder'. Busca cómo lo diría una plataforma profesional."** [D] Nombre elegido: **"Por entregar"**; se retira "en mi poder" de toda la app. BR-GOAL-06 pasa a permitir esta única cifra en Hoy. |
| Q2 | Desglose y privacidad | **"Correcto, debe poderse ocultar el monto. Pero además de separado debo poder ver el total; de hecho principalmente debería ver el total y como ayuda el desglose."** [D] Total como cifra principal, desglose Efectivo/Transferencia secundario, ojo para ocultar. |
| Q3 | Minibooks | **"Vale, está bien. No incluyamos minibooks."** [D] |

---

## Ronda 11 — Revisión del primer diseño (2026-10-29)

El dueño revisó `Colportor.html` (8 tableros de Claude Design) y lo rechazó casi por completo: *"no me gustó casi nada… supongo que es porque el design brief no está alineado con lo que realmente quiero."* Se renderizó el archivo y se investigó (tells de "hecho con IA", leyes de UX, sidebar de Notion).

| # | Crítica / decisión | Resultado |
|---|---|---|
| 1 | **"Busca en internet las cosas que las personas asocian a 'creado con IA'… no cometas ninguna."** | Lista negra anti-IA (BR-GEN-12, ADR-0032). |
| 2 | **"No está siendo minimalista, especialmente en el mobile. Demasiada información, demasiadas aclaraciones, demasiadas letras."** | Presupuesto de densidad: filas de 2 líneas, sin subtítulos/contadores, ayuda con ⓘ. |
| 3 | **"Cuando hayan más de 5 opciones, se debe dividir en grupos."** | BR-GEN-11. |
| 4 | **"Busca las leyes de UX/UI y síguelas."** | Leyes aplicadas en el brief §6 y ADR-0032. |
| 5 | **"El sidebar quiero que sea muy parecido al de Notion."** | Sidebar con perfil, Buscar, Hoy, secciones plegables Trabajo y Dinero, "+" y "⋯" al hover. |
| 6 | **"El botón vender se repite muchas veces, con una sola principal está bien."** | BR-GEN-10: "Vender" una sola vez. |
| 7 | **"Hay redundancia: hay un apartado calendario y en 'hoy' hay un calendario completo de una semana. Está bien que aparezca lo de hoy, pero no toda una semana."** | Hoy sin semana ni agenda aparte; el error vino de mi brief v1 (variante "Hoy denso"). |
| Q1 | "Agregar inventario" dentro de Inventario | **"Sí"** [D] |
| Q2 | Tarjeta "Por entregar" sin subtítulo, desglose en una línea gris, sin barra | **"Perfecto. Menos explicación, más visualización."** [D] |
| Q3 | Color | **"Bien, sin embargo algo que me gustó es que había un ícono PEQUEÑO que sí tenía color, que diferenciaba las visitas, de las capacitaciones, de los cobros… es muy específico el lugar donde se ponen los colores, pero así sí es bueno. No te pido que todo sea blanco y negro, sino que sepas dónde poner colores. Quiero que una de las variantes sea con este segundo color de acento #092e53."** [D] Microíconos de tipo; variante B con #092e53. |
| Q4 | Fuente del sistema | **"Sí"** [D] |
| Q5 | Cobros vencidos | **"Ni siquiera sé si quiero ese bloque de vencidos. Puede aparecer como un aviso, pero no uno por uno porque recarga mucho. Si le das click, lleva al módulo que lo muestra correctamente. O no sé, ¿qué opinas?"** [D] Aviso único que abre Dinero ▸ Por cobrar ▸ Vencidos (BR-CAL-09). |
| Q6 | Variantes | **"No, igual quiero ver las variantes desde el principio."** [D] A casi negro, B marino #092e53, C editorial. |
| Q7 | Grupos del sidebar | **"Sí"** [D] Trabajo y Dinero. |
| Q8 | "Agregar libro" en la ficha | **"Correcto"** [D] |
| 9 | Tamaño de letra | **"Creo que la letra que pediste es muy pequeña, mira cuál es la letra que usan otras apps."** Se midió el diseño (mayoría 13 px) y se comparó con iOS (17/15/13 pt) y Material (cuerpo 16 sp). [D] Escala nueva en el brief §5b: móvil principal **17**, secundario **15**, mínimo 13; campos ≥ 16. |

## Ronda 12 — Implementación del dominio (2026-10-29)

| # | Tema | Resultado |
|---|---|---|
| Q1 | Orden y control del recorte (BR-PAY-13) | **"Recordemos que el colportor debe poder decidir si quiere que el recorte se haga automático o si lo quiere hacer él. Pero en el caso a, se recorta desde el más próximo. En el caso b se recorta desde el más lejano."** [D] (a = editar un abono cobrado → más próximo; b = confirmar el asistente de venta → más lejano). El modal sigue ofreciendo recortar automáticamente, cancelar los marcados o dejar como está. |
| Q2 | Motivo de cancelación | **"opción A"** [D] Según el disparador: extra/sobrepago/edición → `overpaid`; devolución → `book_returned`; archivar → `customer_archived`; baja de precio, borrar un cobro y asistente → `manual`. |
| Q3 | Prórroga | **"A. Si la fecha está después de 2 meses se genera una alerta al usuario para que confirme la fecha"** [D] Debe ser posterior a la actual; más de 2 meses desde hoy pide confirmación. |
| Q4 | Minibooks perdidos | **"No, no cuenta. Opcion A."** [D] Perdidos y "A responder al líder" tienen el alcance de "Mi compra". |
| — | Orden de trabajo y calidad | **"Vale, haz lo que te pedí hasta ahora, pero hazlo bien. Es la parte más importante del proyecto. Confío en que uses buenas prácticas de arquitectura y revises varias veces todo."** Dominio en TypeScript puro con pruebas por regla `BR-*`, propiedades con `fast-check` y revisión por mutaciones. Ver ADR-0033. |

---

## Ronda 12 — Referencias visuales y orden de diseño (2026-10-29)

El dueño envió dos imágenes de referencia (guardadas en `04-diseno/referencias/`): *"para Clientes y para el sidebar, me gusta mucho [la de escritorio]. Este otro diseño en Mobile, me gusta."* y pidió: *"Cambia el prompt para que inicie con el apartado de clientes. Por ahora no con 'Hoy', y mira qué puedes sacar de las imágenes."*

| Decisión | Resultado |
|---|---|
| Orden de diseño | **Se empieza por Clientes** (lista móvil + tabla de escritorio con sidebar); Hoy después. |
| Escritorio | Panel blanco sobre gris; sidebar con tarjeta de perfil y píldora activa elevada; pestañas-píldora con conteo tenue; filtros-píldora; tabla aireada con píldora de estado. |
| Móvil | Barra inferior flotante tipo píldora (4 íconos) + botón circular oscuro "+" (Vender); búsqueda con ícono de filtro. |
| Conciliación con reglas previas **(propuesta del asistente, pendiente de confirmar)** | (1) Conteos tenues **solo en pestañas de vista** y solo conteos, nunca dinero. (2) **Estado del cliente** con píldora verde/ámbar/rojo: en móvil solo "Vencido", en escritorio las tres (BR-CUS-13); único lugar con verde/ámbar. (3) El borde oscuro a la izquierda de las tarjetas **no** se adopta (solo en tarjetas de eventos del Calendario). (4) Sidebar agrupado en *Trabajo* y *Dinero* (>5 ítems), con el aspecto de la referencia. (5) **Sin** fila de tarjetas KPI (duplicaría los conteos y mostraría dinero). (6) Avatares de **iniciales** neutros, no fotos. |
| Referencia 3 (lista) | El dueño: *"la lista de abajo podría ser cada cliente, su nombre, lo que adeuda a la derecha, y abajo del nombre el libro vendido."* [D] Fila: avatar · nombre · **libro vendido** debajo (el más reciente + "+N") · **saldo** a la derecha. Para respetar "una señal por fila", en móvil el estado vencido se indica con el **saldo en rojo** (se elimina la píldora roja en móvil; las píldoras de estado quedan solo en la tabla de escritorio). No se toman de la imagen la cabecera con gradiente, la tarjeta con gráfico ni los botones en píldora. |

---

## Ronda 13 — Tarjeta de Hoy con acción (2026-10-29)

El dueño envió la referencia 4 (guardada): *"Este me gustó para el Hoy, solo me refiero a la card de arriba. Así me puede aparecer el dinero y uno de los botones podría mandar a hacer el abibono con ese dinero."*

| Decisión | Resultado |
|---|---|
| Tarjeta de Hoy | **Tarjeta "Por entregar" destacada en color de acento** (casi negro en A, `#092e53` en B), cifra grande con ojo al lado y desglose en una línea. |
| Acción | Un único botón **"Entregar"** abre **Nuevo Abibono precargado** con todos los abonos cobrados libres (BR-DEP-13). Cambia la regla anterior "Hoy no tiene botones" → "Hoy tiene un único botón, dentro de la tarjeta" (BR-GEN-10, BR-CAL-07/08). |
| Propuestas del asistente (pendientes de confirmar) | (1) Un solo botón en vez de dos como en la referencia (minimalismo). (2) Tocar el resto de la tarjeta abre Dinero. (3) Con total 0 el botón no aparece. (4) El asistente no crea borrador hasta que el usuario guarda. (5) La idea del paso a paso conectado de la referencia (Recibido · En tránsito · Entregado) para los estados de abono queda anotada, no aplicada. |

---

## Ronda 14 — "+ Vender" y design system con tokens (2026-10-29)

| Tema | Resultado |
|---|---|
| **"+ Vender"** | El dueño confesó que en Notion vendía *"creando un cliente y agregándole a este un libro"* y preguntó qué se había pensado. Se explicó el asistente de 5 pasos y se propuso la alternativa "ficha viva" (el "+" crea una ficha de cliente en blanco con secciones en línea). **Decisión: "No, tienes razón. Me voy a quedar con el + como lo habías pensado."** [D] Se mantiene **"+ Vender" como asistente de 5 pasos** (F-10). Anotado como RV-06 por si en uso real se siente pesado. |
| **Tamaño de letra variable** | **"Quiero que pongas en el repo la regla de que el tamaño debe poderse cambiar por una variable. Quiero que esté muy bien hecho el design system y que si quiero cambiar el tamaño de la letra, se cambie muy fácilmente. Ahorita viendo los diseños siento que el de mobile tiene la letra muy grande, pero cuando pueda verlo en la vida real, quizá lo cambie o quizá no."** [D] → ADR-0034, BR-GEN-13: tokens en un solo archivo, `--font-scale` global, acento como variable, prohibidos los valores literales, prueba de arquitectura. Escala provisional (RV-05). |

---

## Ronda 15 — Nombre del cliente sin deuda (2026-10-29)

El dueño preguntó cómo llamar a los clientes que ya pagaron y no tienen deuda. Se propuso **"Saldado"** (descartados: "Pagado", que se confunde con "Cobrado"; "Cancelado", que choca con el estado de los abonos; "Al día", ambiguo; "Paz y salvo", correcto en Colombia pero largo para una píldora) y reordenar los estados porque "Con saldo" era una etiqueta torpe (el cliente "Vencido" también tiene saldo). **Decisión: "Sí, pongámoslo tal y como mencionas."** [D]

| Estado | Código | Significado | Color |
|---|---|---|---|
| **Vencido** | `overdue` | tiene algún abono vencido | rojo |
| **Al día** | `current` | debe algo, pero va cumpliendo | verde |
| **Saldado** | `settled` | ya pagó todo, no debe nada | gris |

Reemplaza a "Al día / Con saldo / Vencido" (BR-CUS-13). Desaparece el ámbar. En móvil, el cliente saldado muestra el texto gris "Saldado" en lugar de un saldo en cero. **Nota para quien implemente el dominio:** `payment_standing` aún no está en `src/` (usar `overdue` / `current` / `settled`).

---

## Ronda 16 — "Nuevo cliente" reemplaza a "+ Vender" (2026-11-03)

El dueño **habló con quienes usaron el Notion**: *"sí estuvieron de acuerdo que no debería haber un 'Vender' diferente a Crear cliente nuevo, así que creo que mejor convierto el botón flotante '+ Vender' en uno que sea generar nuevo cliente."* Se opinó a favor (modelo mental de los usuarios, encaja con el modelo de datos, menos pantallas) y se preguntó lo necesario.

| # | Tema | Resultado |
|---|---|---|
| Q1 | Cuándo existe el cliente | **"Correcto."** [D] Ficha que se guarda sola; el nombre es lo único obligatorio; sin nombre no queda nada. |
| Q2 | Avisos | **"No voy a programar abonos antes de agregarle un libro, y si lo hago, es un problema, así que debería aparecer la alerta."** [D] El aviso aparece de inmediato (no al salir de la ficha). |
| Q3 | Orden | **"El orden que usarán será Libros, abonos y luego la factura. Pero si programa abonos sin haber puesto el libro, debería marcarle al menos una alerta que diga que aún no tiene libro. Todo este tipo de alertas son informativas, pero el usuario va a poder seguir haciendo lo que quiera."** [D] Sin orden obligatorio; avisos informativos, sin bloqueo (BR-PAY-14). |
| Q4 | Ícono | **"Lo más lógico es la persona con el +."** [D] |
| Q5/Q6 | Ubicación en escritorio | **Pendiente.** El dueño descartó tres opciones por sus defectos (ítem en el sidebar junto a "Clientes", solo en Clientes por poco accesible, flotante por Jakob) y **no aceptó aún** la propuesta del asistente (ícono en la cabecera del sidebar + `⌘N`). **Pidió 4 diseños** a Claude Design basados en el estilo actual, considerando que en móvil hoy conviven un botón en la cabecera y el flotante. → **DT-08** + prompt «4 ubicaciones». |
| Q7 | Modal | **"Sí, de acuerdo."** [D] Los avisos son franjas en línea sin bloqueo; el modal solo se abre con "Revisar" o ante devolución, abono extra o baja de precio. |

Consecuencias: ADR-0035; "Vender" desaparece (acción, ruta `/vender` → `/clientes/nuevo`, etiqueta); F-10 y F-11 se fusionan; se cierra RV-06. **Aviso para quien implemente la UI:** no crear nada llamado "vender" en rutas ni textos.

---

## Ronda 17 — Ubicación del cliente (2026-11-03)

El dueño preguntó si una PWA puede tener un botón "agregar ubicación actual" que cargue la ubicación en Maps automáticamente. Se investigó (geolocalización del navegador, comportamiento en iPhone, política de teselas de OpenStreetMap).

| # | Tema | Resultado |
|---|---|---|
| Q1 | Guardar latitud y longitud con el botón "Usar mi ubicación actual" | **"Sí."** [D] |
| Q2 | Dirección en texto manual | **"Sí."** [D] Sin rellenado automático (backlog: geocodificación inversa). |
| Q3 | Aviso "Ubicación aproximada" si la precisión es baja | **"Sí."** [D] (~50 m) |
| — | Selector de pin | El dueño: *"¿no es posible que aparezca un mapa y él escoja dónde se pone el pin? como en Didi cuando pides un carro."* → **Sí**, selector con pin al centro (mapa interactivo propio; el iframe de Google no sirve para esto). |
| Q4 | Mapa interactivo para elegir y para ver | **"O sea sí, pero necesito que haya una opción que lleve esas coordenadas a Maps para que el colportor pueda verlo mejor."** [D] Botón "Abrir en Maps" con las coordenadas. |
| Q5 | Proveedor de mapas | **"Sí."** [D] Se decide al implementar (SG-09); no el servidor público de OSM. |
| Q6 | Flujo | **"Yes."** [D] "Usar mi ubicación actual" → mapa con pin al centro y círculo de precisión → Confirmar; también "Elegir en el mapa". |

Consecuencias: ADR-0036 (reemplaza en parte a ADR-0014: el iframe de Google ya no se usa); campos `latitude`, `longitude`, `location_accuracy_m` en `customer`; BR-CUS-08 reescrita; F-30; AF-109..AF-111. **Aviso para quien implemente el dominio:** funciones puras para validar coordenadas y construir el enlace de "Abrir en Maps" (prioridad coordenadas → enlace pegado → dirección en texto).

## Decisiones derivadas (consecuencias lógicas de las respuestas, no preguntadas aparte)
1. **Restablecer contraseña también por enlace del admin** (AF-82, ADR-0027): el mismo límite de correo de Supabase que impide invitar por correo impide los restablecimientos automáticos.
2. **Repositorio de GitHub llamado `colportor`** (en vez de `colportaje`), coherente con el nombre de la app.
3. **Estado `returned_to_leader`** y columna "Devueltos" en *Hacer inventario*; la identidad de control del inventario se actualiza.
4. **Recorte automático de abonos**: tras abono extra, desde el más próximo; tras devolución/baja de precio/archivado, desde el más lejano (modificable en el modal).
5. **Archivar** sustituye a "eliminar" cliente (conserva información, que el dueño quiere guardar).
6. Los abonos de Abibonos en **borrador** siguen contando como "Por entregar" hasta confirmarse, y vuelven a contar si el Abibono se reabre (AF-105).

## Correcciones al propio asistente (para no repetir errores)
1. Se afirmó que "Venta" era necesaria; el dueño la rechazó (Q5). No existe.
2. Se propuso "título + cantidad" al vender; el dueño exige elegir ejemplares uno por uno (Q35).
3. Se afirmó que el mapa embebido necesitaba clave de pago; se corrigió: el iframe de "Compartir → Insertar mapa" funciona sin clave (Q34/Q38).
4. Se calculó mal el espacio de fotos al inicio; la tabla correcta está en ADR-0013.
5. Se supuso que la meta se medía por cantidad; es por **suma de precio colportor** de culturales (Q47).
6. Se había omitido la vista **Ejemplares** (Todos / En inventario / Vendidos / Con descuentos y aumentos, con ordenar y buscar) del texto original; ahora está en `04-diseno/DESIGN-BRIEF.md`.
7. Se había omitido el método (efectivo/transferencia) en las entradas de minibooks, necesario para autocalcular el Abibono; añadido.
8. **Región:** se recomendó São Paulo por cercanía geográfica; el dueño dudó y la **medición** desde Medellín mostró que us-east-1 (~85 ms) es más rápida que sa-east-1 (~146 ms). Corregido en todos los documentos.
9. Se propuso "Cambiar de cliente" en un ejemplar vendido sin entender el flujo real del dueño; se retiró (quitar y volver a agregar ya cambia el estado).
10. Se propuso la resolución "El líder lo asume", que comprometía al líder; se reemplazó por *Eliminar* sin mención al líder.
11. Se propuso invitar por correo con el SMTP de Supabase; está limitado a 2/hora y solo a miembros de la organización; se cambió a enlace por WhatsApp.
13. **Brief v1:** pedía subtítulos, desglose permanente, una variante "Hoy denso" con semana, botones de acción repetidos y 7 colores de etiqueta; Claude Design lo siguió y el resultado fue recargado. Corregido en el brief v2.
12. Se propuso el botón "×N" para cantidades; el dueño lo rechazó por poco estético; se cambió a "+ / pastilla numérica" estilo Notion.
14. **Fórmula del saldo (2026-10-29):** la documentación decía `balance = debt − paid_total − credit_applied`, lo que hacía que entregar un minibook con saldo a favor *aumentara* el saldo a favor, contra BR-MBK-07 y AF-10. Lo detectó una prueba de propiedades al implementar el dominio. El signo correcto es `+ credit_applied` (ADR-0033); se corrigió en BR-CUS-04, DOMAIN-MODEL y GLOSSARY.
