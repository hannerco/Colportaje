// Mes del calendario (HU-PAN-CLI-05): 6 semanas de domingo a sábado (BR-GEN-07), como el lienzo.
import { addDays, addMonthsClamped, startOfWeek, type LocalDate } from '@/domain/time';

export type CalendarDay = {
  readonly date: LocalDate;
  readonly day: number;
  /** Del mes que se muestra (los demás son de relleno). */
  readonly inMonth: boolean;
};

/** El día 1 del mes de `d`. */
export const firstOfMonth = (d: LocalDate): LocalDate => `${d.slice(0, 8)}01` as LocalDate;

/** Año y mes (1–12) de `d`. */
export const yearMonth = (d: LocalDate) => ({ year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) });

/** Las 42 casillas del mes de `month`, desde el domingo de la semana del día 1. */
export const calendarMonth = (month: LocalDate): CalendarDay[] => {
  const first = firstOfMonth(month);
  const start = startOfWeek(first);
  const current = first.slice(0, 7);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return { date, day: Number(date.slice(8, 10)), inMonth: date.slice(0, 7) === current };
  });
};

/** Mover el día con el teclado: flechas ±1 / ±7, Inicio y Fin de la semana, RePág / AvPág ±1 mes. */
export const moveDay = (date: LocalDate, key: string): LocalDate | null => {
  switch (key) {
    case 'ArrowLeft':
      return addDays(date, -1);
    case 'ArrowRight':
      return addDays(date, 1);
    case 'ArrowUp':
      return addDays(date, -7);
    case 'ArrowDown':
      return addDays(date, 7);
    case 'Home':
      return startOfWeek(date);
    case 'End':
      return addDays(startOfWeek(date), 6);
    case 'PageUp':
      return addMonthsClamped(date, -1);
    case 'PageDown':
      return addMonthsClamped(date, 1);
    default:
      return null;
  }
};
