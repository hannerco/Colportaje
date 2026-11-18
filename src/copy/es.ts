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
