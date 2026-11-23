// Libros elegidos en la hoja Agregar libro (HU-PAN-CLI-04): qué precio y qué fecha mostrar mientras el servidor
// confirma la venta (#31).
import type { COP } from '@/domain/money';
import type { LocalDate } from '@/domain/time';

export type ChosenBookValues = {
  agreedPrice: COP | null;
  soldOn: LocalDate | null;
};

/**
 * Valores que se ven de un libro recién elegido. Lo que el colportor escribió manda; si no escribió nada, lo que ya
 * guardó el servidor; y mientras el servidor no responde, lo mismo que él va a guardar: el precio público del ejemplar y
 * la fecha de hoy (al vender, la venta queda con la fecha del día, HU-CLI-09). Así «Vendido el» no queda vacío unos
 * segundos (#31).
 */
export function chosenBookValues(input: {
  typed: { agreedPrice?: COP | null; soldOn?: LocalDate | null };
  saved?: { agreedPrice: COP | null; soldOn: LocalDate | null };
  /** El precio público del ejemplar (nulo en un minibook sin precio público). */
  publicPrice: COP | null;
  today: LocalDate;
}): ChosenBookValues {
  const { typed, saved, publicPrice, today } = input;
  return {
    agreedPrice: 'agreedPrice' in typed ? (typed.agreedPrice ?? null) : (saved?.agreedPrice ?? publicPrice),
    soldOn: 'soldOn' in typed ? (typed.soldOn ?? null) : (saved?.soldOn ?? today),
  };
}
