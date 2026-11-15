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
| Q37 | Región | **"Perfecto."** [D] us-east-1 + iad1. La medición desde un celular (SG-01) se cerró en la ronda 28: los servidores ya están creados. |
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

## Ronda 11b — Reglas de abonos y perdidos (2026-10-29)

| # | Tema | Resultado |
|---|---|---|
| Q1 | Orden y control del recorte (BR-PAY-13) | **"Recordemos que el colportor debe poder decidir si quiere que el recorte se haga automático o si lo quiere hacer él. Pero en el caso a, se recorta desde el más próximo. En el caso b se recorta desde el más lejano."** [D] (a = editar un abono cobrado → más próximo; b = confirmar el asistente de venta → más lejano). El modal sigue ofreciendo recortar automáticamente, cancelar los marcados o dejar como está. |
| Q2 | Motivo de cancelación | **"opción A"** [D] Según el disparador: extra/sobrepago/edición → `overpaid`; devolución → `book_returned`; archivar → `customer_archived`; baja de precio, borrar un cobro y asistente → `manual`. |
| Q3 | Prórroga | **"A. Si la fecha está después de 2 meses se genera una alerta al usuario para que confirme la fecha"** [D] Debe ser posterior a la actual; más de 2 meses desde hoy pide confirmación. |
| Q4 | Minibooks perdidos | **"No, no cuenta. Opcion A."** [D] Perdidos y "A responder al líder" tienen el alcance de "Mi compra". |

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

---

## Ronda 18 — Avatar del cliente con emoji (2026-11-03)

Tras comparar alternativas (iniciales, íconos de Lucide, emoji; el emoji es más sencillo de construir y da más variedad a costa de coherencia visual), el dueño decidió: **"el cliente nuevo puede tener un emoji como avatar, eso ya está decidido."** [D]

| Decisión | Resultado |
|---|---|
| Avatar | Emoji opcional por cliente (`avatar_emoji`), fondo neutro, selector que carga al abrirse, "Quitar" para volver al valor por defecto. Sin íconos propios en la v1; fotos en el backlog (ADR-0037, BR-CUS-15). |
| Pendiente → resuelto en la ronda 19 | **Avatar por defecto** sin emoji: **ícono de persona** (OQ-38 cerrada). **Selector de emojis:** elegir y probar la librería, y asegurar el funcionamiento sin conexión → SG-10. |

## Ronda 19 — Revisión del diseño de Clientes (lectura y creación) (2026-11-04)

El dueño exportó el módulo Clientes de Claude Design (lista, ficha, Crear, dirección y Elegir ubicación, escritorio y móvil, claro y oscuro) y se hizo el inventario de diferencias con los docs, pregunta por pregunta.

| # | Tema | Decisión |
|---|---|---|
| 1 | Estados | **Vencido** (rojo) / **Pagando** (gris) / **Saldado** (verde, el único verde). "Pagando" reemplaza a "Al día" por no ser ambiguo. Reemplaza lo decidido en la ronda 15 (Saldado gris) y en BR-CUS-13. |
| 2 | Etiqueta "Debe" | **Se conserva** en móvil, sobre el monto, con el ícono del estado: sin ella el número no decía a qué se refería; el dueño probó otras formas y todas eran ambiguas. (El asistente había recomendado quitarla.) |
| 3 | Pestañas | Todos / Deudores / **Saldados** / Archivados; se solapan con el filtro de estado pero son más sencillas y visuales → RV-07. |
| 4 | Orden | Más recientes, **Última modificación** (reemplaza a "Última actividad"), Nombre, Mayor deuda, Próximo abono; con **sentido ascendente/descendente** invertible. "Última modificación" = cualquier cambio de la ficha, nunca los automáticos (BR-CUS-16). |
| 5 | Barra inferior móvil | **Íconos con su nombre** (revierte "solo íconos"). |
| 6 | Avatar por defecto | **Ícono de persona** (cierra OQ-38); emoji opcional (ADR-0037). |
| 7 | Guardado de la ficha | Se guarda sola; se conservan **Descartar** y **Guardar cliente** (cabecera) y **Guardar cliente / Seguir editando** en la pantalla **Resumen** (antes "Antes de guardar"). "Descartar" elimina al cliente recién creado con confirmación que resume lo que se pierde; "Archivar" no aparece al crear (ADR-0038). |
| 8 | Plan de abonos automático | Frecuencia + valor de cada abono + primer abono; abonos = saldo ÷ valor hacia abajo; el sobrante lo suma el **abono más próximo**; múltiplos de $1.000 solo en el cálculo automático, no al editar a mano (ADR-0039, BR-PAY-15). |
| 9 | Factura | N.º de factura opcional; fecha opcional que se llena sola con el día en que se agrega la foto (BR-CUS-17). |
| 10 | Barra "Abonado el N %" | Aceptada como valor derivado (BR-CUS-10). |
| 11 | DT-08 | **Cerrada:** "Nuevo cliente" como ítem del sidebar bajo Hoy + botón en Clientes. |
| 12 | Ubicación | Un solo botón **"Elegir en mapa"**: abre el selector centrado en la ubicación actual y deja moverla; sin GPS/permiso abre en el último punto elegido o en Colombia (BR-CUS-08). |
| 13 | Ficha en escritorio | Se abre **Centrada, Lateral o Página completa** (patrón Notion). |
| 14 | Modo oscuro | El diseño trae claro y oscuro; la v1 sigue la preferencia del sistema, sin interruptor; se implementa después del claro. |
| 15 | Búsqueda | Nombre, teléfono, información, dirección y **libros** (títulos que el cliente tiene hoy); "Crear «texto»" desde un resultado vacío; "Buscar en Archivados". Filtro por libro → backlog. |
| 16 | Sin conexión | "Nuevo cliente" visible pero deshabilitado ("Necesita conexión"). |

Pendientes anotados: buscador "Agregar libro del inventario" (datos, agotados, precio de inventario, orden) se define al diseñar Inventario; el diseño no pinta el monto en rojo cuando está vencido (lo marca el ícono) → por confirmar. **Aviso para quien implemente el dominio:** `buildPaymentPlan` (BR-PAY-15), `updated_at` por cambios de ficha (BR-CUS-16), "descartar cliente nuevo" atómico (AF-112), `invoice_number`/`invoice_date`, búsqueda por títulos, orden con sentido y `payment_standing` con `current` = Pagando.

---

## Ronda 20 — Módulo Inventario: qué contiene (2026-11-04)

Antes de diseñar Inventario se cruzaron las tres secciones de Notion del dueño (Libros en físico + Agregar, Inventario y Libros individuales) con los docs.

| # | Tema | Decisión |
|---|---|---|
| 1 | Hoy | El dueño quiere que Hoy sea un **resumen general** (calendario de hoy, cobro rápido de abonos, resumen de libros en físico, más por definir) → DT-09; no se define aún. **"Agregar al inventario" NO va en Hoy**, va en Inventario. Inventario sin cifras de dinero por ahora. |
| 2 | Nombre | **"En físico"** reemplaza a "En inventario" (estado, vista y columnas). |
| 3 | Ejemplares | La lista muestra Estado, cliente, fechas (recibido/vendido), **precio acordado, diferencia y marca de precio distinto**, **sin sumas de dinero al pie**. Enmienda BR-GOAL-06 (solo esa lista muestra precio acordado y diferencia). Dónde vive la lista (pestaña de Inventario u otra): en debate. |
| 4 | Variantes | Design debe mostrar variantes de Agregar (cuadrícula vs lista agrupada), y de "Por resolver" (DT-03) antes de decidir (la antigüedad se canceló en la ronda 21). |
| 5 | Alcance del chat de diseño | Inventario, Agregar, Ejemplares, Ejemplar, Devolver al líder en lote y el buscador "Agregar libro" de la ficha. "Hacer inventario" y "Devolver + modal de abonos" van aparte. |
| 6 | Pestañas de Inventario | Inventario tiene **Libros en físico** (por título) y **Ejemplares** (una fila por unidad, con vistas Todos / En físico / Vendidos / Descuentos y aumentos). Es la opción A. |
| 7 | Identificador del título | (Cerrado en la ronda 28: imagen subida desde Admin.) Entonces sin decidir (DT-10): ícono de un color por admin, portada o emoji; se ve en variantes cuando las listas estén listas. |
| 8 | Buscador "Agregar libro" | Tocar un título asigna el **ejemplar más antiguo**; se puede expandir y elegir por número; agotados al final, atenuados y sin tocar. |
| 9 | Devolver al líder en lote | Por **cantidad por título** (principal) y "Elegir unidades" (secundaria); nota al final. |
| 10 | Orden de trabajo de diseño | Las exploraciones (Agregar y "Por resolver") en **móvil claro**, luego **escritorio claro**; el oscuro al final. |

---

## Ronda 21b — Sin código hasta cerrar el diseño (2026-11-04)

| # | Tema | Resultado |
|---|---|---|
| Q1 | Código adelantado | **"Preferí seguir creando la visual y no adelantar absolutamente nada de código, porque me di cuenta que al crear visual, las decisiones iban cambiando. Así que elimina todo lo adelantado."** [D] Se descartó todo el código escrito (capa de dominio y scaffolding de pnpm/TypeScript/Vitest/ESLint). El repositorio vuelve a contener solo documentación; el código se reescribe cuando el diseño esté cerrado. Las reglas de la ronda 11b siguen vigentes como documentación. |
| Q2 | Remoto | **"Enfócate en subir las cosas a GitHub. Veo que los commits están en local, pero nada en remoto."** [D] Se sube solo la documentación. |
| Q3 | Visibilidad y nombre del repo | El repo `hannerco/Colportaje` es **público**; el dueño eligió **dejarlo público pero sin las imágenes de referencia** (portadas y capturas de otras apps: se quedan solo en su computador, fuera de git) y **"cambia todo a Colportaje"**. Antes de subir código o datos se pasa a privado. **Hecho el 2026-11-10: el repo es privado.** |

## Ronda 21 — Se cancela la antigüedad (2026-11-04)

El dueño decidió: **"se cancela todo lo de antigüedad, no tiene sentido, no me gustó."** Reemplaza la decisión de Q45 (etapas Reciente/Normal/Envejeciendo/Antiguo) y a DT-05.

| Qué | Resultado |
|---|---|
| Se elimina | Etapas, ícono, `age_thresholds` en `app_settings` (y su edición por el admin), `age_days` / `age_stage` derivados, `domain/age.ts`, la regla BR-COPY-13 (número reservado, no se reutiliza), DT-05 y las pruebas de antigüedad. |
| Se conserva | `received_at` y "Recibido el" (BR-COPY-04). El buscador de la ficha sigue asignando el ejemplar con la **fecha de recibido más antigua** y "Devolver al líder" por cantidad sigue tomando los de fecha más antigua; solo se muestran número y fecha, nunca una etapa. |
| Históricos | Q45 y los ADR antiguos conservan su texto original; ADR-0017 queda marcado como revisado. SPEC-ORIGINAL no se toca. |
| Aviso al dominio | Si `src/` llegó a implementar `ageStage`, `age_thresholds` o sus pruebas, hay que quitarlos (al momento de esta ronda no se encontró nada). |

---

## Ronda 22 — Quitar un libro: error o devolución (2026-11-05)

El dueño decidió: en la ficha de **Crear cliente**, quitar un libro agregado se asume un **error** y no debe salir nada; si el cliente **ya existe**, quitar un libro se asume que fue **devuelto** y se activa el flujo de devolución (F-16). Consecuencias: BR-COPY-09, BR-CUS-14, F-16, AF-114, RQ-SAL-07. Confirmado: (1) en el flujo de devolución **se mantiene la pregunta del motivo**, con "El cliente lo devolvió" marcado por defecto (un toque; "Me equivoqué de cliente" sigue evitando contar una devolución falsa); (2) durante la creación solo se omite el modal: el **aviso en línea de BR-PAY-13 se conserva**.

---

## Ronda 23 — Módulo Dinero (2026-11-05)

Se cruzaron las dos tablas de Notion (Abonos de clientes y Abibonos) con los docs, pregunta por pregunta.

| # | Tema | Decisión |
|---|---|---|
| 1 | Estructura | Dos vistas, **Abonos de clientes** y **Abibonos**, con el mismo patrón que Inventario (rectángulo junto al título; óvalos debajo). Tarjeta fija **Por entregar** (total, efectivo, transferencia) con **Nuevo Abibono**; si no convence, se piden variantes. |
| 2 | Vistas de Abonos | Todos · Por cobrar · Por entregar · Entregados + filtro **Método**; se eliminan las vistas Nequi/Efectivo. Sin herramienta de «contar». |
| 3 | Barra de progreso | Una barra de 3 tramos (Entregado, Cobrado, Por cobrar), tocable para filtrar; sobre todos los abonos no cancelados. |
| 4 | Vencido | **No es un estado**: marca derivada del abono (Por cobrar con fecha pasada, «Vencido · hace N días»); el cliente deriva su Vencido de sus abonos. |
| 5 | Colores | Por cobrar gris, **Cobrado verde**, **Entregado «prime»** (dorado o azul, DT-11), Cancelado gris tachado. El verde pasa a significar «dinero recibido» (ya no es único de Saldado). |
| 6 | «En la calle» | Desaparece como nombre: es **Por cobrar** (estado, vista y totalizador). El totalizador = programado + sin programar. |
| 7 | Deuda sin programar | Se avisa con «Sin programar $X · N clientes» para corregirla. |
| 8 | Total de venta | Nuevo totalizador = Σ precio acordado de lo vendido (confirmado). |
| 9 | Cobrar | Desde la ficha, Hoy y Dinero (repetido a propósito). |
| 10 | Diseño | Escritorio claro primero; móvil claro después; oscuro al final. |
| 11 | Totales de Por cobrar | «Programado» y «Sin programar» van en la vista Por cobrar, no en la tarjeta fija (a probar así por ahora). |
| 12 | Abibonos | Sin subvistas: solo la lista de lo entregado al líder (como en Notion). |

Corrección al asistente: se recomendó que todos los estados del abono fueran grises sin considerar que no se distinguirían; el dueño pidió colores con significado.

---

## Ronda 24 — Contradicciones: borrador, Descartar y estado Saldado (2026-11-05)

Revisión de contradicciones entre documentos. Preguntas con la técnica de entrevista; respuestas del dueño:

| # | Tema | Resultado |
|---|---|---|
| Q1 | "Borrador guardado" | **"Si un cliente tiene nombre, ya es un cliente; borrador no tiene sentido que exista. Si no tiene libros, es prospecto."** [D] Se quita el indicador "Borrador guardado" (BR-CUS-14, ADR-0038). Un cliente con nombre y sin libros es un prospecto y sigue BR-CUS-05: oculto en las listas salvo "Incluir prospectos", visible en la búsqueda. |
| Q2 | Salir de la creación | **"Si el usuario intenta salir de un cliente de cualquier forma, es como si le diera en Descartar."** [D] Salir de la creación (atrás, menú, otra sección, Resumen) sin "Guardar cliente" abre la confirmación de Descartar con "Seguir editando" / "Descartar"; sin nombre sale directo. "Guardar cliente" es la única forma de conservar al cliente. Si la app se cierra por un fallo y no puede preguntar, el cliente queda guardado como estaba y se gestiona devolviendo libros y archivando. |
| Q3 | Campo de "guardado" | **"Opción A."** [D] No se guarda ningún campo: "Descartar" vive solo mientras la pantalla de creación esté abierta. El dominio no necesita saber si el cliente fue "guardado". |
| Q5 | Descartar | **"A"** [D] Borrado **lógico** (`deleted_at`) y atómico; se quita la excepción de BR-GEN-02 para clientes. |
| Q6–Q7 | Saldado contra Vencido | **"C"** y **"Confirmo"** [D] Saldado gana siempre a Vencido (saldo ≤ 0). Con saldo ≤ 0 "Dejar como está" no se ofrece en BR-PAY-13; con deuda pendiente sí. |
| — | Factura con varias fotos | **"No tiene que avisar si tienen la misma fecha, no se valida."** [D] El N.º de factura y la fecha no se validan entre fotos. |
| — | Monto en rojo | **"Eso se eliminó. Ya no vamos a poner el monto en rojo."** [D] Se cierra OQ-39. |
| — | Plazo de 14 días | **"No le pares bolas… ya se habló con un programador diferente llamado William para que nos ayude a codear en tiempo récord cuando ya esté la visual definida."** [D] El diseño tomó más días; se mantiene el plazo de 14 días para la fase 1 con William como apoyo de programación. |

*Nota:* la ronda "Sin código hasta cerrar el diseño" pasó de 22 a 21b para no repetir número con la ronda 22 de quitar un libro. Consecuencias: BR-GEN-02, BR-CUS-13/14, BR-PAY-13, AF-112, RQ-SAL-05, DOMAIN-MODEL, DATABASE, TESTING, ADR-0038.

---

## Ronda 25 — Hoy como resumen general (DT-09 parcialmente cerrada) (2026-11-05)

Entrevista (grill-me) sobre el choque entre BR-CAL-07 (Hoy mínimo) y DT-09 (Hoy como resumen general). Respuestas del dueño:

| # | Tema | Resultado |
|---|---|---|
| Q1 | Calendario y abonos | **"El calendario solo debe decirme cuántos cobros tengo. La sección de abonos es quien me muestra los abonos que tengo por cobrar. Lo del calendario del día es una vista muy general."** [D] Dos secciones separadas. |
| Q2 | Cobrar rápido | **"B. No puede haber ese error porque en el abono por cobrar debe estar claramente el nombre del cliente."** [D] Formulario corto precargado; el nombre del cliente va bien visible. |
| Q3 | Vencidos | **"B"** [D] Los vencidos entran a la lista de Hoy; se elimina el aviso único (BR-CAL-09). |
| Q4 | Libros en físico | **"Que dijera cuántos libros tengo en el inventario y que si le doy click me mande a la lista de libros en físico. Lo de por resolver ya se ve en inventario."** [D] Un número (`in_stock`) que abre Inventario ▸ en físico. |
| Q5 | Barra de meta | **"Sí"** [D] Se conserva. |
| Q6 | Otras cosas sin definir | **"Epa"** (= sí, en Colombia) [D] Fuera de la fase 1, backlog. |
| Q7 | Línea del calendario | **"Debo ver cuántos cobros tengo, si tengo una capacitación y visita para hoy… lo más parecido a lo que quiero es la B."** [D] Línea con conteos por tipo. |
| Q8 | Por cobrar | **"Sí, es así."** [D] Vencidos arriba, de hoy debajo, máximo 5 y «Ver todos». |
| Q9 | Método por defecto | **"Pon por defecto transferencia. Usualmente cobramos por WhatsApp."** [D] |
| Q10 | Número de libros | **"Sí"** [D] |
| Q11 | Orden | **"No, la tarjeta por entregar va a dejar de ser tan importante, porque para eso está esa tarjeta en Dinero. Lo primero sería el calendario, luego por cobrar, y luego los libros en físico."** [D] Orden: calendario → por cobrar → libros en físico. El lugar de «Por entregar» quedó **sin decidir** (OQ-40). |
| Q12 | Excepciones | **"Sí, hazlo."** [D] Excepciones nombradas solo para Hoy en BR-GEN-10, BR-GEN-12 y BR-GOAL-06. |
| Q14–Q15 | «Por entregar» en Hoy y «figuras geométricas» | **Sin responder**: el dueño cerró la conversación. Quedan como **OQ-40 y OQ-41** con supuesto del asistente. |
| Idea | Comprobante de abono | **"Que cuando se cobre un abono se genere una imagen con el nombre del colportor, los abonos cobrados, lo que falta y la fecha del próximo pago… «compartir por WhatsApp»… Si no es gratis, al menos que cree la imagen."** [D] Anotada como idea próxima en el backlog; **módulo aún sin crear** y sin más discusión por ahora. |

*Consecuencias:* BR-CAL-07/09, BR-GEN-10/12, BR-GOAL-06, RQ-CAL-05/07, F-20, DT-09, `HOY-BORRADOR.md`. BR-CAL-08 y BR-DEP-13 siguen vigentes hasta resolver OQ-40.

---

## Ronda 26 — Diseño exportado frente a docs, antes de las historias de usuario del back (2026-11-06 a 2026-11-08)

Se comparó el diseño exportado de Claude Design (`colportor-diseno.zip`, 05/11/2026; referencia: **escritorio claro**; en Dinero manda la «Exploración elegida · Por entregar (Cobrado) y Dinero total en una sola tarjeta») con los docs, en tres rondas de preguntas (grill-me). Las diferencias que siguen abiertas y lo que falta por diseñar están en `04-diseno/pendientes/`.

| # | Tema | Resultado |
|---|---|---|
| Q1/Q39 | Qué es "back" | **"Todo lo que no sea front, todo lo que no sea UI o componentes visibles. La lógica."** · **"Deja todo únicamente para que el front llame."** [D] ADR-0041. |
| Q2 | Cimientos | **"Dale, está bien."** [D] Login con usuario creado a mano, `title` y script de catálogo; sin invitaciones ni admin. |
| Q3/Q40/Q62 | Minibooks | **"No, eso no lo dejes listo porque es muy probable que cambie. Si te genera problemas, entonces no agregues nada de minibooks todavía."** [D] Solo sus ejemplares en Inventario; ventas y asignaciones a Abibonos, con su módulo. |
| Q4 | Visitas | **"Decide tú si dejarlo para después… o adelantar ahora esa parte."** [D] El asistente decidió **posponerlas** con Calendario: agregarlas después es aditivo. |
| Q5 | Reglas sin pantalla | **"Debes completar todo el back de los módulos que te pedí, siempre y cuando no estés dejando a medias algo que puede cambiar porque aún no tiene diseño… crea una carpetica con las cosas que a fecha de hoy no están en diseño."** [D] `04-diseno/pendientes/`. |
| Q6 | OQ-30, 31, 32, 35, 36 | **"Sí a los 5."** [D] |
| Q7 | Cancelar / "Borrador guardado" | **"Mandan los docs, crea también un documento que muestre las contradicciones que hay en diseño y en docs."** [D] El documento de contradicciones se resolvió y se borró el 2026-11-11 (ronda 27). |
| Q8 | Prospectos | **"Yes."** [D] Ocultos salvo "Incluir prospectos", solo en Todos. |
| Q9 | Último abono | **"Sí… una cuota inicial también cuenta como abono."** [D] `last_payment_at`. |
| Q10 | Orden | **"Mayor deuda es quién tiene mayor saldo pendiente."** [D] Próximo abono incluye vencidos. |
| Q11 | Cliente desde | **"Es la fecha en la que le agregué un libro… en un prospecto, la de creación."** [D] |
| Q12 | "Cuota quincenal" | **"No creo que sea una propiedad."** [D] La frecuencia no se guarda. |
| Q13/Q14 | Plan y fechas | **"Correcto."** [D] El plan nace con valor y primer abono; en creación se reemplaza; corregir (creación) frente a prorrogar (después). ADR-0045. |
| Q15 | Cuota inicial en $0 | **"Puedo poner que el valor de la cuota inicial es 0. El método de pago… no debería ser posible ponerlo… Pero sí debería poder programar los abonos."** [D] |
| Q16 | Método por defecto | **"Transferencia debería ser el método por defecto, siempre."** [D] BR-PAY-04. |
| Q17/Q42/Q43/Q63 | Factura | **"No quiero que haya fecha sin foto… lo más importante es la bendita foto de la factura… si se compra dos veces, tenga dos facturas… puede que en un futuro agregue algo como 'Ver facturas'."** [D] Tabla `customer_invoice`, ADR-0042. |
| Q18 | Borrar foto de factura | **"No es bueno que se borre una foto de una factura, pero aún así, lo debo permitir."** [D] BR-PHO-03 (la regla anterior no venía del dueño). Q44: el recibo de un Abibono confirmado sigue sin borrarse. |
| Q19 | Agregar libro | **"No se van a mostrar los libros agotados, quita esa regla… manda el diseño ordenado por título y luego por el más antiguo. Por ahora sin minibooks."** [D] ADR-0044. |
| Q20 | Enlace de Maps | **"Es algo que le falta al diseño… Deja el campo ahí."** [D] |
| Q21 | Agregar al inventario | **"Correcto."** [D] Por lote, ADR-0043. |
| Q22 | Favoritos | **"Favoritos ya no existe… un algoritmo que aprenda qué libros pide más… no en la v1."** [D] |
| Q23/Q24 | Precio y conteos de Inventario | **"Ese precio es una referencia, pero no una suma."** [D] Minibooks fuera de los conteos. |
| Q26/Q53 | Eliminar ejemplar | **"Se permite en ambos estados pero nunca en uno vendido… en un futuro… puede pedir una nota."** [D] BR-COPY-17. |
| Q27/Q54/Q55/Q66 | Resolver y deshacer | **"Deja que pidan nota opcional"** · **"Todas esas acciones deberían poderse deshacer."** [D] Apareció y Perdido desde el historial; Eliminar solo en el aviso. |
| Q28 | Devolver al líder | **"Sí."** [D] Por unidad; nota obligatoria. |
| Q30/Q31 | Dinero | **"Yes"** · **"Exacto."** [D] Exploración elegida; Dinero total = abonos no cancelados. ADR-0046. |
| Q32/Q56 | Programado con sobrante | **"Sería un caso terrible, pero puede suceder."** [D] Programado literal. El aviso en la ficha ya existe (BR-PAY-13) y falta en el diseño. |
| Q33/Q57 | Cancelados | **"No tiene sentido que cancelados aparezca en Todos… Va a afectar las cuentas"** · **"En una quinta pestaña de cancelados."** [D] |
| Q41 | Extensibilidad | **"Que se haga todo lo posible para que si hay que cambiar una tabla existente, no se dañe todo… que sea fácil de encontrar dónde se deben cambiar las cosas."** [D] CONVENTIONS §5b. |
| Q45 | Plan en cliente existente | **"Sí, vale."** [D] Reparte solo lo sin programar. |
| Q46 | Días del plan | **"Usualmente se refiere a los quinces y los 30 de cada mes… se busca el 15-16 o el 30-02 más cercano. Busca en internet… No creo que necesites preguntarme más."** [D] Investigado: en Colombia el sueldo se paga el 15 y el último día del mes. ADR-0045. |
| Q47/Q48 | Fechas pasadas y programar sin libro | **"Exacto."** · **"No tiene nada de sentido… pero vale."** [D] |
| Q49/Q50 | Descartar con dinero en un Abibono; restaurar | **"Ok."** [D] |
| Q51/Q64 | Fecha en Ejemplares | **"Recibido es recibido. Si organizo por vendido es otra cosa… los que no lo están aparecerán al final siempre, como lo hace Notion."** [D] |
| Q59 | Abono extra en Dinero | **"Ambos heredan el valor y fecha real."** [D] |
| Q60 | Cobro en un borrador | **"Desde que el Abibono no se haya entregado, se puede corregir."** [D] |
| Q65 | Vacíos al final | **"Correcto."** [D] BR-GEN-14. |
| Q37/Q38/Q61 | Diferencias visuales y entrega | **"Ok"** · **"Correcto"** · **"Sí."** [D] |

*Consecuencias:* ADR-0041 a ADR-0046; BR-GEN-12/14/15, BR-USR-08, BR-COPY-02/06/11/12/16/17, BR-CUS-04/05/09/10/14/17, BR-PAY-02/03/04/05/06/11/15/16, BR-DEP-02/05/12/13/14, BR-INV-02/03, BR-GOAL-03/06, BR-PHO-03, BR-AUD-01; DOMAIN-MODEL, DATABASE, GLOSSARY, FLOWS, FLOWS-ALTERNATIVOS (AF-115..117), REQUIREMENTS, TESTING, CONVENTIONS, ARCHITECTURE, OPEN-QUESTIONS, DESIGN-BRIEF; nuevas carpetas `04-diseno/pendientes/` y `07-historias-usuario/`.

---

## Ronda 28 — Cierre de las interpretaciones de las HU (2026-11-11)

El dueño revisó las 27 interpretaciones de `07-historias-usuario/INTERPRETACIONES.md`. Confirmó I-01 a I-05, I-09 a I-16, I-18 a I-27 sin cambios.

| # | Tema | Resultado |
|---|---|---|
| 1 | Separación mínima entre abonos (I-06, I-07) | **"No importa que sean muy seguidos los pagos, es muy probable que el usuario te diga: pasa mañana y te pago."** [D] Sin separación mínima; el primer abono sugerido es el siguiente día de pago, aunque sea mañana. ADR-0047. |
| 2 | «Correr también los siguientes» (I-08) | **"Solo se mueve el abono que editas."** [D] Mover una fecha nunca arrastra a las demás (al crear y con el cliente guardado). **"Se recalculan, porque apenas estamos creando el cliente"**: al crear, cambiar frecuencia, valor o primer abono del plan recalcula todos los abonos. ADR-0047. |
| 3 | Reemplazar el plan al crear (I-25) | **"Correcto."** Los abonos anteriores desaparecen sin rastro. |
| 4 | Borrar y Cancelar un programado (I-26) | **"Ambas acciones deberían ir separadas."** [D] Borrar = error de registro; Cancelar = se acordó y ya no se cobra (queda en Cancelados). |
| 5 | Libros en físico y títulos desactivados (I-16) | **"Tienes razón."** Libros en físico muestra títulos desactivados con ejemplares; Agregar al inventario solo los activos. |
| 6 | Orden de «Por resolver» (I-17) | **"La novedad va de la más nueva a la más antigua."** [D] Corrige la interpretación original. |
| 7 | Conteos de las pestañas (I-12) | **"Quedan fijos."** |
| 8 | Título automático del Abibono (I-18) | **"Ok."** Se cuentan solo los Abibonos no borrados del mismo día. |
| 9 | DT-10: identificador visual del título | **"Cada título tendrá una imagen que nosotros mismos proporcionaremos desde el panel del admin."** [D] Se descartan ícono y emoji; la imagen la sube el equipo desde Admin. Proporción de recorte y si es obligatoria: al diseñar Admin. |
| 10 | SG-01: medición de latencia desde un celular | Cerrada: los servidores (Supabase us-east-1 y Vercel iad1) ya están creados. |
| 11 | Orden del diseño | Dinero en móvil (FT-05) → Calendario → … → **Hoy al final** (es el resumen de todo). |
| 12 | SG-05: aviso de datos (Ley 1581) | Se deja **para el final**; el asistente debe recordarlo antes de abrir la app a otros colportores. |

*Consecuencias:* ADR-0047; BR-PAY-15, BR-GEN-15; HU-ABO-03/04/05, HU-INV-03; se elimina `paymentPlan.minGapDays` y el parámetro `shiftFollowing`.

---

## Ronda 29 — Nombre automático de los Abibonos (2026-11-12)

| # | Tema | Resultado |
|---|---|---|
| 1 | Nombre por defecto del Abibono | **"Quiero que se nombre ahora como Abibono (1), Abibono (2), y así, de forma consecutiva. Si al abibono 2 le cambio el nombre, el siguiente aún así por defecto se va a llamar Abibono (3). Si hay borradores, tampoco cuentan todavía en la secuencia."** [D] Reemplaza «Abibono – fecha». El número se asigna al confirmar y no cambia; renombrar no altera la secuencia; los borradores no consumen número. Detalles en I-28 a I-31 (por confirmar con el dueño). |

*Consecuencias:* BR-DEP-02; `leader_deposit.title` pasa a ser opcional y se agrega `deposit_number` (DOMAIN-MODEL, DATABASE); HU-DIN-01/04/05/06/07; FD-11.

---

## Decisiones derivadas (consecuencias lógicas de las respuestas, no preguntadas aparte)
1. **Restablecer contraseña también por enlace del admin** (AF-82, ADR-0027): el mismo límite de correo de Supabase que impide invitar por correo impide los restablecimientos automáticos.
2. **Repositorio de GitHub: `Colportaje`** (2026-11-04). Se pensó en `colportor`, pero el dueño ya había creado `hannerco/Colportaje` y pidió dejar todo con ese nombre.
3. **Estado `returned_to_leader`** y columna "Devueltos" en *Hacer inventario*; la identidad de control del inventario se actualiza.
4. **Recorte automático de abonos**: tras abono extra, desde el más próximo; tras devolución/baja de precio/archivado, desde el más lejano (modificable en el modal).
5. **Archivar** sustituye a "eliminar" cliente (conserva información, que el dueño quiere guardar).
6. Los abonos de Abibonos en **borrador** siguen contando como "Por entregar" hasta confirmarse, y vuelven a contar si el Abibono se reabre (AF-105).
7. **(2026-11-11, HU-BASE-01)** El bloqueo por versión de Node/pnpm se configura con `engineStrict: true` en `pnpm-workspace.yaml`, no con `engine-strict=true` en `.npmrc`: se comprobó que pnpm 12 ignora esa opción en `.npmrc` (instaló con `engines.node: ">=99"`). Con `pnpm-workspace.yaml` falla con `ERR_PNPM_UNSUPPORTED_ENGINE`. Además se fijó TypeScript 6.0 (no 7) porque `typescript-eslint` exige `< 6.1`, y ESLint 9 (no 10) porque los plugins de `eslint-config-next` aún no soportan ESLint 10.
8. **(2026-11-13, HU-BASE-02)** Las pruebas RLS (`tests/rls/`) se conectan al Postgres local con `pg` y cambian al rol `authenticated` con `request.jwt.claims`, como hace PostgREST; cada prueba corre en una transacción que se revierte (no deja usuarios ni tablas). Supuestos técnicos de la migración base, pendientes de visto bueno del dueño: `user_role` se lee solo lo propio (el admin, todo), como dice `DATABASE.md`; `is_admin()` exige además estar activo (BR-USR-07); cada usuario puede leer su `profile` aunque esté desactivado, para que HU-BASE-03 sepa que debe cerrar la sesión.
9. **(2026-11-13, HU-BASE-03)** Detalles técnicos: si un usuario se crea sin nombre en los metadatos (p. ej. a mano en el panel de Supabase), el trigger usa su correo como nombre para no bloquear el alta. La sesión distingue `expired` de `signed_out` según si la app pidió cerrarla; al cerrar sesión a propósito se borra la caché del dispositivo y al vencer se conserva (AF-83). Los errores de Auth sin traducción se devuelven como `AUTH_FAILED`. No se agregó `proxy.ts` de Next (renovar la sesión en el servidor) porque aún no hay rutas protegidas ni pantallas.
10. **(2026-11-13, HU-BASE-04)** El check del borrador de `title` (`category = 'minibook' or public_price > 0`) dejaba pasar un cultural sin precio público, porque en SQL una comparación con NULL no hace fallar un check; se corrigió en la migración y en `DATABASE.md`. Todo usuario activo lee el catálogo completo, también los títulos desactivados (`getMany` los necesita para ejemplares viejos); `listActive` filtra los activos. El script de carga no desactiva los títulos que faltan en el archivo: retirar uno es poner `isActive: false`.
11. **(2026-11-13, HU-BASE-05)** Fotos: `photo.bytes` guarda archivo + miniatura (lo que ocupa en Storage) y el uso total cuenta también las fotos borradas (lógico: sus archivos se conservan). `photo` lleva `updated_at` por el patrón de tablas de negocio (HU-BASE-02), aunque la HU no lo listaba, y un check que exige que la ruta esté en `{owner_id}/{kind}/`. El bucket `user-photos` acepta solo `image/webp` y hasta 1 MB. Nuevas claves de configuración: miniatura de 320 px de lado mayor y URL firmadas de 1 hora. La compresión se prueba en Node con un códec real (Skia, `@napi-rs/canvas`); en el navegador se usa el canvas, pendiente de verificar en iPhone (OQ-43).
12. **(2026-11-13, HU-BASE-06)** Sin conexión: las lecturas de TanStack Query se guardan en IndexedDB y se conservan 30 días; `lastSyncedAt` se calcula de la propia caché (la última lectura exitosa), así que persiste sin guardarlo aparte. Al cerrar sesión, o si entra otra persona tras vencer la sesión, lo guardado se borra **de inmediato** (puerto `OfflineCache`), porque el guardado periódico tarda hasta ~1 s y en ese lapso los datos quedarían en el dispositivo. Toda acción pasa por `runMutation` (sin red: `OFFLINE` sin ejecutar; red caída a mitad: `NETWORK_ERROR` reintentable). El *service worker* usa Serwist para Turbopack (`@serwist/turbopack`, servido en `/serwist/sw.js`). Íconos y colores del manifiesto son **provisionales** hasta el diseño. La E2E con Playwright que pide la HU se pospone: no hay pantallas que recorrer y crear una solo para la prueba sería UI fuera de alcance; CA-1 a CA-5 están cubiertos con pruebas unitarias y de integración.
13. **(2026-11-13, HU-CLI-01)** La cuenta del cliente (`computeCustomerAccount`) recibe solo ejemplares **vendidos** y descarta por sí misma los abonos cancelados y los borrados (`deletedAt`), para que R2 no dependa de quien la llame. El tipo `Payment` de HU-ABO-01 se definió ya en `src/domain/payment.ts` (con `isOverdue` y `overdueDays`, que pide esta HU); ABO-01 agrega su tabla y sus reglas sin cambiarlo. `customerSince` usa el día de Bogotá de la primera venta (`toBogotaDate`). Un abono con datos incompletos (que la base no permite) cuenta como 0 en vez de romper el cálculo.
14. **(2026-11-13, HU-INV-01)** Ejemplares: (1) el número lo asigna siempre un trigger al insertar (`next_copy_number` con un upsert que bloquea la fila del contador), aunque el cliente envíe otro, y nadie puede llamar `next_copy_number` por la API; (2) el historial (`copy_event`) lo escribe un **trigger** sobre `copy` en la misma transacción, así que ningún camino puede saltárselo (R4); la función que hace el cambio deja el motivo, la nota o el tipo de evento en la variable de transacción `colportor.copy_event`; `copy_event` lleva `seq` para un orden determinista dentro de una transacción; (3) la base valida las transiciones con la misma tabla que el dominio (`COPY_TRANSITIONS`) y una prueba verifica que coincidan; también impide cambiar dueño, título, número y precios copiados; (4) claves foráneas compuestas impiden vender a un cliente de otro usuario y que eventos o novedades apunten a otro dueño; (5) el usuario solo **lee** `copy`, `copy_counter`, `copy_event` y `copy_issue`: escribir será de las funciones SQL de cada HU de Inventario. Se corrigió la regla de capas de ESLint: `./copy` (p. ej. `domain/copy.ts`) se confundía con la capa `src/copy`.
15. **(2026-11-13, HU-ABO-01)** Abonos con el mismo patrón que los ejemplares: el usuario solo **lee** `payment`, `payment_reschedule` y `payment_event`; un trigger valida fechas (R5: no programar antes de hoy al insertar o cambiar la fecha; R6: fecha real no futura), protege la fecha original (R4; solo cambia en una corrección, marcada con `colportor.payment_correction = on`, que mueve ambas fechas y no deja prórroga) y aplica la misma tabla de transiciones que el dominio (`PAYMENT_TRANSITIONS`); otro trigger escribe el historial (R7): `canceled` al cancelar, `amount_reduced` al bajar el valor acordado de un abono por cobrar (recorte o ajuste), `reopened` al reabrir y una fila de `payment_reschedule` en cada prórroga; los datos extra (motivo, disparador, nota) llegan por `colportor.payment_event`. Checks adicionales de BR-PAY-03: el abono extra no tiene fecha acordada y la cuota inicial usa la de pago como acordada y original. Borrar (lógico) solo se permite en abonos por cobrar o cobrados (BR-PAY-11); un abono borrado no se edita.
16. **(2026-11-13, HU-INV-02)** `add_copies(p_batch_id, p_received_at, p_lines)` es la única forma de crear ejemplares desde la app (`security definer`, `execute` solo para `authenticated`; el dueño es siempre `auth.uid()`). Valida en este orden: sesión activa (`FORBIDDEN`), forma del lote (`VALIDATION`), `BATCH_EMPTY`, `DATE_IN_FUTURE` (Bogotá), ids repetidos (`VALIDATION`). Idempotencia (R6): si **todos** los `copyIds` ya existen, son del usuario y del mismo título, devuelve los ya creados; si existen solo algunos, o de otro usuario o título, `CONFLICT` sin crear nada. Los títulos del lote se bloquean (`for share`) antes de comprobar que siguen activos, para que una desactivación simultánea no se cuele; un título inexistente cuenta como `TITLE_INACTIVE`. Los ejemplares se numeran en el orden de las líneas (el del Resumen: categoría y nombre). El evento `received` guarda también el `batchId` del lote (se amplió `copy_write_events` con una migración nueva, sin editar la de HU-INV-01). Los errores de las funciones SQL llegan como `raise exception 'CODIGO: …'` (`P0001`) y el adaptador los traduce con `mapRpcError`; patrón para las siguientes funciones.
17. **(2026-11-13, HU-INV-03)** Libros en físico sin cambios de esquema: el conteo se arma en el dominio (`buildInStockSummary`) a partir de los ejemplares en físico y con novedad no eliminados, y de sus títulos leídos por id (así aparecen los desactivados, CA-5). Culturales y religiosos van juntos en `titles`, ordenados solo por nombre. Las lecturas leen por páginas (`selectAll`), porque PostgREST corta cada respuesta en 1.000 filas (`max_rows`) y un inventario con muchos minibooks las supera. En Por resolver, `flaggedAt` es la fecha de la novedad abierta; si un ejemplar con novedad no la tuviera (la base no lo impide todavía; lo hará la función de HU-INV-07), sale sin nota y con la fecha del último cambio del ejemplar.
18. **(2026-11-13, HU-ABO-07)** `resolve_schedule_excess(p_customer_id, p_choice, p_trigger)` bloquea el cliente y sus programados, **recalcula** saldo, programado y sobrante sobre lo vigente (igual que `computeCustomerAccount`; los canjes de saldo a favor llegan con Minibooks) y aplica la opción con la misma tabla de motivos que `EXCESS_TRIGGERS` (prueba de paridad). Códigos: con **Recortar** o **Cancelar los que marque**, si al aplicar ya no hay sobrante la respuesta es `CONFLICT` (CA-7: algo cambió desde la evaluación) y también si un abono marcado ya no está por cobrar o no es de ese cliente; con **Dejar como está**, sin sobrante es `NO_EXCESS` y con saldo 0 o a favor `LEAVE_NOT_ALLOWED`. "Dejar como está" no escribe nada (ni la última modificación del cliente); recortar o cancelar sí la actualizan (BR-CUS-16). Los eventos `canceled` y `amount_reduced` llevan el `trigger`. En la lista del modal los programados van del más próximo al más lejano, cualquiera sea el orden sugerido. Se agregaron `CustomerRepository.getAccountData` (datos para derivar la cuenta, reutilizable por las HU de Clientes) y `PaymentRepository`.
19. **(2026-11-13, HU-DIN-01)** Abibono con el mismo patrón: el usuario solo **lee** `leader_deposit`, `leader_deposit_event` y `leader_deposit_counter`; escriben las funciones de HU-DIN-04/05/07. El número (R7) lo asigna un trigger al pasar de borrador a confirmado por primera vez, desde un contador por colportor (como `copy_counter`), y no se puede escribir ni cambiar; para que nunca se pierda ni se reutilice, **solo se puede borrar un borrador que nunca se confirmó** (uno reabierto conserva su número y no se borra). Confirmado: solo cambia la nota (y se agregan fotos); título, fecha, montos y fecha de confirmación quedan bloqueados, también en la actualización que lo reabre (se editan después). Reabrir exige motivo, que llega por `colportor.deposit_event` y queda en `leader_deposit_event`. Un abono entregado no cambia nada salvo volver a cobrado al reabrir. **R6 (entregado ⇔ Abibono confirmado) se comprueba al final de la transacción** (triggers de restricción diferidos), para que confirmar y reabrir cambien Abibono y abonos en cualquier orden; las pruebas de HU-ABO-01 que crean abonos entregados sin Abibono siguen siendo válidas porque nunca confirman su transacción. Borrar un abono exige quitarlo antes de su borrador (BR-PAY-11). Las fotos de recibo exigen Abibono, su vínculo no cambia y en un confirmado no se borran. Las reglas para confirmar (recibo, total > 0, nota) quedan en el dominio (`confirmBlockers`) y las aplicará la función de HU-DIN-05.
20. **(2026-11-13, HU-CLI-02)** Ficha viva: el usuario crea y edita su cliente **directo por la API** (RLS de HU-CLI-01; no hace falta función SQL porque cada cambio es de una sola fila). Crear es idempotente por `id` (`on conflict do nothing`: reintentar no pisa lo ya escrito; un id de otro usuario da `CONFLICT`). La base refuerza el enlace de Maps (check con la misma regla que el dominio, comparada en una prueba) y bloquea editar un archivado (`CUSTOMER_ARCHIVED`; restaurar sí se permite). Se aceptan los tres dominios de la HU (`google.com/maps` y `www.google.com/maps`, `maps.google.com`, `maps.app.goo.gl`), que amplían los dos de SECURITY.md; otros dominios de Google (p. ej. `google.com.co`) no. El nombre se guarda sin espacios a los lados; teléfono, información y dirección **tal cual** (vacíos = `null`). Teléfono para duplicados: solo dígitos y sin el `57` delante de un número de 10 dígitos. **Umbral de nombre parecido = 0,85** (1 − distancia de edición relativa entre nombres normalizados, tomando también las palabras ordenadas: «Gómez María» = «María Gómez»); con él, «Natalia Cardenaz» o «Jhon/John» son duplicados y «Pedro/Pablo Pérez» no. Los duplicados salen primero por teléfono y luego del nombre más parecido al menos.
21. **(2026-11-13, HU-INV-04)** La lista de ejemplares lee una vez los ejemplares no eliminados, sus títulos y los clientes (nombre y emoji), y `buildCopiesListView` calcula en el teléfono vistas, conteos, filtro, orden y búsqueda: cambiar cualquiera no vuelve a la red y funciona sin conexión. La firma no lleva `today` (la HU la listaba, pero nada de la lista depende del día). Búsqueda: un texto que es solo un número (`12` o `#12`) busca **ese número exacto** y nada más; cualquier otro texto busca en el título y en el nombre del cliente. Orden «Precio acordado»: los no vendidos no tienen precio acordado y van al final en ambos sentidos (BR-GEN-14). Desempate en todos los órdenes: título, número e id, siempre ascendentes. La fecha de venta de la fila se muestra en Bogotá.
22. **(2026-11-13, HU-INV-05)** La fecha de recibido la valida un **trigger en toda escritura del ejemplar** (no solo al editarla): no futura (Bogotá) ni posterior al día de la venta (en Bogotá; una venta a las 10:30 p. m. cuenta para ese día); así, vender con una fecha de venta anterior al recibido también se rechaza. El usuario la cambia con la función `update_copy_received_date` (solo lee la tabla); no toca nada del cliente (R4), ni su última modificación. En el detalle, **solo el cambio de estado más reciente** se puede deshacer, y solo si sigue vigente (un «Devuelto al líder» con el ejemplar aún devuelto; «Apareció» con el ejemplar aún en físico; «Perdido» con el ejemplar aún perdido); los cambios de precio o de fecha de recibido no tapan esa resolución. `restorePublicPrice` = vendido, no minibook y con precio distinto del público. Los eventos que mencionan un cliente llevan también su nombre (`customerName`). Para las pruebas de casos de uso hay repositorios falsos compartidos en `tests/support/fake-repositories.ts`.
23. **(2026-11-13, HU-CLI-09)** `assign_copy_to_customer` bloquea el cliente y el ejemplar (`for update`): de dos asignaciones simultáneas solo una lo logra y la otra recibe `COPY_NOT_IN_STOCK` (R6; probado con dos sesiones a la vez y con verificación por mutación del bloqueo). Si el ejemplar ya está vendido **al mismo cliente**, es un reintento y no hace nada (idempotente). Orden de los errores: cliente inexistente o ajeno (`NOT_FOUND`), cliente archivado, ejemplar inexistente, minibook, no en físico. `return_copy_from_customer(p_copy_id, p_reason)` se hizo aquí con los dos motivos (`wrong_registration` para quitar durante la creación; `customer_returned` para la devolución de HU-CLI-10), devuelve el cliente y mueve su última modificación; quitar un ejemplar que ya no está vendido da `COPY_NOT_SOLD` (también en un reintento). Lectura de CA-5: la clienta debe 180.000 por **dos** libros (95.000 + 85.000); al quitar el de 85.000 queda 95.000 frente a 140.000 programados → sobrante 45.000.
24. **(2026-11-13, HU-ABO-02)** Funciones `set_creation_down_payment`, `register_collected_payment`, `update_collected_payment` y `delete_payment`, todas con la última modificación del cliente (también en un archivado: R5 y R7). **Cuota inicial de la ficha nueva = una sola:** el servidor busca la vigente (la de ese id o, si no, la más antigua del cliente) y la actualiza; 0 o vacío la borra (lógico); así un reintento o un id distinto no crean una segunda. Al **actualizar** se cambian valor y método, y la fecha queda la de cuando se creó (la ficha nueva se llena en una sola sentada). **Se amplió `payment_guard`** (migración nueva, sin editar la de HU-ABO-01): en una cuota inicial, la fecha acordada y la original siguen a la fecha real al corregirla (BR-PAY-03), que antes el trigger impedía. `register_collected_payment` es idempotente por id (otro cliente con ese id → `CONFLICT`). `update_collected_payment` solo corrige cobrados (un programado → `VALIDATION` en `status`; editar programados es HU-ABO-04). `delete_payment` borra programados o cobrados, quita del Abibono borrador, es idempotente y devuelve el estado que tenía: si era un cobro, el disparador es `delete_collected`; si era un programado, `form_edit`. Los errores `VALIDATION` de la base traen el campo (`paidAmount`, `paidAt`, `kind`, `status`).
25. **(2026-11-13, HU-ABO-03)** `buildPaymentPlan` recibe `today` como segundo parámetro (la HU no lo listaba, pero lo necesita para rechazar un primer abono anterior a hoy y el dominio no lee el reloj). Días de pago desde la configuración: el 30 es el último día en meses más cortos (febrero 28 o 29) y el 31 nunca es día de pago. `apply_payment_plan` recalcula la base con la cuenta vigente (lo que falta pagar en `replace_all`; lo sin programar en `unscheduled_only`) y exige que los abonos la sumen exactamente (`PLAN_TOTAL_MISMATCH` si la cuenta cambió entre la vista previa y el guardado: la app rehace el plan). El servidor **no** exige múltiplos de 1.000 (el más próximo absorbe lo que sobra, p. ej. 55.500); eso lo valida el dominio sobre el valor elegido. Es idempotente: si todos los ids ya existen como programados del cliente, el plan ya se aplicó; mezclar ids existentes y nuevos → `CONFLICT`. `replace_all` borra los programados sin dejar evento (R5).
26. **(2026-11-13, HU-ABO-04)** `schedule_single_payment`, `update_scheduled_amount`, `correct_scheduled_date` y `cancel_scheduled_payments`, todas con la última modificación del cliente. Corregir la fecha usa la marca `colportor.payment_correction` (HU-ABO-01): mueve fecha acordada y original de **ese** abono y no deja prórroga; que sea solo durante la creación lo decide el front (el servidor no distingue «creación» de «guardado»). Editar el valor deja `amount_reduced` con disparador `form_edit` cuando baja. Cancelar es todo o nada, con abonos de un **mismo** cliente (si no, `VALIDATION`), motivo `manual` y evento `canceled`; los ya cancelados se ignoran (reintento). Un cliente archivado no admite programar, editar ni corregir (`CUSTOMER_ARCHIVED`); un abono que no está por cobrar → `PAYMENT_NOT_SCHEDULED`. Borrar un programado es `delete_payment` (HU-ABO-02).
27. **(2026-11-13, HU-ABO-05)** `reschedule_payment(p_payment_id, p_new_due_date, p_note, p_confirmed)` mueve solo ese abono; la fila de `payment_reschedule` (con la nota) la escribe el trigger de HU-ABO-01 y la fecha original no cambia. Orden de los errores: fecha anterior a hoy (`DATE_IN_PAST`), no posterior a la actual (`DATE_NOT_LATER`), más allá de hoy + 2 meses sin confirmar (`RESCHEDULE_NEEDS_CONFIRMATION` con `details.dates`). El límite de 2 meses vive en `businessConfig.reschedule.confirmBeyondMonths` y la base lo aplica con `interval '2 months'` (Postgres ya ajusta 31/12 + 2 meses = 28/02); una prueba compara ambos límites (si se cambia la configuración, hay que cambiar también la función). Un reintento de la misma prórroga (la fecha ya es la nueva y la última fila de historial la registra) devuelve el mismo movimiento sin otra fila. La app puede pasar la fecha actual del abono para avisar `DATE_NOT_LATER` sin ir a la red; la base lo valida igual.
28. **(2026-11-14, HU-ABO-06)** `collect_payment(p_payment_id, p_paid_amount, p_paid_at, p_method)` devuelve `(customer_id, agreed_amount, paid_amount)`; con valor nulo usa el acordado, con fecha nula hoy y con método nulo Transferencia, de modo que los valores por defecto los pone la base con el dato vigente. El faltante (`shortfall`) se calcula con lo que devuelve la base y nunca crea otro abono. **`excess` solo se evalúa cuando se pagó más de lo acordado** (R3); si se pagó lo acordado o menos es `null`, aunque quedara un sobrante anterior que el usuario ya decidió dejar (cobrar lo acordado o menos nunca aumenta el sobrante). **Sin reintento idempotente:** cobrar un abono ya cobrado da `PAYMENT_NOT_SCHEDULED` (CA-5), aunque sea con los mismos valores; como cobrar exige conexión, si se pierde la respuesta el front relee la ficha. "Por entregar" (R5) se verifica en la base (cobrado y sin Abibono); el resumen de Dinero llega con HU-DIN-02.
29. **(2026-11-14, HU-CLI-07)** **Orden:** HU-CLI-07 y HU-CLI-08 se hacen antes de HU-CLI-03, porque el descarte borra fotos y facturas y su CA-1 cuenta una foto, pero el vínculo foto–cliente (`photo.customer_id`) llega con CLI-07 y la factura con CLI-08 (decisión de William, 2026-11-14). **Fotos de información:** `photo.customer_id` con FK compuesta al cliente del mismo dueño y el check de DATABASE.md `(kind <> 'deposit_receipt') = (customer_id is not null)` (las de factura también llevan cliente). El usuario sigue escribiendo `photo` por la API (RLS de HU-BASE-05) y dos triggers refuerzan la HU: `photo_customer_guard` (el cliente de una foto no cambia; agregar a un cliente archivado → `CUSTOMER_ARCHIVED`, a uno ajeno o borrado → `NOT_FOUND`; borrar se permite siempre) y `photo_touch_customer` (agregar o borrar mueve `customer.updated_at`, BR-CUS-16; otros cambios no). `deleteCustomerInfoPhoto` solo borra fotos `customer_info` (otro tipo → `NOT_FOUND`), para que una factura no pierda su foto por este camino. Las pruebas de HU-BASE-05 que insertaban fotos `customer_info` sin cliente ahora crean uno (lo anticipaba su R5).
30. **(2026-11-14, HU-CLI-08)** Facturas: `customer_invoice` solo se lee por la API; se escribe con `create_invoice_with_photo` (fecha = hoy en Bogotá), `add_invoice_photo`, `update_invoice(p_invoice_id, p_patch jsonb)` (clave ausente no cambia, `null` vacía, N.º recortado y vacío = `null`) y `delete_invoice_photo` (devuelve si la factura se borró con su última foto). Las fotos de factura no se insertan ni se modifican directo por la API (trigger `photo_invoice_guard`: solo las funciones, que corren como su dueño), y una verificación diferida exige al cerrar la transacción que toda factura activa tenga una foto activa y que toda foto activa de factura sea de una factura activa del mismo cliente. **Decisiones a validar:** (a) la fecha de factura acepta cualquier día real, también futuro (la HU solo pide rechazar una fecha inválida); (b) editar N.º o fecha de un cliente archivado da `CUSTOMER_ARCHIVED` (como el resto de la ficha, HU-CLI-02 R6), y agregarle facturas o fotos también; borrar fotos se permite siempre; (c) orden de la lista: fecha descendente, sin fecha al final y, a igual fecha, la creada más recientemente primero; las fotos de cada factura en el orden en que se subieron; (d) la imagen completa se abre con `usePhotoUrl(photoId)` de HU-CLI-07.
31. **(2026-11-15, HU-CLI-03)** Descartar: `discard_new_customer(p_customer_id)` bloquea el cliente y sus abonos (`for update`), rechaza con `CUSTOMER_DISCARD_BLOCKED` si algún abono tiene Abibono (borrador o confirmado) y, si no, en una transacción devuelve los libros a físico con `wrong_registration` (`received_at` intacto) y deja con `deleted_at` abonos, fotos (de información y de factura), facturas y el cliente. El resumen sale de una función de lectura `customer_discard_summary` (una sola consulta, coherente). `payment_guard` permite borrar un abono **cancelado** solo dentro del descarte (contexto `colportor.customer_discard`); fuera de él sigue prohibido. **Decisiones a validar:** (a) `payments` del resumen no cuenta los abonos cancelados (ya no son abonos para el usuario), aunque el descarte también los borra; (b) `photos` cuenta solo las fotos de información; las de factura van dentro de `invoices`; (c) descartar un cliente archivado da `CUSTOMER_ARCHIVED` (no puede estar en creación); (d) descartar dos veces da `NOT_FOUND`, como pide la HU: si un reintento tras un fallo de red recibe `NOT_FOUND`, el front debe tomarlo como descartado.
32. **(2026-11-15, HU-CLI-04)** Lista de clientes: `buildCustomerListView(customers, accounts, params, today)` (`src/domain/customer-list.ts`) deriva la cuenta de cada cliente con `computeCustomerAccount`; `accounts` son los ejemplares vendidos (con título) y abonos de cada cliente, y `today` decide los vencidos. La app lee una vez todos los clientes no borrados, sus ejemplares vendidos y sus abonos (`listForCustomerList`, tres lecturas por la API con RLS) y calcula pestañas, filtro y orden en el teléfono (`useCustomerList`). La búsqueda (`search`) llega con HU-CLI-05. **Decisiones a validar:** (a) en "Mayor deuda" los prospectos cuentan como vacío (muestran "—") y van al final en ambos sentidos, aunque tengan un abono que les deje saldo a favor; (b) el filtro de estado también aplica en Archivados, sobre el estado de cada archivado; (c) `isDefaultView` no mira la pestaña (la HU solo nombra orden, sentido, filtro e interruptor); (d) con dos ejemplares vendidos en el mismo instante, el "más reciente" se desempata por id (determinista). Se halló un riesgo de HU-BASE-06 con las fechas del caché sin conexión (SG-11).
33. **(2026-11-15, HU-CLI-05)** Búsqueda: Fuse.js 7.5.0 en `src/domain/customer-search.ts` (decisión del dueño: se permite en el dominio como librería de cálculo puro, ADR-0048). Umbral `search.fuzzyThreshold` = **0,3** (con 0,35 "carlos" ya trae a "Marcos"). Cada palabra es un término difuso y todas deben coincidir; un campo combinado deja que caigan en campos distintos ("maria corazon" = nombre + libro). El nombre pesa más que información, dirección y libros. El teléfono se compara por dígitos y por contenido exacto, no difuso. `useCustomerList` recibe `search` e `includeArchivedInSearch` y devuelve `emptySearch`. **Decisiones a validar:** (a) con búsqueda en Deudores o Saldados, "Buscar en Archivados" agrega los archivados de ese estado (en Todos, todos los archivados que coinciden); (b) `canSearchArchived` es verdadero si todavía se puede ampliar (no se está en Archivados ni con archivados incluidos), sin mirar si hay archivados que coincidan; (c) `query` y `createName` son el texto sin espacios sobrantes; (d) el teléfono no tolera errores (un dígito distinto no encuentra), para no traer números parecidos.
34. **(2026-11-15, HU-CLI-06)** Ubicación: `validateLocation`, `isApproximate`, `mapsLinkFor` y `getInitialPickerCenter` en `src/domain/customer-location.ts`; guardar y quitar actualizan `customer` por la API (RLS), con la última modificación por el trigger `set_updated_at` y el bloqueo de archivados de HU-CLI-02 (`CUSTOMER_ARCHIVED`). El enlace por coordenadas usa a lo sumo 6 decimales (los que guarda la base) y nunca notación científica. El último punto elegido vive en `localStorage` (`LastPickerPointStore`), a nombre del usuario, y se borra al cerrar sesión a propósito. **Decisiones a validar:** (a) la precisión admite `null` cuando el pin se ubicó a mano sin GPS (permiso negado o sin señal); `isApproximate(null)` es falso; (b) la precisión debe llegar entera: el front redondea los metros del GPS antes de guardar (R1); (c) guardar la ubicación de un cliente la recuerda sola como último punto elegido; `rememberLastChosenPoint` queda para cuando se confirma un punto sin guardarlo; (d) el enlace pegado a mano solo se usa si pasa la validación de dominios (si no, se salta a la dirección).
35. **(2026-11-15, HU-CLI-10)** Devolver un libro: `returnCopyFromCustomer(copyId, reason)` usa `return_copy_from_customer` de HU-CLI-09, que ahora rechaza un minibook con `COPY_IS_MINIBOOK` (antes de `COPY_NOT_SOLD`; aplica también a quitar al crear). Trae la cuenta, `becameProspect` (no le queda ningún libro) y la evaluación de sobrante con disparador `return` (modal, del más lejano, `book_returned`). Abonos y Abibonos no cambian (probado comparando su estado antes y después, también con un Abibono confirmado). La regla de estadísticas queda en el dominio: `countsAsCustomerReturn(event)` (solo `returned` con `customer_returned`). **Decisión a validar:** (a) el error de minibook se comprueba antes que "no vendido": un minibook nunca se devuelve por este camino, esté como esté.
36. **(2026-11-15, SG-11, corrige HU-BASE-06)** Fechas en la caché sin conexión: el persister de TanStack Query guarda cada `Date` como `{ "$colportorDate": "<ISO>" }` (o `null` si es inválida) y al leer la vuelve a convertir en `Date` (`serializeCache` / `deserializeCache` en `src/adapters/browser/query-persister.ts`). Antes volvían como texto y, al reabrir la app sin conexión, las listas que usan fechas (clientes, ejemplares, historial, fotos) fallaban. `CACHE_BUSTER` pasa a `v2`: una caché guardada con el formato anterior se descarta y la app vuelve a leer al tener conexión. Aprobado por el dueño el 2026-11-15.
37. **(2026-11-15, HU-CLI-11)** Archivar y restaurar: `archive_customer` bloquea el cliente (`for update`, como `assign_copy_to_customer`), rechaza con `CUSTOMER_HAS_BOOKS` si tiene ejemplares vendidos y, en una transacción, cancela sus programados con motivo `customer_archived` (evento `canceled` con `trigger: customer_archived`), fija `archived_at` y mueve la última modificación; cobrados y entregados no cambian. `restore_customer` quita `archived_at` (también mueve la última modificación) y no revive cancelados. La vista previa (`getArchivePreview`) se calcula con la cuenta que ya lee la ficha, sin función nueva. **Se cerró un hueco de HU-CLI-01/02:** el usuario podía cambiar `archived_at` y `deleted_at` con un UPDATE directo por la API (archivar con libros vendidos o "descartar" dejando libros y abonos sueltos); el trigger `customer_guard_lifecycle` lo impide (`INVALID_TRANSITION`) y solo las funciones lo hacen; se ajustó la prueba A/B de HU-CLI-01 que archivaba directo. **Decisiones a validar:** (a) archivar un cliente ya archivado no hace nada (reintento seguro), mientras que restaurar uno no archivado da `CUSTOMER_NOT_ARCHIVED`, como pide la HU; (b) restaurar también mueve la última modificación; (c) la etiqueta "(cliente archivado)" de Dinero se deriva de `archived_at` del cliente: se pintará cuando exista la lectura de Dinero.
38. **(2026-11-15, HU-INV-06)** Precio acordado: `update_agreed_price(p_copy_id, p_price default null)` (`null` = "Restaurar" al precio público copiado) bloquea el ejemplar, rechaza minibook (`COPY_IS_MINIBOOK`) y no vendido (`COPY_NOT_SOLD`), y si el precio cambia lo guarda (el trigger de HU-INV-01 registra `price_changed` con precio anterior y nuevo) y mueve la última modificación del cliente; con el mismo precio no hace nada (R5). Devuelve el precio anterior y el nuevo: la app evalúa el sobrante con `price_decrease` **solo si bajó** (`evaluatePriceChange`); subir nunca lo genera. **Decisiones a validar:** (a) restaurar con el precio ya igual al público no registra nada (es el mismo caso de R5); (b) si al subir el precio el cliente ya tenía un sobrante anterior ("Dejar como está"), no se vuelve a mostrar el modal: la HU dice que subir nunca genera `excess`.
39. **(2026-11-15, HU-INV-07)** Novedades: `flag_copy`, `resolve_copy_issue` y `undo_resolve_copy_issue`. Eliminar como resolución queda en el historial como `resolved` con `resolution: removed` (no como `deleted`), y deshacerlo como `undo_resolved`: para eso `copy_write_events` toma el tipo del contexto también al deshacer un borrado (sin contexto sigue siendo `undo_deleted`, para HU-INV-08). Deshacer (R4) exige que el último cambio de estado del ejemplar sea esa resolución y que siga vigente (Apareció y en físico, Perdido y perdido, Eliminar y borrado); la regla vive en el dominio (`undoableResolution`, que ahora usa también el historial de HU-INV-05) y en la base con la misma lista de eventos de estado. **Decisiones a validar:** (a) el id de la novedad lo genera la base (marcar dos veces ya da `COPY_NOT_IN_STOCK`, así que no hace falta reintento idempotente); (b) la nota al marcar se guarda sin espacios sobrantes, y una nota de resolución vacía queda sin nota; (c) un ejemplar resuelto como Eliminar sí se puede deshacer por la función en cualquier momento mientras siga borrado; que solo se ofrezca desde el aviso es del front (BR-COPY-11).
40. **(2026-11-15, HU-INV-08)** Eliminar un ejemplar: `delete_copy` borra (lógico) un ejemplar en físico con evento `deleted` (estado anterior y nota) y, si tiene novedad, la resuelve como `removed` reutilizando `resolve_copy_issue`; `undo_delete_copy` deshace solo si el último cambio de estado es esa eliminación (vuelve a físico con `undo_deleted`, o a Por resolver con la misma novedad vía `undo_resolve_copy_issue`). El número no se reutiliza (el contador no retrocede). `isDeletable` en el dominio es la única regla de qué estados permiten eliminar (también la usa el detalle de HU-INV-05). **Decisiones a validar:** (a) `NOTE_REQUIRED` lo valida la app con `copyDelete.noteRequired`; la base no conoce esa configuración, así que si se activa no hay red de seguridad en la base (moverla a `app_settings` lo resolvería, si el dueño lo quiere); (b) la nota se guarda sin espacios sobrantes y vacía = sin nota; (c) deshacer una eliminación no tiene límite de tiempo en la base (R6): mientras el ejemplar siga eliminado se puede, y el aviso de unos segundos es del front.
41. **(2026-11-15, HU-INV-09)** Devolver al líder: `return_copies_to_leader(p_op_id, p_copy_ids, p_minibook_lines, p_note)` es todo o nada (R2): bloquea los ejemplares, rechaza con `COPY_NOT_IN_STOCK` (con los ids) si alguno ya no está en físico y con `NOT_ENOUGH_STOCK` (con el título) si falta stock de un minibook; para los minibooks toma los de recibido más antiguo, luego número e id (R3, OQ-30). Cada evento `returned_to_leader` guarda la nota y el `opId`; reintentar con el mismo `opId` devuelve los mismos ids sin tocar nada (R6), y un candado por operación (`pg_advisory_xact_lock`) impide que dos envíos simultáneos devuelvan el doble. `undo_return_to_leader` exige nota y que el ejemplar siga devuelto (R5). Candidatos (`useReturnToLeaderCandidates`) y resumen (`returnSelectionSummary`) se calculan en el teléfono. **Decisiones a validar:** (a) los minibooks que se pidan por cantidad no repiten ejemplares marcados por unidad; (b) una línea de minibooks con un título que no es minibook da `VALIDATION` (`minibookLines`); (c) un ejemplar ajeno o eliminado en la selección se informa como `COPY_NOT_IN_STOCK`, sin revelar si existe; (d) la nota se guarda sin espacios sobrantes.
42. **(2026-11-15, HU-CLI-12)** Ficha del cliente: `buildCustomerDetail(input, today)` (`src/domain/customer-detail.ts`) arma la ficha con la cuenta de HU-CLI-01, libros por fecha de venta con su diferencia, abonos por fecha (real si cobrado, acordada si por cobrar; a igual fecha, el creado antes y luego por id) con `isOverdue`, `overdueDays`, prórrogas, Abibono e indicadores `can.*`, cancelados aparte, avisos, ubicación y enlace de Maps; `loadCustomerDetail` le suma fotos de información y facturas con miniaturas firmadas, y `useCustomerDetail` la deja en la caché del teléfono (CA-6). Sin cambios de esquema. **Decisiones a validar:** (a) `can.*` refleja lo que hoy aceptan las funciones: por cobrar → todo (`collect`, `edit`, `delete`, `reschedule`, `correctDate`, `cancel`) salvo cliente archivado; cobrado no entregado → `edit` y `delete`, también si está en un Abibono borrador o el cliente está archivado (AF-47); entregado y cancelado → nada; (b) WhatsApp usa el indicativo 57 si el número tiene 10 dígitos y, si no, los dígitos tal cual (`+57 300…` → `wa.me/57300…`); un teléfono sin dígitos no da botones; (c) **observación sobre CA-1:** con fecha del 05/11, el abono del 31/10 también está vencido (no solo el del 17/10), porque sigue por cobrar y saldo 380.000 = 460.000 − 80.000; la prueba lo refleja así.
43. **(2026-11-15, HU-DIN-02)** Resumen de Dinero: `computeMoneySummary(payments, unscheduled, deposits)` y `percentagesSummingTo100` (resto mayor; a igual resto, el que va antes) en `src/domain/money-summary.ts`; el monto de cada abono sale de `moneyAmount` (ADR-0046). Nuevo `MoneyRepository` (`listSummaryPayments`, `listSummaryDeposits`) y feature `money` con `useMoneySummary` y `useUnscheduledCustomers` bajo la clave `['money']`, que las acciones de abonos, libros y clientes ya invalidaban. Lo sin programar sale de la cuenta de cada cliente que ya carga la lista de clientes (HU-CLI-04). Sin cambios de esquema. **Decisiones a validar:** (a) los abonos de clientes descartados se excluyen dos veces: el descarte los borra y, además, el resumen solo toma los de clientes no borrados (R6); (b) un cobrado sin método (no debería existir: la base lo exige) contaría como transferencia; (c) en la lista "Sin programar", a igual monto se ordena por nombre y luego por id.
44. **(2026-11-15, HU-DIN-03)** Lista de abonos: `buildPaymentsListView(payments, customers, params, today)` (`src/domain/payments-list.ts`) con vistas, conteos independientes del método, la búsqueda y el chip Vencidos, valores acordados de `displayAgreed`, vacíos al final y desempate por nombre del cliente e id; `usePaymentsList` sale de la **misma lectura** que el resumen (`['money', 'data']`): `MoneyRepository.listSummaryPayments` pasó a `listPayments` y devuelve los abonos completos con su Abibono. Sin cambios de esquema. **Decisiones a validar:** (a) `canCollect` también es falso en un por cobrar de un cliente archivado (sus funciones lo rechazan; en la práctica no hay, porque archivar los cancela); (b) `inDraftDeposit` marca los cobrados que están en un Abibono borrador; (c) la búsqueda solo mira el nombre del cliente (R7). **Prueba inestable corregida:** una prueba de integración nueva suponía el orden entre dos filas que empataban por nombre y se desempatan por id aleatorio; ahora compara sin ese orden (5 de 5 corridas verdes). El fallo aislado visto en HU-CLI-11 no se ha vuelto a ver y sigue sin identificar.

## Correcciones al propio asistente (para no repetir errores)
0. **(Ronda 19)** Se recomendó quitar la etiqueta "Debe" y renombrar "Pagando" como verde sin conocer el motivo del dueño (el número era ambiguo); además se pasó por alto que el generador de plan de abonos tenía que ser solo del cálculo automático. Se verificó con el dueño antes de editar.
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
14. **Fórmula del saldo (2026-10-29):** la documentación decía `balance = debt − paid_total − credit_applied`, lo que hacía que entregar un minibook con saldo a favor *aumentara* el saldo a favor, contra BR-MBK-07 y AF-10. Lo detectó una prueba ejecutable al preparar el dominio (ese código se descartó el 2026-11-04; la corrección sigue vigente). El signo correcto es `+ credit_applied` (ADR-0033); se corrigió en BR-CUS-04, DOMAIN-MODEL y GLOSSARY.
15. **(Ronda 26)** Dos preguntas mezclaban nombres de campos, fórmulas y varias decisiones; el dueño respondió "no entendí para nada" y "mucho enredo". Se reescribieron con una sola duda y un ejemplo con números. Además, BR-PHO-03 prohibía borrar fotos de factura sin que el dueño lo hubiera pedido; se corrigió.
