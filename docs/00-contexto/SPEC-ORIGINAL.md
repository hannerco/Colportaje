# Especificación original (texto del autor, sin editar)

> **Cómo usar este archivo.** Es el mensaje original del dueño del producto, copiado tal cual. Es la fuente primaria de la **intención**. Muchas partes fueron **precisadas, corregidas o reemplazadas** durante la entrevista de diseño (ver `00-contexto/DECISION-LOG.md`). Cuando este texto contradiga a `01-negocio/BUSINESS-RULES.md`, `02-datos/DOMAIN-MODEL.md` o `00-contexto/DECISION-LOG.md`, **gana lo posterior** (los otros documentos). Las marcas `Sujeto a cambios` son del autor.
>
> Tabla de reemplazos principales al final del archivo.

---

Aplicación web, mobile first para usarse principalmente como pwa. A lo largo del día se usa en móvil, pero es muy probable que se use en desktop al final del día, así que debes asegurarte quese vea bien en ambos.

# Tablas de la Base de datos

## Clientes

Esta es la base de datos principal para el usuario Colportor. Es aquí donde empieza un normal en el trabajo. 

Al añadir un nuevo cliente se le deben poder poner agregar los siguientes datos:

Propiedades del cliente:

- Teléfono
- Libros vendidos al cliente: Relación de la tabla Ejemplares
- Suma de Abonos realizados
- Deuda
- Saldo pendiente
- Fecha de la venta
- Abonos (relación con la tabla Abonos)

Información del cliente:

- Información: Cosas que le hagan recordar al colportor quién era el cliente, dónde lo conoció, cosas personales que le contó, para que en su próxima visita, el cliente sepa sienta realmente que el colportor le escuchó y se preocupa por él. 
Se debe permitir el ingreso de fotos.
- Dirección: Puede ser una dirección escrita como string, o una URL de google maps embebida. `Sujeto a cambios`
- Factura inicial: Foto específica de la factura que se le hizo al cliente
- Abonos: En este apartado se deben poder agregar 3 tipos de abonos (cuota inicial, abono programado, abono extra `Sujeto a cambios`) los cuales se explicarán en la tabla Abonos de clientes,

Deben haber diferentes vistas de Clientes: Ordenado por recientes, filtrar únicamente por deudores, debe tener un buscador dinámico, lo más dinámico que se pueda, no solo por nombre sino también como por la información que pusimos del cliente.

## Títulos (nombre de la tabla `Sujeto a cambios`)

Es en esta tabla donde se agregan los libros que se van a vender. Hay que diferenciar entre Ejemplares y Títulos:

Digamos que como colportor suelo vender dos libros: Un corazón tranquilo, El poder de mis palabras y Bebidas saludables. 

En Ejemplares, cada que venda un libro, este se agrega. Es decir, si vendí 30 Corazones tranquilos, hay 30 registros de corazones tranquilos. 

Sin embargo, en Títulos, la tabla tiene 1 registro por cada libro. Es decir, es el conjunto de libros que el colportor puede tener en su inventario.

Ambas tablas están íntimamente ligados entre sí, ya que un Ejempalar ES de una clase de una clase de Título.

`Sujeto a cambios` ¿Quién agrega estos libros a la Títulos? Esta pregunta todavía hay que resolverla. Cuando yo usaba el sistema, yo mismo era quien agregaba los libros, pero para un colportor corriente puede que esta no sea la mejor idea. Quizá lo mejor es que sea el Lider quien crea el libro, pero esto también puede generar problemas, por lo que lo mejor sería que sea el mismo Emprendum quien agregue cuáles son los tipos de libros disponibles de tener en el inventario.

¿Qué propiedades debe tener?

- Nombre
- Imagen
- Autor
- Pequeña descripción
- Precio público
- Precio colportor
- Religioso/Cultural

## Ejemplares

En esta tabla hay un registro de cada libro con el que el colportor hace contacto. 

Un ejemplar pasa por las siguientes fases:

1. Llega al inventario del colportor gracias a que el Lider le trasnfiere un ejemplar, o porque él mismo lo agrega.
    
    *`Sujeto a cambios` porque en mi sistema era yo mismo como colportor quien agregaba un libro a mi inventario, pero ya que vamos a crear una vista de líder, lo más lógico sería que el Lider sea quien transfiera el libro
    
    Mientras no haya vista de lider, será el mismo colportor quien agregue. 
    
2. El libro es agregado a un cliente, se toma como vendido, por lo que cambia de estado.

Propiedades:

- ¿Qué libro soy? Nombre obviamente `Sujeto a cambios`: Es el libro de Títulos al que hace parte.
- Estado: En inventario, Sin resolver, Vendido. El estado por defecto es “En inventario”
- Cliente: Relación con la tabla Cliente. Cuando a un cliente le agrego un Ejemplar, el estado cambia de En inventario a Vendido.
- Precio acordado: Por defecto es el precio público de Títulos, pero el colportor pudiendo vender el libro más caro o más barato, puede cambiar este precio y esa diferencia se guardará.
- Fecha rcibido: Fecha automática en la creación. Es la fecha en la que el colportor firma el recibido de este libro, es decir, el momento en el que el Líder pasa de tenerlo en su propiedad, a tenerlo el colportor.
- Fecha vendido: Fecha automática en la venta. Es la fecha en la que el libro es adquirido por un cliente.
- Precio distinto: Un boolean que se activa cuando el precioAcordado del Ejemplar es diferente al precioPúblico del libro en Títulos
- Diferencia: Se activa únicamente si Precio distinto es True. Este hace la diferencia entre el precio acordado y el precio público (precioAcordado-precioPublico). Puede ser tanto positiva (Aumento), el colprotor ganó dinero, si es negativa (descuento), el colportor perdió dinero. Esto servirá para un análisis después.

Esta tabla debe tener varias vistas:

- Todos los libros
- Libros en Inventario
- Libros Vendidos
- Libros con Descuentos y Aumentos

Se debe permitir ordenar y buscar.

## Abonos de clientes

El principal uso de esta tabla se hace en la tabla Clientes. pue cada abono está relacionado a un cliente.

- Estados:
    - Reclamado: Es el estado por defecto cuando en Cliente se agrega una Cuota inicial. Ya que el cliente nos dio el dinero y lo tenemos en la cartera.
    - Sin reclamar: Es el estado por defecto cuando se crea un abono programado. El cliente firmó y se comprometió con una fecha, pero aún no no ha pagado.
    - Entregado: Estado en el que el abono pasa de tenerlo el Colportor a tenerlo el Lider.
- Fecha acordada: Es la fecha en la que el cliente se comprometió en dar el abono. Si el abono fue una cuota inicial, la fecha acordada es igual a la fecha de pago.
- Fecha real: Es la fecha en la que el cliente realmente dio el abono. ¿Por qué? Puede pasar que el cliente pida más plazo, por lo que la fecha en la que realmente paga, no es la misma que la fecha acordada.

Debemos alinearnos en cómo gestionaremos el hecho de que el cliente pida más plazo. Se necesita guardar la fecha acordada inicial, pero si el cliente pide más plazo, debo cambiar la fecha acordada, ya que es esta fecha la que me aparecerá en el calendario para cobrarle; pero aún así debo tener guardado en qué fecha él se había comprometido inicialmente.

- Valor acordado: Es el valor que el cliente se había comprometido en dar.
- Valor real: Es el valor que el cliente realmente pagó en la "fecha real”
- Cliente: Relación uno a uno con Cliente
- Método de pago: Efectivo - Transferencia.
- Abibonos: Relación muchos a uno. Muchos abonos de clientes pueden estar relacionados a UN solo abibono.

## Abibonos

Son los abonos que entregamos al lider. Este abono debería estar relacionado con Abonos de clientes, ya que la plata que entregamos al lider es la plata de los abonos de los clientes. Por lo que cuando vamos a dar un Abibono, deberíamos poder escoger entre los abonos de clientes “Reclamados” y añadirlos a un Abibono. Este no va a cambiar a "Entregado” sino hasta cuando confirme que todo está. ¿Qué es todo?

- Título: Se debe poner uno automático, pero se puede cambiar. Imagina el caso en el que un colportor reciba una donación y la quiera dar de Abibono. En ese caso él no relacionó ningún abono de cliente, pero quiere diferenciar ese Abibono. Puede ser por esta o por otra razón, que debería poder cambiarse.
- Fecha: Usualmente se debe poner automática, porque yo creo el abono cuando se lo voy a dar al lider, así que debe ser automática. Pero si yo quiero, puedo cambiarle la fecha.
- Efectivo: Es la cantidad de plata que le estoy dando en efectivo
- Transferencia: Es la cantidad de plata que le estoy transfiriendo
- Total: Es la suma. Esta no se cambia, la suma es automática. El usuario solo puede cambiar efectivo y transferencia.
- En caso de que suba Abonos de clientes, las propiedades “Efectivo” y "Transferencia” deben calcularse automáticamente.
- Abonos de clientes: Relación
- Y revisar que esa es la plata que le esté entregando al cliente
- Recibo: Imagen del comprobante físico que nos da el lider al recibir un abono. Esto sí o sí debe ser obligatorio que aparezca

Tenemos que aclarar cómo solucionar el hecho de que a veces, la relación Abono cliente - Abibono, puede que no nos de el total. Puede que hayamos perdido dinero, o que haya aparecido dinero de otro lugar y esta suma nos de diferente. Debemos concluir cómo calcular estos casos.

Todos los nombres tanto de propiedades y de tablas vamos a discutirlos para escoger el que tenga más sentido y sea más fácil.

# Apartados de la app

Esto debemos concluirlo y crear el diseño mobile first que haga que sea fácil de usar. La primera versión que se usó en Notion recibió mucha crítica por tener muchos apartados y ser muy difícil de entender. La gente se perdía con lo de bonos y abibonos y terminaba usando solo la parte de los clientes. Debe ser muy intuitivo.

## Agregar a inventario

El colportor debe poder agregar de la forma más fácil, ya sea un botón por libro o una lista, o algo intuitivo, los Ejemplares, del tipo "Títulos” que desee. 

Esta función está disponible mientras no haya vista de lider. Cuando haya vista de lider, el lider le transferirá de sus propios libros en bodega, al colportor.

Mientras el lider está poniendo al colportor firmar, el líder le envía por el sistema los libros al colportor.

El colportor no firme hasta que

(1) Haya recibido los libros en físico. (2) Haya aceptado los libros en el sistema.

## Libros en físico

El colportor podrá ver qué Títulos tiene en físico y la cantidad de Ejemplares de estos. Básicamente los que tienen estado “En inventario”

## Calendario

Aquí debo mostrar los abonos que tengo pendientes por reclamar y la fecha específica.

Además debe permitir distinguir los abonos de las capacitaciones.

¿Qué son las capacitaciones?

A veces se gestionan capacitaciones con una empresa a una hora específica. El colportor debe tener una agenda de capacitaciones. con hora establecida en un día específico. Además debe poder programar un recordatorio, ya sea a inicio del día, un día antes, una semana o cómo desee.

Al abrir el calendario debe poder usmear los cobros que tiene en el día y ver si tiene capacitaciones.

Esto si entra directamente al calendario. Sin embargo podría ver un apartado llamado “Agenda del día” en el que haga un resumen de si tiene cobros programados para hoy y capacitaciones. Pequeño resumen que si ingresa, entra al calendario y puede escoger la vista de abonos por cobrar y capacitaciones.

# Extras

## Minibooks

Los minibooks son libros pequeños que se ofrecen cuando un cliente rechaza un libro grande. Este libro se paga directamente, no se deja a cuotas. También hacen parte de Ejemplares y Títulos; sin embargo no tienen un precio establecido porque el precio colportor es bajo y no hacen parte de los totalizadores cuando me pregunto cuántos libros he vendido (aprox 1.500 o incluso pueden ser gratis dependiendo del Título) y este puede venderlo al precio que el cliente quiera pagar.

Para la venta de estos, no es necesario crear un cliente, porque no va a tener factura, no va a tener abono programado, no va a tener nada de futuro. Simplemente es algo que se vendió. 

Dado que los minibooks son otra cuenta totalmente diferente. Se llevará una cuenta aparte

Posiblemente quiera recordar algún datos en algunas ocasiones y poner allí cuanto te dieron de minibooks

Debo poner los minibooks vendidos en el día y lo que me dieron, ya sea en general o individual. 

Es decir, puedo poner que en un día vendí

- 4 Minibooks → 30k
- 1 Minibook → 25k | Este me lo dio la chica de la panadería y me dijo que pasara en el futuro que tal y tal y tal.

Y en observación, el dato de una persona que le viste interés, pero te dijo para pasar despues

## Totalizadores

Cada uno en su propio apartado pero necesito saber

1. Cuántos libros he vendido
2. Cuánto dinero he abonado al lider
3. Cuánto dinero tengo en la calle sin cobrar. el saldo pendiente que tengo en la calle
4. De cuánto es mi compra: Es la suma del precio colportor de todos los libros que he vendido
5. Cuánto es lo que he vendido al público: Es la suma de todos los precios público de cada libro que he vendido.
6. Diferencia entre aumentos y descuentos
7.  Total de ejemplares en inventario (físicos)
8. Total clientes

Puedes crear los ADR, el contexto escribirlo, todo lo que necesites. Luego vamos a crear el diseño en claude design, ya que aún no tengo claro cómo deben verse los apartados, el flujo del cliente y todo, así que debo tener diferentes alternativas, para escoger la correcta. y una vez tengamos todo eso, se empieza a codear. 

La app debe tener una arquitectura escalable, debe tener pruebas, y no estar construida parche sobre parche. las decisiones de arquitectura deben ser lógicas.

---

## Tabla de reemplazos (lo que cambió respecto al texto original)

| Texto original | Quedó así | Dónde |
|---|---|---|
| Estado de Ejemplar "Sin resolver" | Se llama **"Con novedad"** (`flagged`), es un marcador de descuadre; resolución *Apareció / Perdido / Corregido* | BR-COPY-*, ADR-0008 |
| Estados de abono "Reclamado / Sin reclamar / Entregado" | **Por cobrar / Cobrado (en mi poder) / Entregado al líder** | GLOSSARY, ADR-0009 |
| "Fecha de la venta", "Deuda", "Saldo", "Suma de abonos" como propiedades del cliente | **Valores derivados**, nunca almacenados editables | ADR-0005 |
| "Cliente: Relación uno a uno" en Abonos | Relación **muchos a uno** (un cliente tiene muchos abonos); el abono sobrevive al borrado lógico del cliente | DOMAIN-MODEL |
| Minibooks "no hacen parte de Ejemplares y Títulos con precio" | Son Títulos con `category = minibook` y Ejemplares con **inventario físico**; se venden en entradas por lote sin cliente | ADR-0011 |
| "Religioso/Cultural" (dos valores) | Tres categorías: **cultural, religioso, minibook** | ADR-0007 |
| "Totalizadores: cada uno en su propio apartado" | Viven dentro de **"Hacer inventario"** | ADR-0015 |
| "Título y Efectivo/Transferencia" del Abibono | Efectivo y transferencia se autocalculan y son editables (lo realmente entregado); la diferencia con lo esperado se registra con nota | ADR-0010 |
| "Agenda del día" | En la UI se llama **"Hoy"** (también "Pendientes del día") | DESIGN-BRIEF |
| Calendario con abonos y capacitaciones | Tres tipos: **abono programado, visita, capacitación** | ADR-0012 |
| "¿Quién agrega los Títulos?" | **Admin** de Emprendum, con pantalla `/admin` | ADR-0007 |
