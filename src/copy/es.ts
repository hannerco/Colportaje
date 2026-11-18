// Textos de la interfaz en español (00-REGLAS-COMUNES-FRONT §7): ningún componente lleva texto escrito dentro.
// `ui` son los textos fijos de los componentes de src/ui; las pantallas agregan los suyos por área.

export const copy = {
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
} as const;
