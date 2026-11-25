// Textos de la interfaz en español (00-REGLAS-COMUNES-FRONT §7): ningún componente lleva texto escrito dentro.
// `ui` son los textos fijos de los componentes de src/ui; las pantallas agregan los suyos por área.

export const copy = {
  /** Nombre de la app (título de la pestaña y del ícono instalado). */
  /** Frase de la marca (fija, 2026-11-23). */
  app: {
    name: 'Colportor',
    tagline: 'Tu colportaje, en orden.',
    /** Línea de apoyo al compartir (imagen Open Graph y descripción). */
    support: 'Clientes, libros y abonos en un solo lugar, también sin señal.',
    version: (version: string) => `Versión ${version}`,
    /** Atajos del ícono instalado (manifest). */
    shortcuts: { newCustomer: 'Nuevo cliente', collect: 'Cobrar' },
    /** Invitación a instalar (lienzo «Invitación a instalar»). */
    install: {
      title: 'Instalar Colportor',
      benefit: 'Instálala y llévala contigo puerta a puerta. Funciona sin conexión.',
      install: 'Instalar',
      later: 'Ahora no',
      understood: 'Entendido',
      iosShare: 'Toca Compartir en Safari.',
      iosAdd: 'Elige Agregar a pantalla de inicio.',
      iosConfirm: 'Toca Agregar.',
    },
    /** Ajustes › Acerca de e «Invitar a otro colportor». */
    about: {
      title: 'Acerca de',
      invite: 'Invitar a otro colportor',
      inviteText: 'Estoy usando Colportor para llevar mis clientes, libros y abonos. Te puede servir:',
      copied: 'Invitación copiada. Pégala en un chat.',
    },
    /** Página de error y «sin conexión» del arranque. */
    failure: {
      errorTitle: 'Algo salió mal',
      errorMessage: 'No pudimos abrir esta pantalla. Lo que ya guardaste está a salvo.',
      offlineTitle: 'Sin conexión',
      offlineMessage: 'La primera vez necesitas internet para abrir Colportor. Después funciona sin señal.',
      retry: 'Volver a intentar',
      goHome: 'Ir al inicio',
    },
  },
  /** Página pública de privacidad (la pide Google para publicar «Entrar con Google»). Texto base: el dueño lo revisa. */
  privacy: {
    title: 'Política de privacidad',
    updated: 'Última actualización: 23 de noviembre de 2026',
    intro:
      'Colportor es una aplicación de Emprendum para que los colportores lleven sus ventas de libros a cuotas, sus clientes y su inventario. Esta página explica qué datos usa y para qué.',
    sections: [
      {
        heading: 'Qué datos recibimos de Google',
        body: [
          'Si entras con Google, recibimos solo tu correo electrónico, tu nombre y tu foto de perfil. No pedimos ningún otro permiso ni accedemos a tu Gmail, tus contactos, tu Drive ni a ningún otro dato de tu cuenta.',
        ],
      },
      {
        heading: 'Para qué los usamos',
        body: [
          'Usamos tu correo para comprobar que el administrador te autorizó y para identificarte dentro de la app. Tu nombre y tu foto se muestran solo en tu propia cuenta.',
          'Solo pueden entrar las personas cuyo correo autorizó el administrador. Si tu correo no está autorizado, no se crea ninguna cuenta.',
        ],
      },
      {
        heading: 'Los datos que tú registras',
        body: [
          'Los clientes, ventas, abonos e inventario que registras en la app son tuyos y de tu trabajo. Cada persona solo ve sus propios datos, y los guardamos en un servicio de base de datos con acceso protegido.',
        ],
      },
      {
        heading: 'Lo que no hacemos',
        body: [
          'No vendemos tus datos, no los compartimos con terceros para publicidad y no los usamos para nada distinto de que la app funcione.',
        ],
      },
      {
        heading: 'Cómo borrar tus datos',
        body: [
          'Si quieres que borremos tu cuenta y tus datos, pídeselo al administrador o a tu líder en Emprendum.',
        ],
      },
    ],
    back: 'Volver a la app',
  },
  /** Iniciar sesión (HU-PAN-BASE-02, sin diseño del dueño: OQ-44). Los errores de entrada salen de `errors.codes`. */
  auth: {
    signIn: {
      /** Ronda 34 (#41): solo con Google y con el correo que autorizó el administrador. */
      googleSubtitle: 'Con la cuenta de Google que autorizó tu líder.',
      /** Pantalla de Entrar con el logo (Propuesta 9 del lienzo). */
      heading: 'Entrar',
      quote: '«…abrirían puertas hasta entonces cerradas»',
      quoteSource: 'Elena G. de White · El ministerio de publicaciones, p. 33',
      noSignUp:
        'No hay registro: entra el correo de Google que autorizó tu líder. Si no tienes acceso, pídeselo a él.',
      offline:
        'Sin conexión. La primera vez necesitas internet para entrar; después Colportor funciona sin señal.',
      google: 'Continuar con Google',
      googleOpening: 'Abriendo Google…',
      noAccess:
        'Ese correo no tiene acceso. Pídele al administrador que lo autorice, o entra con otra cuenta.',
      googleFailed: 'No se pudo entrar con Google. Intenta de nuevo.',
      subtitle: 'Entra con tu correo y tu contraseña',
      email: 'Correo',
      emailPlaceholder: 'tucorreo@ejemplo.com',
      password: 'Contraseña',
      submit: 'Entrar',
      submitting: 'Entrando…',
    },
  },
  /** Ajustes, versión mínima (pedido del dueño, 2026-11-20; sin diseño del lienzo). */
  settings: {
    appearance: 'Apariencia',
    theme: 'Tema',
    themes: { system: 'Como el dispositivo', light: 'Claro', dark: 'Oscuro' },
    themeHint: 'Solo en este dispositivo.',
    adminMode: 'Modo administrador',
    adminModeHint: 'Muestra Admin en la navegación.',
    account: 'Cuenta',
    name: 'Nombre',
    role: 'Rol',
    roles: { colportor: 'Colportor', admin: 'Colportor · Administrador' },
    timeFormat: 'Formato de hora',
    timeFormatLegend: 'Cómo ves las horas',
    formats: { '12h': '12 horas', '24h': '24 horas' },
    example: (time: string) => `Ej.: ${time}`,
    timeFormatSaved: 'Formato de hora guardado',
    session: 'Sesión',
    signOut: 'Cerrar sesión',
    signOutTitle: '¿Cerrar sesión?',
    signOutHint: 'Se borran de este celular los datos guardados para consultar sin conexión.',
    cancel: 'Cancelar',
  },
  /** Admin · Catálogo (HU-PAN-ADM-01, pedido del dueño, 2026-11-22; sin diseño del lienzo). */
  admin: {
    /** Partes de Admin (ronda 34). */
    sections: { label: 'Partes de Admin', catalog: 'Catálogo', users: 'Usuarios' },
    /** Admin · Usuarios (BR-USR-07, ronda 34, #43). */
    users: {
      title: 'Usuarios',
      authorize: 'Autorizar correo',
      authorizeHint:
        'Solo este correo podrá entrar, con «Continuar con Google». Después envíale el enlace de la app por WhatsApp.',
      authorizeConfirm: 'Autorizar',
      cancel: 'Cancelar',
      fullName: 'Nombre',
      email: 'Correo de Google',
      isAdmin: 'Es administrador',
      viewsLabel: 'Vistas de usuarios',
      views: { all: 'Todos', active: 'Activos', pending: 'Pendientes', inactive: 'Desactivados' },
      status: { active: 'Activo', pending: 'Pendiente', inactive: 'Desactivado' },
      statusLabel: (status: string) => `Estado: ${status}`,
      roles: { admin: 'Admin', colportor: 'Colportor' },
      actions: (name: string) => `Más acciones de ${name}`,
      remove: 'Quitar',
      deactivate: 'Desactivar',
      reactivate: 'Reactivar',
      empty: 'No hay usuarios en esta vista',
      authorized: (email: string) => `${email} autorizado`,
      copyLink: 'Copiar enlace',
      linkCopied: 'Enlace copiado',
      removed: 'Correo quitado',
      deactivated: 'Usuario desactivado',
      reactivated: 'Usuario reactivado',
      alreadyAuthorized: 'Ese correo ya está autorizado',
      cannotDeactivateSelf: 'No puedes desactivarte a ti mismo',
    },
    catalog: {
      title: 'Catálogo',
      search: 'Buscar título',
      newTitle: 'Nuevo título',
      results: (count: number) => (count === 1 ? '1 título' : `${count} títulos`),
      categories: { cultural: 'Cultural', religious: 'Religioso', minibook: 'Minibooks' },
      section: (name: string, count: number) => `${name} · ${count}`,
      noAuthor: 'Sin autor',
      prices: (publicPrice: string | null, colportorPrice: string) =>
        publicPrice ? `Público ${publicPrice} · Colportor ${colportorPrice}` : `Colportor ${colportorPrice}`,
      inactive: 'Desactivado',
      empty: { title: 'Todavía no hay títulos', text: 'Agrega el primero con «Nuevo título».' },
      noResults: { title: (query: string) => `Ningún título coincide con «${query}»` },
      error: { title: 'No se pudo cargar el catálogo', text: 'Inténtalo otra vez.' },
      notAdmin: {
        title: 'Solo para administradores',
        text: 'Pídele a un administrador que haga este cambio.',
      },
    },
    editor: {
      newTitle: 'Nuevo título',
      cover: 'Portada',
      coverAlt: (name: string) => `Portada de ${name}`,
      changeCover: 'Cambiar portada',
      addCover: 'Poner portada',
      removeCover: 'Quitar portada',
      coverAfterSave: 'Guarda el título para ponerle portada.',
      coverSaved: 'Portada guardada',
      coverRemoved: 'Portada quitada',
      name: 'Nombre',
      author: 'Autor',
      authorPlaceholder: 'Opcional',
      description: 'Descripción corta',
      descriptionPlaceholder: 'Opcional',
      category: 'Categoría',
      publicPrice: 'Precio al público',
      publicPriceHelp: 'En un minibook puede ir vacío.',
      colportorPrice: 'Precio colportor',
      active: 'Activo',
      activeHelp: 'Aparece al agregar libros al inventario. Un título no se borra: se desactiva.',
      pricesHint: 'Cambiar los precios no cambia los ejemplares que ya recibiste.',
      save: 'Guardar',
      cancel: 'Cancelar',
      created: (name: string) => `«${name}» agregado al catálogo`,
      saved: (name: string) => `«${name}» guardado`,
      errors: {
        name: 'Escribe el nombre.',
        colportorPrice: 'Escribe el precio colportor (puede ser $0).',
        publicPrice: 'Escribe el precio al público (solo un minibook puede ir sin él).',
      },
    },
  },
  ui: {
    /** Texto por defecto del botón mientras se guarda (HU-UI-04). */
    saving: 'Guardando…',
    /** Nombre accesible de la ✕ de un chip de filtro (HU-UI-06). */
    removeFilter: (filter: string) => `Quitar filtro ${filter}`,
    /** Nombre accesible de la cuota de un abono, «2/4» (HU-UI-07). */
    installment: (index: number, total: number) => `Cuota ${index} de ${total}`,
    /** Nombre accesible del avatar cuando no se da otro (HU-UI-08). */
    avatar: { person: 'Cliente', cover: 'Portada', brand: 'Colportor' },
    /** Módulo que aún no está terminado (la navegación los muestra todos, decisión del dueño 2026-11-20). */
    comingSoon: {
      title: 'Próximamente',
      text: (module: string) => `${module} todavía no está listo. Lo verás aquí cuando esté terminado.`,
    },
    /** Campo de contraseña (Iniciar sesión, HU-PAN-BASE-02): ver u ocultar lo escrito. */
    field: {
      showPassword: 'Mostrar',
      hidePassword: 'Ocultar',
      /** #62: el ícono del campo de fecha abre el calendario. */
      openCalendar: 'Abrir calendario',
      pickDate: 'Elegir fecha',
    },
    /** Fotos (revisión 2026-11-24: una sola pieza para imágenes, facturas y recibos). */
    photos: {
      photo: (n: number) => `Foto ${n}`,
      add: 'Agregar foto',
      adding: 'Subiendo foto…',
      /** Tocar una foto la abre en grande (#99). */
      open: (n: number) => `Ver foto ${n}`,
      viewerTitle: (n: number, total: number) => `Foto ${n} de ${total}`,
      replace: 'Cambiar foto',
      remove: 'Quitar foto',
      uploadFailed: 'No se pudo subir la foto',
      retry: 'Reintentar',
    },
    /** Calendario para elegir fecha (HU-PAN-CLI-05; en la biblioteca desde #62). */
    calendar: {
      weekdays: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
      months: [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre',
      ],
      month: (name: string, year: number) => `${name} de ${year}`,
      /** Nombre de cada día para el lector; contiene el número visible («5 de diciembre de 2026»). */
      day: (day: number, month: string, year: number) => `${day} de ${month} de ${year}`,
      previous: 'Mes anterior',
      next: 'Mes siguiente',
      /** Junto al día: otro abono del cliente cae ese día. */
      otherPayment: 'otro abono',
      /** Junto al día: la fecha que tenía (anillo punteado, ronda 38). */
      previousDay: 'fecha que tenía',
      legendPrevious: 'Fecha que tenía',
      legendOthers: 'Otros abonos',
      /** Ventana para elegir fecha (revisión 2026-11-24: el único calendario de la app). */
      past: 'Esta fecha ya pasó',
      confirm: 'Elegir fecha',
      cancel: 'Cancelar',
    },

    /** Buscador (HU-UI-12). */
    search: {
      label: 'Buscar',
      clear: 'Borrar búsqueda',
      filters: (active: number) =>
        active === 0 ? 'Filtros' : `Filtros, ${active} ${active === 1 ? 'activo' : 'activos'}`,
      shortcut: '⌘K',
    },
    /** Fila de dato (HU-UI-13): lo que oye el lector antes del valor editable y del valor anterior. */
    dataRow: {
      edit: (label: string) => `Editar ${label}, `,
      previous: 'antes ',
    },
    /** Fila de lista (HU-UI-14): títulos de columna en escritorio y textos fijos de la fila móvil. */
    listRow: {
      columns: {
        customer: ['Cliente', 'Teléfono', 'Libro(s)', 'Saldo pendiente', 'Último abono', 'Estado'],
        payment: ['Cliente', 'Cuota', 'Fecha acordada', 'Monto', 'Estado'],
        copy: ['Ejemplar', 'Recibido el', 'Precio', 'Cliente', 'Estado', 'Diferencia'],
      },
      /** Sobre el saldo pendiente en la fila móvil de clientes (BR-CUS-13). */
      owes: 'Debe',
      /** En lugar del libro, para un cliente sin ventas (BR-CUS-13). */
      prospect: 'Prospecto',
      /** Celda sin dato (cliente sin abonos, prospecto sin estado, ejemplar sin cliente). */
      empty: '—',
      /** Título de la columna de fecha del ejemplar cuando la lista se ordena por venta (HU-PAN-INV-02). */
      soldOn: 'Vendido el',
      /** Segunda línea del ejemplar en móvil. */
      received: (date: string) => `Recibido ${date}`,
      sold: (date: string) => `Vendido ${date}`,
      /** Diferencia con el precio público (HU-PAN-INV-02): «+$7.000» / «−$5.000». */
      delta: (sign: '+' | '−', amount: string) => `${sign}${amount}`,
      more: (n: number) => `+${n}`,
    },
    /** Franja (HU-UI-16): texto por defecto de sin conexión (BR-GEN-08, I-35). */
    banner: {
      offline: 'Sin conexión: puedes consultar, pero no registrar',
    },
    /** Tarjeta de métrica (HU-UI-17): «52 %», con espacio (que no se parte) antes del signo. */
    metric: {
      percent: (n: number) => `${n}\u00a0%`,
    },
    /** Encabezado (HU-UI-21): nombre del botón volver, que dice a dónde. */
    header: {
      back: (to: string) => `Volver a ${to}`,
    },
    /** Barra de vista (HU-UI-28). */
    viewBar: {
      region: 'Vista de la lista',
      sheetTitle: 'Filtrar y ordenar',
      filterTab: 'Filtrar',
      sortTab: 'Ordenar',
      clear: 'Limpiar',
      clearFilters: 'Quitar filtros',
      summary: (n: number) => `Filtros (${n})`,
      sortBy: 'Ordenar por',
      direction: 'Sentido',
      asc: 'Ascendente',
      desc: 'Descendente',
      done: 'Listo',
    },
    /** Ventana de detalle (HU-UI-27). */
    island: { complete: 'Sección completa', incomplete: 'Falta completar' },
    detailWindow: {
      close: 'Cerrar',
      modeGroup: 'Forma de la ventana',
      modes: { side: 'Lateral', center: 'Centrada', page: 'Página' },
      prev: 'Anterior',
      next: 'Siguiente',
      breadcrumb: 'Ruta',
    },
    /** Visor de fotos (#99). */
    photoViewer: {
      close: 'Cerrar',
      loading: 'Cargando la foto…',
      failed: 'No se pudo abrir la foto.',
      retry: 'Reintentar',
    },
    /** Estado vacío y de carga (HU-UI-26). */
    empty: {
      loading: 'Cargando…',
      /** Junto a una acción que escribe, deshabilitada sin conexión (BR-GEN-08). */
      needsConnection: 'Necesita conexión',
    },
    /** Navegación (HU-UI-23): nombres de los módulos (glosario) y de los grupos. */
    nav: {
      label: 'Principal',
      items: {
        today: 'Hoy',
        customers: 'Clientes',
        inventory: 'Inventario',
        minibooks: 'Minibooks',
        calendar: 'Calendario',
        money: 'Dinero',
        stocktake: 'Hacer inventario',
        settings: 'Ajustes',
        admin: 'Admin',
      },
      groups: { work: 'Trabajo', money: 'Dinero', account: 'Cuenta' },
      search: 'Buscar',
      newCustomer: 'Nuevo cliente',
      more: 'Más',
    },
    /** Menú (HU-UI-20): título de la hoja móvil cuando no se da otro. */
    menu: {
      title: 'Opciones',
    },
    /** Historial (HU-UI-19). */
    history: {
      showAll: 'Ver todo',
      /** Lo que oye el lector después de «Deshacer»: qué deshace. */
      undoTarget: (text: string) => `: ${text}`,
    },
    /** Medidor (HU-UI-18): etiqueta del centro y descripción para el lector. */
    gauge: {
      caption: 'entregado',
      description: (delivered: number, collected: number, pending: number) =>
        `${delivered}\u00a0% entregado; ${collected}\u00a0% cobrado sin entregar; ${pending}\u00a0% por cobrar`,
    },
  },
  /** Palabra de cada estado en la Pastilla de estado (HU-UI-05, glosario «Estados»). */
  status: {
    scheduled: 'Por cobrar',
    overdue: 'Vencido',
    collected: 'Cobrado',
    delivered: 'Entregado',
    canceled: 'Cancelado',
    draft: 'Borrador',
    current: 'Pagando',
    settled: 'Saldado',
    in_stock: 'En físico',
    sold: 'Vendido',
    flagged: 'Con novedad',
    /** HU-PAN-INV-02: los estados de un ejemplar que ya no está en la maleta (lienzo «2 · Ejemplares»). */
    lost: 'Perdido',
    returned_to_leader: 'Devuelto al líder',
  },
  /** Módulo Clientes. */
  customers: {
    /** #69: editar los datos de un cliente guardado. */
    edit: {
      action: 'Editar',
      title: 'Editar datos',
      message: 'La ubicación, el emoji y las fotos se cambian en la ficha.',
      name: 'Nombre',
      phone: 'Teléfono',
      address: 'Dirección',
      info: 'Información',
      nameRequired: 'Escribe el nombre del cliente.',
      save: 'Guardar',
      cancel: 'Cancelar',
      saved: 'Datos guardados',
    },
    emoji: {
      title: 'Emoji del cliente',
      choose: 'Elegir emoji del cliente',
      change: 'Cambiar emoji del cliente',
      search: 'Buscar emoji',
      remove: 'Quitar',
      noResults: 'No hay emojis con ese nombre.',
      /** #63: las pestañas de categorías y el conteo. */
      categoriesLabel: 'Categorías de emojis',
      categories: {
        recent: 'Recientes',
        smileys: 'Caras',
        people: 'Personas',
        animals: 'Animales y naturaleza',
        food: 'Comida y bebida',
        travel: 'Viajes y lugares',
        activities: 'Actividades',
        objects: 'Objetos',
        symbols: 'Símbolos',
        flags: 'Banderas',
      },
      count: (n: number) => (n === 1 ? '1 emoji' : `${n.toLocaleString('es-CO')} emojis`),
    },
    /** Lista de clientes (HU-PAN-CLI-01, BR-CUS-05). */
    list: {
      title: 'Clientes',
      newCustomer: 'Nuevo cliente',
      tabsLabel: 'Vistas de clientes',
      tabs: { all: 'Todos', debtors: 'Deudores', settled: 'Saldados', archived: 'Archivados' },
      search: 'Buscar cliente',
      results: (n: number) => (n === 1 ? '1 cliente' : `${n} clientes`),
      filter: 'Estado',
      /** Casilla del filtro de estado con su conteo. */
      statusOption: (status: string, n: number) => `${status} (${n})`,
      includeProspects: 'Incluir prospectos',
      /** Chip del interruptor «Incluir prospectos» encendido. */
      prospectsChip: 'Con prospectos',
      sort: {
        recent: 'Más recientes',
        modified: 'Última modificación',
        name: 'Nombre',
        balance: 'Saldo pendiente',
        next_due: 'Próximo abono',
      },
      /** BR-CUS-09 / FC-14: junto al nombre de un cliente archivado. */
      archived: (name: string) => `${name} (cliente archivado)`,
      empty: {
        title: 'Todavía no tienes clientes',
        text: 'Cuando crees un cliente, aparece aquí con lo que te debe.',
      },
      /** Una pestaña sin clientes (p. ej. Archivados), sin búsqueda ni filtros. */
      emptyTab: { title: 'No hay clientes en esta vista' },
      /** Con filtros y sin búsqueda, nadie cumple. */
      filtered: { title: 'Ningún cliente cumple estos filtros', text: 'Quita algún filtro para ver más.' },
      /** HU-CLI-05: búsqueda sin coincidencias. */
      noResults: {
        title: (query: string) => `Nadie coincide con «${query}»`,
        text: 'Busqué por nombre, teléfono, información, dirección y libros.',
        searchArchived: 'Buscar en Archivados',
        create: (name: string) => `Crear «${name}»`,
      },
      offline: { title: 'Sin conexión', text: 'Puedes consultar lo guardado, pero no registrar.' },
      error: { title: 'No se pudo cargar', text: 'Inténtalo otra vez.' },
    },
    /** Ficha de cliente (HU-PAN-CLI-02, diseño «2 · Ficha de cliente»). */
    detail: {
      call: 'Llamar',
      whatsapp: 'WhatsApp',
      moreActions: 'Más acciones',
      account: {
        balance: 'Saldo pendiente',
        paid: 'Abonado',
        debt: 'Deuda total',
        paidPct: (pct: number) => `Abonado el ${pct}\u00a0% de la deuda`,
        credit: 'Saldo a favor',
        unscheduled: 'Sin programar',
        overdueSince: (date: string) => `Abono vencido desde el ${date}`,
      },
      archivedNoEdit: 'Restaura el cliente para cambiarlo',
      books: { title: 'Libros' },
      payments: {
        title: 'Abonos',
        empty: 'Sin abonos',
        overdueAgo: (days: number) => (days === 1 ? 'hace 1 día' : `hace ${days} días`),
        /** Fecha acordada antes de una prórroga (BR-PAY-14), tachada. */
        before: (date: string) => `antes ${date}`,
        kind: { down_payment: 'Cuota inicial', extra: 'Abono extra', scheduled: '' },
        method: { cash: 'Efectivo', transfer: 'Transferencia' },
        canceled: (n: number) => `Cancelados ${n}`,
        /** #35 (diseño de la ficha y propuesta 7 del lienzo). */
        schedule: 'Programar abono',
        collect: 'Cobrar',
        scheduleForm: {
          title: 'Programar abono',
          unscheduled: 'Sin programar',
          kind: 'Qué programar',
          plan: 'Plan',
          single: 'Un abono',
          date: 'Fecha',
          value: 'Valor',
          submit: 'Programar',
          cancel: 'Cancelar',
          nothing: 'Todo el saldo ya está programado. Un abono suelto se suma a lo programado.',
          done: 'Abonos programados',
          doneSingle: 'Abono programado',
          invalidAmount: 'Escribe un valor',
          missingDate: 'Elige la fecha',
        },
        collected: 'Abono cobrado',
      },
      data: {
        title: 'Datos',
        phone: 'Teléfono',
        address: 'Dirección',
        openMaps: 'Abrir en Maps',
        info: 'Información',
        images: 'Imágenes',
        image: (n: number) => `Foto ${n}`,
        invoice: 'Factura',
        invoicePhoto: (date: string, n: number) => `Factura ${date}, foto ${n}`,
        since: 'Cliente desde',
      },
      notices: {
        noBook: 'Aún no tiene libro',
        /** BR-PAY-13 (FLOWS): con el monto del sobrante. */
        excess: (amount: string) => `Lo programado supera el saldo en ${amount}`,
        archived: 'Cliente archivado',
      },
      archive: {
        action: 'Archivar',
        restore: 'Restaurar',
        title: '¿Archivar el cliente?',
        cancelLabel: 'Cancelar',
        /** BR-CUS-09 / BR-PAY-13: qué abonos programados se cancelarán. */
        message: (n: number) =>
          n === 0
            ? 'Deja de verse en las listas; lo encuentras en Archivados y puedes restaurarlo.'
            : `Se cancelarán ${n === 1 ? '1 abono programado' : `${n} abonos programados`}. Deja de verse en las listas; lo encuentras en Archivados.`,
        /** HU-CLI-11 R1: con libros vendidos no se archiva. */
        hasBooksTitle: 'Primero devuelve sus libros',
        hasBooks: (n: number) =>
          `Tiene ${n === 1 ? '1 libro vendido' : `${n} libros vendidos`}. Devuélvelos para poder archivarlo.`,
        understood: 'Entendido',
        done: 'Cliente archivado',
        restored: 'Cliente restaurado',
      },
    },
    /** Agregar libro (HU-PAN-CLI-04, diseño «5 · Agregar libro»). */
    addBook: {
      open: 'Agregar libro del inventario',
      title: 'Ejemplares en físico',
      search: 'Buscar libro o número',
      selected: (n: number) => (n === 1 ? 'Elegido para este cliente' : `Elegidos para este cliente · ${n}`),
      total: 'Total',
      available: 'Para seleccionar',
      select: (title: string, number: number) => `Seleccionar ${title} #${number}`,
      remove: (title: string, number: number) => `Quitar ${title} #${number}`,
      price: 'Precio acordado',
      /** El precio público, tachado, cuando el acordado es otro (BR-PRC). */
      publicPrice: (price: string) => `antes ${price}`,
      reference: (price: string) => `Precio público ${price}`,
      soldOn: 'Vendido el',
      empty: {
        title: 'No tienes ejemplares en físico',
        text: 'Agrega libros al inventario para poder venderlos.',
        action: 'Agregar al inventario',
      },
      noResults: (query: string) => `Ningún ejemplar coincide con «${query}»`,
      /** CA-3 (I-15): un archivado no recibe libros. */
      archived: 'Restaura el cliente para agregarle libros.',
    },
    /** Nuevo cliente, ficha viva (HU-PAN-CLI-03, diseño «3 · Crear cliente» y «4 · vacía»). */
    create: {
      title: 'Nuevo cliente',
      name: 'Nombre del cliente',
      nameRequired: 'Escribe el nombre',
      save: 'Guardar cliente',
      discard: 'Descartar',
      keepEditing: 'Seguir editando',
      saved: 'Cliente guardado',
      /** #57: el cliente quedó guardado; alguna foto no subió. */
      photosFailed: (n: number) => (n === 1 ? 'No se subió 1 foto' : `No se subieron ${n} fotos`),
      info: {
        title: 'Información del cliente',
        phone: 'Teléfono',
        phonePlaceholder: '300 000 0000',
        address: 'Dirección',
        addressPlaceholder: 'Calle, número y barrio',
        info: 'Información',
        infoPlaceholder: 'Horarios, referencias, cómo prefiere pagar…',
        images: 'Imágenes',
      },
      books: { title: 'Libros vendidos', total: 'Total de libros' },
      /** Isla «Factura» (lienzo CrearV5, #32). */
      invoice: {
        title: 'Factura',
        photo: 'Foto de la factura',
        number: 'N.º de factura',
        date: 'Fecha',
        /** #99: mientras se sube la primera foto de una factura nueva. */
        uploading: 'Subiendo la foto de la factura…',
        another: 'Agregar otra factura',
        label: (n: number) => `Factura ${n}`,
      },
      payments: {
        title: 'Abonos',
        downPayment: 'Cuota inicial',
        value: 'Valor',
        method: 'Medio de pago',
        date: 'Fecha',
        dateInFuture: 'La fecha no puede ser futura',
        plan: (balance: string | null) =>
          balance ? `Plan para el saldo de ${balance}` : 'Plan para el saldo',
        frequency: 'Frecuencia',
        frequencies: { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' },
        amount: 'Valor de cada abono',
        amountInvalid: 'Usa un valor en miles (múltiplo de $1.000)',
        firstDue: 'Primer abono',
        preview: 'Así quedan los abonos',
        previewEmpty: 'Las fechas aparecen cuando pones el valor de cada abono y el primero.',
        covers: (n: number, balance: string) =>
          `${n === 1 ? '1 abono cubre' : `${n} abonos cubren`} el saldo de ${balance}`,
        /** HU-ABO-08 / I-33: se permite, solo se avisa. */
        past: 'Esta fecha ya pasó',
        installment: (n: number) => `Abono ${n}`,
      },
      summary: {
        title: 'Resumen',
        books: (n: number) => `Libros (${n})`,
        downPayment: 'Cuota inicial',
        balance: 'Saldo pendiente',
        payments: 'Abonos',
        /** Ronda 38: cuántos abonos y cuánto suman (cada uno puede tener su valor). */
        paymentsValue: (n: number, total: string) => `${n} · ${total}`,
      },
      discardDialog: {
        /** Ronda 35 (#57): el cliente no existe hasta guardarlo; salir solo pierde lo escrito. */
        title: '¿Salir sin guardar?',
        message:
          'Se pierde lo que escribiste: información, libros, factura y abonos. Los libros siguen en físico.',
        leave: 'Salir',
        /** CA-2: «Se quitarán 2 libros y 1 abono» (FC-01). */
        willRemove: (books: number, payments: number) => {
          const parts = [
            books > 0 ? (books === 1 ? '1 libro' : `${books} libros`) : null,
            payments > 0 ? (payments === 1 ? '1 abono' : `${payments} abonos`) : null,
          ].filter(Boolean);
          return `Se quitarán ${parts.join(' y ')}. Los libros vuelven a En físico. No se puede deshacer.`;
        },
        blocked: 'No se puede descartar: un abono de este cliente ya está en un Abibono.',
        understood: 'Entendido',
      },
    },
    /** Ubicación del cliente (HU-PAN-CLI-06, diseño «7 · Información y dirección» y «8 · Elegir ubicación»). */
    location: {
      choose: 'Elegir en mapa',
      openMaps: 'Abrir en Maps',
      change: 'Cambiar',
      remove: 'Quitar',
      /** La vista previa de la ficha carga el mapa solo al tocarla (ADR-0036). */
      showMap: 'Ver mapa',
      map: 'Mapa de la ubicación del cliente',
      mapOffline: 'Mapa sin conexión',
      picker: {
        title: 'Elegir ubicación',
        map: 'Mapa para mover el pin',
        pin: 'Pin en el centro del mapa',
        recenter: 'Centrar en tu ubicación actual',
        heading: 'Ubicación del pin',
        searching: 'Buscando tu ubicación…',
        approximate: 'Ubicación aproximada',
        repeat: 'Repetir',
        denied: 'Sin permiso de ubicación. Ubica el pin a mano.',
        noSignal: 'No hay señal de GPS. Ubica el pin a mano.',
        retry: 'Reintentar',
        offline: 'Sin conexión. Guardar necesita conexión.',
        confirm: 'Confirmar',
        /** «±12 m · 6,2518, −75,5915». */
        accuracy: (meters: number, coordinates: string) => `±${meters}\u00a0m · ${coordinates}`,
      },
      removed: 'Ubicación quitada',
    },
    /** Imágenes de información (HU-CLI-07). */
    photos: {
      add: 'Agregar imagen',
      adding: 'Subiendo imagen…',
      /** #99: tocar una foto la abre en grande. */
      open: (n: number) => `Ver foto ${n}`,
      viewerTitle: (n: number, total: number) => `Foto ${n} de ${total}`,
      /** #68: el menú de una foto de factura. */
      photoMenu: (n: number) => `Foto ${n}, cambiar o quitar`,
      replace: 'Cambiar foto',
      remove: 'Quitar foto',
      replaced: 'Foto cambiada',
      removed: 'Foto quitada',
    },
  },
  /** Abonos (HU-PAN-CLI-05). */
  payments: {
    /** Cambiar la fecha de venta de un libro (#56, HU-CLI-13). */
    soldDate: {
      title: 'Fecha de venta',
      message: (book: string, date: string) => `${book} · hoy dice ${date}`,
      label: (date: string) => `Vendido el ${date}`,
      change: (date: string) => `Vendido el ${date}, cambiar`,
      save: 'Guardar fecha',
      cancel: 'Cancelar',
      saved: 'Fecha de venta guardada',
    },
    /** Calendario para elegir fecha (diseño «6 · Cambiar fecha de abono»); la semana empieza el domingo (BR-GEN-07). */
    /**
     * Abonos a mano (ronda 38, lienzo «Propuestas · Abonos a mano, sin plan automático», ADR-0052): la lista, el
     * totalizador y las ventanas de fecha, valor y eliminar. Lo mismo al crear el cliente y en la ficha.
     */
    manual: {
      heading: 'Abonos programados',
      byDate: 'Por fecha',
      label: (n: number, total: number) => `Abono ${n} de ${total}`,
      add: 'Agregar abono',
      pickDate: 'Elegir fecha',
      changeDate: (label: string) => `Cambiar la fecha del ${label.toLowerCase()}`,
      changeAmount: (label: string) => `Cambiar el valor del ${label.toLowerCase()}`,
      remove: (label: string) => `Eliminar el ${label.toLowerCase()}`,
      collect: 'Cobrar',
      collectAmount: (amount: string) => `Cobrar ${amount}`,
      emptyCreate:
        'Todavía no hay abonos programados. Agrega los que acordaste con el cliente, con la fecha y el valor que quieras.',
      emptySaved: 'No hay abonos por cobrar. Agrega los que acuerdes con el cliente.',
      rowNotes: {
        past: 'Esta fecha ya pasó',
        overdue: (days: number) => (days === 1 ? 'Vencido hace 1 día' : `Vencido hace ${days} días`),
        farAhead: 'Es más de 2 meses desde hoy',
        zero: 'Pon el valor. Si queda en $0, este abono no se guarda.',
        noDate: 'Elige la fecha. Sin fecha, este abono no se guarda.',
        rescheduled: (date: string) => `Aplazado · antes ${date}`,
      },
      totals: {
        label: 'Totalizador de abonos',
        pending: 'Saldo pendiente',
        scheduled: 'Programado',
        missing: 'Falta programar',
        over: 'Programaste de más',
        exact: 'Todo programado',
        review: 'Revisar',
        reviewLong: 'Revisar abonos',
      },
      removeDialog: {
        title: (label: string) => `¿Eliminar el ${label.toLowerCase()}?`,
        whatCreate: (amount: string, date: string | null) =>
          `${date ? `Era de ${amount} para el ${date}.` : `Era de ${amount}, sin fecha.`} Lo programado baja y el totalizador te dirá cuánto falta.`,
        whatSaved: (amount: string, date: string | null) =>
          `${date ? `Era de ${amount} para el ${date}.` : `Era de ${amount}, sin fecha.`} El saldo del cliente no cambia: queda más por programar.`,
        confirm: 'Eliminar',
        cancel: 'Cancelar',
      },
      dateDialog: {
        title: (label: string) => `Fecha del ${label.toLowerCase()}`,
        why: '¿Por qué cambia?',
        correct: 'Me equivoqué',
        correctHint: 'Solo corrige la fecha',
        reschedule: 'El cliente pidió aplazar',
        rescheduleHint: 'Queda en el historial',
        note: 'Nota para el historial (opcional)',
        notePlaceholder: 'Ej.: le pagan el 10',
        done: 'Listo',
        saveCorrect: 'Corregir fecha',
        saveReschedule: 'Aplazar',
        notes: {
          past: 'Esta fecha ya pasó',
          earlier: (date: string) => `Es antes de la fecha que tenía (${date})`,
          laterReschedule: (days: number) => `Lo estás aplazando ${days === 1 ? '1 día' : `${days} días`}`,
          laterCorrect: (from: string, to: string, days: number) =>
            `Pasa del ${from} al ${to} (${days === 1 ? '1 día' : `${days} días`} después)`,
          paymentAfter: (date: string) => `Ojo: hay un abono programado después, el ${date}`,
          paymentBefore: (date: string) => `Ojo: hay un abono programado antes, el ${date}`,
          farAhead: 'Es más de 2 meses desde hoy',
        },
      },
      amountDialog: {
        title: (label: string) => `Valor del ${label.toLowerCase()}`,
        label: 'Valor del abono',
        save: 'Guardar valor',
        cancel: 'Cancelar',
        invalid: 'Escribe un valor mayor que cero.',
      },
      /** «Revisar» del totalizador: recortar lo que sobra desde el abono más lejano (opcional). */
      review: {
        title: '¿Recortar lo que sobra?',
        message: (amount: string) =>
          `Lo programado pasa del saldo en ${amount}. Se quita desde el abono más lejano; los que queden en $0 pasan a Cancelados.`,
        confirm: 'Recortar',
        cancel: 'Dejar así',
        done: 'Abonos recortados',
      },
      done: {
        added: 'Abono agregado',
        corrected: 'Fecha corregida',
        rescheduled: 'Abono aplazado',
        amount: 'Valor guardado',
        removed: 'Abono eliminado',
      },
    },
    /** #90: cambiar el valor de un abono del plan mientras se crea el cliente. */
    changeAmount: {
      open: (amount: string) => `Cambiar valor, ${amount}`,
      title: (index: number, total: number) => `Valor del abono ${index} de ${total}`,
      label: 'Valor del abono',
      message: 'Los demás abonos se ajustan para que el plan siga cubriendo el saldo.',
      save: 'Guardar valor',
      cancel: 'Cancelar',
      changed: 'Valor cambiado',
      invalid: 'Escribe un valor mayor que cero.',
      exceed: 'Con ese valor los abonos pasan del saldo.',
    },
    changeDate: {
      /** El botón de la fecha en la lista de abonos. */
      open: (date: string) => `Cambiar fecha, ${date}`,
      title: (index: number, total: number) => `Abono ${index} de ${total}`,
      save: 'Guardar fecha',
      cancel: 'Cancelar',
      changed: 'fecha cambiada',
      past: 'Esta fecha ya pasó',
      /** BR-PAY-06: una prórroga a más de 2 meses desde hoy se confirma. */
      confirmTitle: '¿Dar tanto plazo?',
      confirmMessage: (date: string) => `El ${date} es más de 2 meses desde hoy.`,
      confirm: 'Sí, dar el plazo',
      /** «Dar más plazo» (HU-PAN-DIN-02): la misma ventana con una nota opcional. */
      extendTitle: 'Dar más plazo',
      note: 'Nota',
      notePlaceholder: 'Opcional',
    },
    /** Detalle de un abono (HU-PAN-DIN-02, diseño «6 · Detalle de un abono» y «8 · Abono: estados y acciones»). */
    detail: {
      title: (customerName: string) => `Abono de ${customerName}`,
      back: 'Dinero',
      installment: (index: number, total: number) => `Abono ${index} de ${total}`,
      fraction: 'Cuota',
      collect: 'Cobrar',
      /** Ronda 38: «Dar más plazo» pasa a llamarse «Aplazar». */
      extend: 'Aplazar',
      extendShort: 'Aplazar',
      moreActions: 'Más acciones',
      /** La franja: situación del abono. */
      banner: {
        overdue: (days: number) => (days === 1 ? 'Vencido hace 1 día' : `Vencido hace ${days} días`),
        remaining: (days: number) => (days === 1 ? 'Falta 1 día' : `Faltan ${days} días`),
        dueToday: 'Vence hoy',
        late: (date: string, days: number) =>
          `${date} · ${days === 1 ? '1 día tarde' : `${days} días tarde`}`,
        onTime: (date: string) => `${date} · a tiempo`,
        canceled: 'Cancelado',
      },
      data: {
        agreedDate: 'Fecha acordada',
        originalDate: 'Fecha original',
        agreedAmount: 'Valor acordado',
        paidAmount: 'Valor cobrado',
        paidAt: 'Fecha real',
        method: 'Método',
        deposit: 'Abibono',
        depositDraft: 'Abibono en borrador',
        depositConfirmed: 'Abibono entregado',
        kind: { down_payment: 'Cuota inicial', extra: 'Abono extra', scheduled: 'Abono programado' },
        methods: { cash: 'Efectivo', transfer: 'Transferencia' },
      },
      customerPayments: (name: string) => `Abonos de ${name}`,
      overdueAgo: (days: number) => (days === 1 ? 'hace 1 día' : `hace ${days} días`),
      history: 'Historial',
      /** #72: cada entrada del Historial del abono. */
      historyEntry: {
        scheduled: (amount: string, date: string) => `Programado: ${amount} para el ${date}`,
        rescheduled: (from: string, to: string) => `Aplazado: ${from} → ${to}`,
        reduced: (from: string, to: string) => `Valor cambiado: ${from} → ${to}`,
        canceled: 'Cancelado',
        reopened: 'Volvió a por cobrar',
        delivered: (deposit: string) => `Entregado al líder en el ${deposit}`,
      },
      collected: (amount: string, method: string) => `Cobrado: ${amount} en ${method}`,
      delivered: 'Entregado al líder',
      error: { title: 'No se pudo cargar', text: 'Inténtalo otra vez.' },
      notFound: { title: 'Este abono ya no existe', text: 'Puede que se haya borrado.' },
      /** «Cobrar»: la hoja o ventana del formulario. */
      collectForm: {
        title: (customerName: string) => `Cobrar · ${customerName}`,
        subtitle: (amount: string, date: string) => `Acordado ${amount} · ${date}`,
        paidAmount: 'Valor real',
        paidAt: 'Fecha',
        method: 'Método',
        methods: { cash: 'Efectivo', transfer: 'Transferencia' },
        futureDate: 'La fecha no puede ser futura',
        invalidAmount: 'Escribe un valor mayor que cero',
        /** Cobro parcial: aviso antes de confirmar. */
        partial: (shortfall: string) =>
          `Cobras menos de lo acordado: faltan ${shortfall}. Queda en el saldo del cliente.`,
        overpaid: (extra: string) => `Cobras ${extra} más de lo acordado.`,
        confirm: 'Cobrar',
        cancel: 'Cancelar',
      },
      result: {
        collected: 'Abono cobrado',
        undo: 'Deshacer',
        undone: 'Cobro deshecho',
        partial: (paid: string, shortfall: string) => `Cobrado ${paid} · Faltan ${shortfall}`,
        program: 'Programar',
        extended: 'Abono aplazado',
      },
      swipe: {
        collect: (name: string) => `Cobrar a ${name}`,
        extend: (name: string) => `Aplazar el abono de ${name}`,
      },
    },
  },
  /** Módulo Inventario (HU-PAN-INV-01, diseño «1 · Libros en físico, Agregar y Por resolver»). */
  inventory: {
    title: 'Inventario',
    sections: { label: 'Secciones de Inventario', inStock: 'Libros en físico', copies: 'Ejemplares' },
    add: 'Agregar',
    addToInventory: 'Agregar al inventario',
    returnToLeader: 'Devolver al líder',
    moreActions: 'Más acciones',
    inStock: {
      title: 'Libros en físico',
      minibooks: 'Minibooks',
      /** «2 por resolver» (R4 de HU-INV-03). */
      flagged: (n: number) => `${n} por resolver`,
      /** Tras la cantidad de cada título, solo para lectores de pantalla: «3 en físico». */
      inStockSuffix: ' en físico',
      empty: {
        title: 'Todavía no tienes libros en físico',
        text: 'Cuando agregues libros al inventario, aparecen aquí por título.',
      },
      error: { title: 'No se pudo cargar', text: 'Inténtalo otra vez.' },
    },
    /** Lista de ejemplares (HU-PAN-INV-02, diseño «2 · Ejemplares», BR-COPY-12). */
    copies: {
      tabsLabel: 'Vistas de ejemplares',
      tabs: {
        all: 'Todos',
        in_stock: 'En físico',
        sold: 'Vendidos',
        price_changed: 'Con descuentos y aumentos',
      },
      search: 'Buscar ejemplar',
      results: (n: number) => (n === 1 ? '1 ejemplar' : `${n} ejemplares`),
      sort: {
        received: 'Recibido',
        sold: 'Vendido',
        title: 'Título',
        agreed_price: 'Precio acordado',
        price_delta: 'Diferencia',
      },
      empty: {
        title: 'Todavía no tienes ejemplares',
        text: 'Cuando agregues libros al inventario, aparecen aquí con su estado.',
      },
      emptyTab: { title: 'No hay ejemplares en esta vista' },
      noResults: {
        title: (query: string) => `Ningún ejemplar coincide con «${query}»`,
        text: 'Busqué por título, cliente y número.',
      },
      offline: { title: 'Sin conexión', text: 'Puedes consultar lo guardado, pero no registrar.' },
      error: { title: 'No se pudo cargar', text: 'Inténtalo otra vez.' },
    },
    /** Agregar al inventario (HU-PAN-INV-04, diseño «4 · Agregar al inventario», BR-COPY-02). */
    addCopies: {
      title: 'Agregar al inventario',
      cancel: 'Cancelar',
      discard: 'Descartar',
      done: 'Listo',
      search: 'Buscar libro',
      categories: { cultural: 'Culturales', religious: 'Religiosos', minibook: 'Minibooks' },
      categoriesLabel: 'Categoría',
      empty: {
        title: 'No hay libros en el catálogo',
        text: 'Cuando el catálogo tenga libros activos, aparecen aquí.',
      },
      noResults: (query: string) => `Ningún libro coincide con «${query}»`,
      /** Botón de un título: suma un ejemplar. */
      addOne: (name: string) => `Agregar un ejemplar de ${name}`,
      removeOne: (name: string) => `Quitar uno de ${name}`,
      /** El botón de un título que ya está en el lote: dice cuántos lleva. */
      addAnother: (name: string, quantity: number) =>
        `Agregar un ejemplar de ${name}, ${quantity} en el lote`,
      quantityGroup: (name: string) => `Cantidad de ${name}`,
      /** Móvil: la cantidad es un botón que, al tocarlo, deja escribirla. */
      quantityButton: (quantity: number, name: string) =>
        `${quantity} de ${name}; tocar para escribir la cantidad`,
      quantityInput: (name: string) => `Cantidad total de ${name}`,
      /** Barra de abajo en escritorio: «3 por agregar · recibidos hoy». */
      pending: 'por agregar',
      receivedWhen: (label: string) => `recibidos ${label}`,
      addN: (n: number) => `Agregar ${n}`,
      date: {
        label: (value: string) => `Fecha de recibido: ${value}`,
        title: 'Fecha de recibido',
        today: 'Hoy',
        yesterday: 'Ayer',
        day_before: 'Anteayer',
        other: 'Otra fecha…',
        pick: 'Elegir fecha',
        save: 'Guardar fecha',
        cancel: 'Cancelar',
      },
      summary: {
        title: (n: number) => (n === 1 ? 'Vas a agregar 1 ejemplar' : `Vas a agregar ${n} ejemplares`),
        received: (date: string) => `Recibidos ${date}`,
        categories: 'Por categoría',
        total: 'Total',
        keepAdding: 'Seguir agregando',
        /** Una caja por categoría con su cantidad. */
        tile: (n: number, name: string) => `${n} ${name}`,
      },
      result: {
        added: (n: number) => (n === 1 ? '1 ejemplar agregado' : `${n} ejemplares agregados`),
      },
    },
    /** Devolver al líder (HU-PAN-INV-05, diseño «5 · Devolver al líder», BR-COPY-16). */
    returnLeader: {
      title: 'Devolver al líder',
      cancel: 'Cancelar',
      back: 'Atrás',
      next: 'Siguiente',
      done: 'Listo',
      search: 'Buscar libro',
      step: (n: number) => `Paso ${n} de 2`,
      booksLabel: 'Ejemplares en físico',
      columns: { book: 'Ejemplar', received: 'Recibido' },
      bookName: (name: string, number: number) => `${name} #${number}`,
      received: (date: string) => `Recibido ${date}`,
      minibooks: 'Minibooks (por cantidad)',
      minibookQuantity: (name: string) => `Cantidad de ${name} a devolver`,
      minibookOf: (n: number) => `de ${n}`,
      note: 'Nota',
      notePlaceholder: 'Nota para el historial',
      /** Barra de abajo: «3 ejemplares seleccionados» o «3 ejemplares y 2 minibooks». */
      selected: (books: number, minibooks: number) => {
        const copies = books === 1 ? '1 ejemplar' : `${books} ejemplares`;
        if (minibooks === 0) return `${copies} ${books === 1 ? 'seleccionado' : 'seleccionados'}`;
        const mini = minibooks === 1 ? '1 minibook' : `${minibooks} minibooks`;
        return books === 0 ? `${mini} seleccionados` : `${copies} y ${mini}`;
      },
      empty: {
        title: 'No tienes libros en físico para devolver',
        text: 'Cuando tengas libros en físico, los eliges aquí.',
      },
      noResults: (query: string) => `Ningún libro coincide con «${query}»`,
      error: { title: 'No se pudo cargar', text: 'Inténtalo otra vez.' },
      summary: {
        title: (n: number) => (n === 1 ? 'Vas a devolver 1 ejemplar' : `Vas a devolver ${n} ejemplares`),
        back: 'Seguir eligiendo',
        confirm: (n: number) => `Devolver ${n}`,
        note: 'Nota de la devolución',
        categories: 'Por categoría',
        total: 'Total',
      },
      result: {
        returned: (n: number) => (n === 1 ? '1 ejemplar devuelto' : `${n} ejemplares devueltos`),
        undo: 'Deshacer',
      },
    },
    /** Detalle de un ejemplar (HU-PAN-INV-03, diseño «3 · Ejemplar»). */
    detail: {
      title: (titleName: string, number: number) => `${titleName} #${number}`,
      moreActions: 'Más acciones',
      noteRequired: 'Escribe una nota',
      flag: 'Marcar con novedad',
      delete: 'Eliminar',
      status: 'Estado',
      customer: 'Cliente',
      agreedPrice: 'Precio acordado',
      restorePrice: (publicPrice: string) => `Restaurar precio de inventario ${publicPrice}`,
      price: 'Precio',
      delta: 'Diferencia',
      discount: 'descuento',
      increase: 'aumento',
      soldOn: 'Vendido el',
      receivedOn: 'Recibido el',
      changeReceived: (date: string) => `Recibido el ${date}, cambiar fecha`,
      history: 'Historial',
      undo: 'Deshacer',
      error: { title: 'No se pudo cargar', text: 'Inténtalo otra vez.' },
      /** Fecha de recibido: Hoy, Ayer, Anteayer u otra (el lienzo «Fecha de recibido»). */
      receivedMenu: {
        title: 'Fecha de recibido',
        save: 'Guardar fecha',
        cancel: 'Cancelar',
      },
      flagDialog: {
        title: 'Marcar con novedad',
        label: 'Nota',
        placeholder: '¿Qué pasó con este ejemplar?',
        confirm: 'Marcar con novedad',
        cancel: 'Cancelar',
      },
      deleteDialog: {
        title: (copyName: string) => `Eliminar ${copyName}`,
        label: 'Nota',
        placeholder: '¿Por qué lo eliminas?',
        confirm: 'Eliminar',
        cancel: 'Cancelar',
      },
      /** BR-COPY-16: deshacer una devolución al líder pide una nota. */
      undoReturnDialog: {
        title: (copyName: string) => `Deshacer devolución · ${copyName}`,
        label: 'Nota (obligatoria)',
        placeholder: '¿Por qué deshaces la devolución?',
        confirm: 'Deshacer devolución',
        cancel: 'Cancelar',
      },
      done: {
        flagged: (copyName: string) => `${copyName} quedó con novedad`,
        deleted: (copyName: string) => `${copyName} se eliminó`,
        priceSaved: 'Precio acordado guardado',
        priceRestored: 'Precio restaurado',
        receivedSaved: 'Fecha de recibido guardada',
      },
      /** Texto de cada entrada del historial. */
      event: {
        received: 'Recibido',
        sold: (customer: string | undefined) => (customer ? `Vendido a ${customer}` : 'Vendido'),
        returned: 'Devuelto por el cliente',
        flagged: 'Con novedad',
        resolvedFound: 'Apareció',
        resolvedLost: 'Perdido (lo asumo yo)',
        resolvedRemoved: 'Eliminado',
        undoResolved: 'Cambio deshecho',
        deleted: 'Eliminado',
        undoDeleted: 'Eliminación deshecha',
        priceChanged: (price: string | null) =>
          price ? `Precio acordado: ${price}` : 'Precio restaurado al público',
        receivedDateChanged: (date: string) => `Fecha de recibido cambiada a ${date}`,
        soldAtChanged: (date: string) => `Fecha de venta cambiada a ${date}`,
        minibookSold: 'Minibook vendido',
        returnedToLeader: 'Devuelto al líder',
        undoReturnedToLeader: 'Devolución deshecha',
      },
    },
    /** Un título abierto: sus ejemplares en físico. */
    openTitle: {
      summary: (count: number, price: string) => `${count} en físico · ${price}`,
      copies: 'Ejemplares',
      copy: (number: number) => `#${number}`,
      received: (date: string) => `Recibido ${date}`,
    },
    /** Por resolver (HU-INV-07, BR-COPY-11: «lo asumo yo» es el colportor, nunca el líder). */
    flagged: {
      title: 'Por resolver',
      found: 'Apareció',
      lost: 'Perdido',
      lostDetail: '(lo asumo yo)',
      remove: 'Eliminar',
      empty: { title: 'No hay nada por resolver' },
      /** Nombre de cada acción para lectores de pantalla: «Apareció: Psiconutrición #4». */
      action: (action: string, copyName: string) => `${action}: ${copyName}`,
      copyName: (title: string, number: number) => `${title} #${number}`,
      note: {
        lostTitle: (copyName: string) => `Perdido (lo asumo yo) · ${copyName}`,
        removeTitle: (copyName: string) => `Eliminar · ${copyName}`,
        label: 'Nota (opcional)',
        placeholder: '¿Qué pasó? Puedes dejarlo en blanco',
        confirmLost: 'Marcar como perdido',
        confirmRemove: 'Eliminar',
        cancel: 'Cancelar',
      },
      done: {
        found: (copyName: string) => `${copyName} está de nuevo en físico`,
        lost: (copyName: string) => `${copyName} quedó como perdido`,
        removed: (copyName: string) => `${copyName} se eliminó`,
      },
      undo: 'Deshacer',
    },
  },
  /** Módulo Dinero (BR-DEP-14, ADR-0046). */
  money: {
    /** Resumen de dinero (HU-UI-25). */
    summary: {
      toDeliver: 'Por entregar',
      toDeliverInfo: 'Qué es Por entregar',
      cash: 'Efectivo',
      transfer: 'Transferencia',
      deliver: 'Entregar al líder',
      nothingToDeliver: 'No hay dinero por entregar',
      delivered: 'Entregado',
      toCollect: 'Por cobrar',
      total: 'Dinero total',
    },
    /** Dinero: abonos de clientes (HU-PAN-DIN-01, diseño «1 · Abonos de clientes» y «2 · Por cobrar y Cobrar»). */
    list: {
      title: 'Dinero',
      sectionsLabel: 'Vistas de Dinero',
      payments: 'Abonos de clientes',
      deposits: 'Abibonos',
      tabsLabel: 'Vistas de abonos',
      tabs: {
        all: 'Todos',
        to_collect: 'Por cobrar',
        to_deliver: 'Por entregar',
        delivered: 'Entregados',
        canceled: 'Cancelados',
      },
      search: 'Buscar cliente',
      results: (n: number) => (n === 1 ? '1 abono' : `${n} abonos`),
      /** Botón del Encabezado en móvil: abre la hoja del resumen. */
      summaryLabel: 'Por entregar',
      summaryTitle: 'Resumen de dinero',
      toDeliverTip: 'Lo que ya cobraste y falta entregar al líder.',
      filter: 'Filtrar',
      method: 'Método',
      methods: { cash: 'Efectivo', transfer: 'Transferencia' },
      overdueOnly: 'Solo vencidos',
      overdueChip: 'Vencidos',
      sort: {
        agreed_date: 'Fecha acordada',
        paid_date: 'Fecha real',
        agreed_amount: 'Valor acordado',
        paid_amount: 'Valor real',
        customer: 'Cliente',
      },
      columns: {
        customer: 'Cliente',
        agreedAmount: 'Valor acordado',
        agreedDate: 'Fecha acordada',
        status: 'Estado',
        paidAt: 'Fecha real',
        paidAmount: 'Valor real',
        method: 'Método',
        /** #70: la columna de «Cobrar» (solo para el lector). */
        actions: 'Acciones',
      },
      overdue: (days: number) => (days === 1 ? 'hace 1 día' : `hace ${days} días`),
      overdueStatus: (days: number) => (days === 1 ? 'Vencido · hace 1 día' : `Vencido · hace ${days} días`),
      archivedCustomer: '(cliente archivado)',
      inDraftDeposit: 'En un Abibono borrador',
      empty: {
        title: 'Todavía no hay abonos',
        text: 'Cuando vendas un libro a cuotas, sus abonos aparecen aquí.',
      },
      emptyTab: { title: 'No hay abonos en esta vista' },
      noResults: {
        title: (query: string) => `Ningún abono coincide con «${query}»`,
        text: 'Busqué por cliente.',
      },
      offline: { title: 'Sin conexión', text: 'Puedes consultar lo guardado, pero no registrar.' },
      error: { title: 'No se pudo cargar', text: 'Inténtalo otra vez.' },
      /** Por cobrar: lo programado y lo que aún no tiene abonos programados (ADR-0046). */
      scheduled: 'Programado',
      unscheduled: 'Sin programar',
      unscheduledLink: (amount: string, customers: number) =>
        `Sin programar ${amount} · ${customers === 1 ? '1 cliente' : `${customers} clientes`}`,
      unscheduledTitle: 'Clientes sin programar',
      unscheduledBack: 'Volver a Por cobrar',
      unscheduledEmpty: { title: 'Todos tus clientes tienen abonos programados' },
    },
    /** Lista de Abibonos (HU-PAN-DIN-03, diseño «3 · Abibonos»). */
    deposits: {
      listLabel: 'Abibonos',
      tabsLabel: 'Vistas de Abibonos',
      all: 'Todos',
      search: 'Buscar Abibono',
      results: (n: number) => (n === 1 ? '1 Abibono' : `${n} Abibonos`),
      sort: { date: 'Fecha', total: 'Total', name: 'Nombre' },
      totalDelivered: 'Total abonado al líder',
      totalDeliveredInfo: 'Qué es Total abonado al líder',
      totalDeliveredTip: 'La suma de lo que ya entregaste al líder en Abibonos confirmados.',
      info: 'Qué es un Abibono',
      infoTip: 'Entrega al líder',
      columns: {
        name: 'Nombre',
        date: 'Fecha',
        total: 'Total',
        cash: 'Efectivo',
        transfer: 'Transferencia',
        status: 'Estado',
        receipt: 'Recibo',
      },
      receipt: 'Recibo',
      statuses: { draft: 'Borrador', confirmed: 'Entregado' },
      empty: {
        title: 'Aún no tienes Abibonos',
        text: 'Aparecen aquí cuando entregas dinero con Nuevo Abibono.',
      },
      noResults: {
        title: (query: string) => `Ningún Abibono coincide con «${query}»`,
        text: 'Busqué por nombre.',
      },
      offline: { title: 'Sin conexión', text: 'Puedes consultar lo guardado, pero no registrar.' },
      error: { title: 'No se pudo cargar', text: 'Inténtalo otra vez.' },
    },
    /** Nuevo Abibono y borradores (HU-PAN-DIN-04, diseño «4 · Nuevo Abibono»). */
    depositEditor: {
      newTitle: 'Nuevo Abibono',
      draftTitle: (name: string) => name,
      breadcrumb: 'Dinero',
      moreActions: 'Más acciones',
      name: 'Título del Abibono',
      date: 'Fecha',
      payments: 'Abonos',
      paymentsAll: 'Todos',
      /** #71: quitar todos los abonos marcados. */
      paymentsNone: 'Quitar todos',
      paymentsAllShort: 'Marcar todos',
      include: 'Incluir',
      includePayment: (name: string) => `Incluir abono de ${name}`,
      paymentInclude: (customer: string) => `Incluir abono de ${customer}`,
      columns: { customer: 'Cliente', paidAt: 'Fecha real', method: 'Método', amount: 'Valor real' },
      methods: { cash: 'Efectivo', transfer: 'Transferencia' },
      noPayments: 'No hay abonos cobrados por entregar.',
      amounts: 'Montos',
      cash: 'Efectivo',
      transfer: 'Transferencia',
      total: 'Total',
      calculated: (amount: string) => `Calculado ${amount}`,
      restore: 'Restaurar',
      balance: 'Cuadre',
      expected: 'Esperado',
      expectedInfo: 'Qué es Esperado',
      expectedTip: 'Lo que suman los abonos cobrados que marcaste.',
      delivered: 'Entregado',
      difference: 'Diferencia',
      differenceInfo: 'Qué es Diferencia',
      differenceTip: 'Lo que entregas menos lo esperado: negativa si falta, positiva si sobra.',
      shortfall: 'faltante',
      surplus: 'sobrante',
      note: 'Nota',
      noteRequired: 'obligatoria',
      notePlaceholder: 'Nota para el historial',
      noteDifferencePlaceholder: '¿Por qué hay diferencia?',
      receipt: 'Recibo',
      addPhoto: 'Añadir foto',
      addAnother: 'Añadir otra',
      uploading: 'Subiendo foto…',
      receiptPhoto: (n: number) => `Foto del recibo ${n}`,
      removePhoto: (n: number) => `Quitar foto del recibo ${n}`,
      uploadFailed: 'No se pudo subir el recibo',
      retry: 'Reintentar',
      saveDraft: 'Guardar borrador',
      confirm: 'Marcar como entregado',
      cancel: 'Cancelar',
      /** Por qué «Marcar como entregado» aún no se puede (BR-DEP-06, BR-DEP-09). */
      blockers: {
        NO_RECEIPT: 'Falta el recibo: añade una foto.',
        TOTAL_ZERO: 'El total es $0.',
        NOTE_REQUIRED: 'Escribe una nota que explique la diferencia.',
      },
      delete: 'Borrar',
      deleteTitle: '¿Borrar el borrador?',
      deleteMessage: 'Se borran sus fotos y sus abonos vuelven a estar libres para otro Abibono.',
      deleteConfirm: 'Borrar',
      deleteCancel: 'Conservar',
      notFound: { title: 'Este Abibono ya no existe', text: 'Puede que se haya borrado.' },
      error: { title: 'No se pudo cargar', text: 'Inténtalo otra vez.' },
      result: {
        saved: 'Borrador guardado',
        confirmed: 'Abibono entregado',
        deleted: 'Borrador borrado',
      },
    },
    /** Abibono entregado y reabrir (HU-PAN-DIN-05, diseño «3 · Abibonos»: Dinero-d-confirmado, -reabrir). */
    /** #71: piezas comunes del Abibono (diseño «AbibonoPanel»). */
    depositPanel: {
      total: 'Total',
      payments: (n: number) => (n === 1 ? '1 abono' : `${n} abonos`),
      paymentsTitle: 'Abonos',
      selected: (n: number, of: number) => `${n} de ${of}`,
      columns: { customer: 'Cliente', paidAt: 'Fecha real', method: 'Método', amount: 'Valor real' },
      locked: 'Bloqueado',
      toDeliver: 'Lo que entregas',
      receipt: 'Recibo',
      balance: 'Cuadre',
    },
    /** Recibo del Abibono (lienzo «Recibo del Abibono», ronda 37). */
    depositReceipt: {
      open: 'Ver recibo',
      title: 'Recibo',
      kicker: 'Entrega al líder',
      date: 'Fecha',
      colportor: 'Colportor',
      status: 'Estado',
      confirmed: 'Confirmado',
      customer: 'Cliente',
      paidAt: 'Cobrado el',
      method: 'Medio',
      amount: 'Valor',
      expected: 'Esperado',
      cash: 'Efectivo',
      transfer: 'Transferencia',
      total: 'Total entregado',
      difference: 'Diferencia',
      note: 'Nota',
      photos: (n: number) => `Recibo del líder: ${n === 1 ? '1 foto adjunta' : `${n} fotos adjuntas`}.`,
      generated: (date: string) => `Generado el ${date}`,
      print: 'Imprimir o guardar PDF',
      share: 'Compartir',
      copied: 'Enlace del recibo copiado.',
      back: (name: string) => name,
    },
    depositDetail: {
      breadcrumb: 'Dinero',
      moreActions: 'Más acciones',
      reopen: 'Reabrir',
      data: 'Datos',
      date: 'Fecha',
      cash: 'Efectivo',
      transfer: 'Transferencia',
      total: 'Total',
      expected: 'Esperado',
      difference: 'Diferencia',
      shortfall: 'faltante',
      surplus: 'sobrante',
      note: 'Nota',
      noteRequired: 'obligatoria',
      notePlaceholder: 'Nota para el historial',
      noteDifferencePlaceholder: '¿Por qué hay diferencia?',
      noteRequiredHint: 'Escribe una nota que explique la diferencia.',
      saveNote: 'Guardar nota',
      noteSaved: 'Nota guardada',
      receipt: 'Recibo',
      payments: 'Abonos',
      history: 'Historial',
      historyConfirmed: 'Marcado como entregado',
      historyReopened: 'Reabierto',
      reopenTitle: (name: string) => `Reabrir ${name}`,
      reopenMessage: 'Vuelve a ser borrador y sus abonos vuelven a Cobrado. Conserva su número.',
      reason: 'Motivo',
      reasonPlaceholder: '¿Por qué lo reabres?',
      reasonRequired: 'Escribe el motivo.',
      reopenConfirm: 'Reabrir',
      reopenCancel: 'Cancelar',
      reopened: 'Abibono reabierto',
      notFound: { title: 'Este Abibono ya no existe', text: 'Puede que se haya borrado.' },
      error: { title: 'No se pudo cargar', text: 'Inténtalo otra vez.' },
    },
  },
  /**
   * Mensaje de cada `AppError.code` (HU-PAN-BASE-01, 00-REGLAS-COMUNES §3). Una prueba falla si un código que exporta
   * el back no tiene texto aquí. Las pantallas lo leen con `useAppErrorMessage`; el texto del campo afectado
   * (`details.field`) lo pone cada pantalla.
   */
  errors: {
    /** Un código sin texto (no debería pasar: lo vigila la prueba). */
    unknown: 'Algo salió mal. Vuelve a intentarlo.',
    retry: 'Reintentar',
    /** #104: para reportar un error (el código dice qué fue; la referencia, cuál de todos). */
    reference: (code: string, ref: string) => `Código ${code} · ref. ${ref}`,
    codes: {
      // Comunes (00-REGLAS-COMUNES §3)
      OFFLINE: 'Sin conexión: puedes consultar, pero no registrar.',
      NETWORK_ERROR: 'No se pudo conectar. Vuelve a intentarlo.',
      TIMEOUT: 'La conexión está tardando demasiado. Revisa la señal y vuelve a intentarlo.',
      SESSION_EXPIRED: 'Tu sesión venció. Vuelve a entrar.',
      NOT_FOUND: 'Ya no existe. Puede que se haya borrado.',
      FORBIDDEN: 'No tienes permiso para hacer esto.',
      VALIDATION: 'Revisa los datos marcados.',
      CONFLICT: 'Esto cambió mientras lo editabas. Revisa y vuelve a guardar.',
      // Adaptadores
      AUTH_FAILED: 'No se pudo verificar tu sesión. Vuelve a intentarlo.',
      STORAGE_FAILED: 'No se pudo guardar la foto. Vuelve a intentarlo.',
      // Sesión (HU-BASE-03)
      INVALID_CREDENTIALS: 'El correo o la contraseña no coinciden.',
      USER_INACTIVE: 'Tu usuario está desactivado. Habla con tu líder.',
      // Inventario
      BATCH_EMPTY: 'Agrega al menos un libro.',
      DATE_IN_FUTURE: 'La fecha no puede ser futura.',
      TITLE_INACTIVE: 'Ese título ya no está en el catálogo.',
      COPY_NOT_IN_STOCK: 'Ese ejemplar ya no está en físico.',
      COPY_IS_MINIBOOK: 'Los minibooks no se venden a un cliente.',
      COPY_NOT_SOLD: 'Ese ejemplar no está vendido.',
      COPY_NOT_DELETABLE: 'Este ejemplar no se puede eliminar.',
      NOTE_REQUIRED: 'Escribe una nota.',
      DATE_AFTER_SALE: 'La fecha de recibido no puede ser posterior a la venta.',
      SOLD_IN_FUTURE: 'La fecha de venta no puede ser futura.',
      SOLD_BEFORE_RECEIVED: 'La fecha de venta no puede ser anterior a la de recibido.',
      COPY_NOT_FLAGGED: 'Este ejemplar ya no tiene novedad.',
      UNDO_NOT_AVAILABLE: 'Ya no se puede deshacer.',
      INVALID_TRANSITION: 'Esto ya cambió. Actualiza para ver cómo quedó.',
      SELECTION_EMPTY: 'Elige al menos un libro.',
      NOT_ENOUGH_STOCK: 'No hay suficientes en físico.',
      // Clientes
      CUSTOMER_ARCHIVED: 'Este cliente está archivado.',
      CUSTOMER_DISCARD_BLOCKED: 'No se puede descartar: un abono de este cliente ya está en un Abibono.',
      CUSTOMER_HAS_BOOKS: 'No se puede archivar: el cliente tiene libros vendidos.',
      CUSTOMER_NOT_ARCHIVED: 'Este cliente no está archivado.',
      // Abonos
      PAYMENT_LOCKED: 'Este cobro ya se entregó al líder y no se puede cambiar.',
      PAYMENT_NOT_SCHEDULED: 'Este abono ya no está por cobrar.',
      PLAN_REQUIRES_BALANCE: 'No hay saldo para programar abonos.',
      PLAN_TOTAL_MISMATCH: 'Los abonos no suman el saldo.',
      PLAN_AMOUNTS_EXCEED: 'Los valores que cambiaste pasan del saldo.',
      NO_EXCESS: 'Los abonos ya cuadran con el saldo.',
      // Dinero (Abibonos)
      PAYMENT_NOT_AVAILABLE: 'Algún abono ya no está disponible. Revisa la lista.',
      DEPOSIT_NOT_DRAFT: 'Este Abibono ya está confirmado.',
      DEPOSIT_NOT_CONFIRMED: 'Este Abibono no está confirmado.',
      RECEIPT_LOCKED: 'Los recibos de un Abibono confirmado no se borran.',
      REASON_REQUIRED: 'Escribe el motivo.',
      NO_RECEIPT: 'Agrega al menos una foto del recibo.',
      TOTAL_ZERO: 'El total entregado no puede ser $0.',
      // Fotos
      IMAGE_UNREADABLE: 'No se pudo leer la imagen. Prueba con otra.',
      IMAGE_ENCODING_FAILED: 'No se pudo preparar la imagen en este dispositivo.',
    },
  },
} as const;
