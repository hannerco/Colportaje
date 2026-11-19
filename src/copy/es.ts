// Textos de la interfaz en español (00-REGLAS-COMUNES-FRONT §7): ningún componente lleva texto escrito dentro.
// `ui` son los textos fijos de los componentes de src/ui; las pantallas agregan los suyos por área.

export const copy = {
  /** Nombre de la app (título de la pestaña y del ícono instalado). */
  app: { name: 'Colportor' },
  ui: {
    /** Texto por defecto del botón mientras se guarda (HU-UI-04). */
    saving: 'Guardando…',
    /** Nombre accesible de la ✕ de un chip de filtro (HU-UI-06). */
    removeFilter: (filter: string) => `Quitar filtro ${filter}`,
    /** Nombre accesible de la cuota de un abono, «2/4» (HU-UI-07). */
    installment: (index: number, total: number) => `Cuota ${index} de ${total}`,
    /** Nombre accesible del avatar cuando no se da otro (HU-UI-08). */
    avatar: { person: 'Cliente', cover: 'Portada', brand: 'Colportor' },
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
        copy: ['Ejemplar', 'Recibido el', 'Precio', 'Cliente', 'Estado'],
      },
      /** Sobre el saldo pendiente en la fila móvil de clientes (BR-CUS-13). */
      owes: 'Debe',
      /** En lugar del libro, para un cliente sin ventas (BR-CUS-13). */
      prospect: 'Prospecto',
      /** Celda sin dato (cliente sin abonos, prospecto sin estado, ejemplar sin cliente). */
      empty: '—',
      /** Segunda línea del ejemplar en móvil. */
      received: (date: string) => `Recibido ${date}`,
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
    detailWindow: {
      close: 'Cerrar',
      modeGroup: 'Forma de la ventana',
      modes: { side: 'Lateral', center: 'Centrada', page: 'Página' },
      prev: 'Anterior',
      next: 'Siguiente',
      breadcrumb: 'Ruta',
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
    codes: {
      // Comunes (00-REGLAS-COMUNES §3)
      OFFLINE: 'Sin conexión: puedes consultar, pero no registrar.',
      NETWORK_ERROR: 'No se pudo conectar. Vuelve a intentarlo.',
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
      DATE_NOT_LATER: 'Elige una fecha posterior a la actual.',
      RESCHEDULE_NEEDS_CONFIRMATION: 'Es más de 2 meses de plazo. Confírmalo.',
      NO_EXCESS: 'Los abonos ya cuadran con el saldo.',
      LEAVE_NOT_ALLOWED: 'Sin saldo pendiente no se pueden dejar abonos por cobrar.',
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
