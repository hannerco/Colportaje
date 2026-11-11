import { businessConfig } from './config/business-config';
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';

/** Día calendario `AAAA-MM-DD`, sin hora ni zona (`*_date` en la base de datos). */
export type LocalDate = string & { readonly __brand: 'LocalDate' };

/** Un instante exacto (`*_at` en la base de datos). */
export type Instant = Date;

/** Formato de hora del perfil (BR-GEN-07, `profile.time_format`). */
export type TimeFormat = '12h' | '24h';

/** Fuente de "ahora". Se inyecta: el dominio nunca lee el reloj del dispositivo (BR-GEN-05). */
export interface Clock {
  now(): Instant;
}

/** Reloj detenido en un instante, para pruebas. */
export const fixedClock = (iso: string): Clock => ({ now: () => new Date(iso) });

const MS_PER_DAY = 86_400_000;
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

const fromParts = (year: number, month: number, day: number): LocalDate =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}` as LocalDate;

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

const toParts = (d: LocalDate): { year: number; month: number; day: number } => {
  const [year, month, day] = d.split('-').map(Number) as [number, number, number];
  return { year, month, day };
};

const toEpochDay = (d: LocalDate): number => {
  const { year, month, day } = toParts(d);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
};

const fromEpochDay = (epochDay: number): LocalDate => {
  const date = new Date(epochDay * MS_PER_DAY);
  return fromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

/** Valida un texto `AAAA-MM-DD` que corresponda a un día real. */
export const parseLocalDate = (text: string): Result<LocalDate, AppError> => {
  const match = LOCAL_DATE_PATTERN.exec(text);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)) {
      return ok(fromParts(year, month, day));
    }
  }
  return err(validationError('date', { input: text }));
};

/** Como `parseLocalDate`, pero lanza si el texto no es válido. Solo para constantes conocidas. */
export const localDate = (text: string): LocalDate => {
  const result = parseLocalDate(text);
  if (!result.ok) throw new RangeError(`Fecha inválida: ${text}`);
  return result.value;
};

/** Partes de fecha y hora de un instante en la zona de negocio. */
const zonedParts = (instant: Instant) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: businessConfig.timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
};

/** El día de hoy en America/Bogota (BR-GEN-05). */
export const todayBogota = (clock: Clock): LocalDate => {
  const { year, month, day } = zonedParts(clock.now());
  return fromParts(year, month, day);
};

/** `2026-11-07` → `07/11/2026` (BR-GEN-07). */
export const formatDate = (d: LocalDate): string => {
  const { year, month, day } = toParts(d);
  return `${pad(day)}/${pad(month)}/${pad(year, 4)}`;
};

/** Hora en America/Bogota: `9:40 p. m.` (12 h, por defecto) o `21:40` (24 h) (BR-GEN-07). */
export const formatTime = (instant: Instant, format: TimeFormat = '12h'): string => {
  const { hour, minute } = zonedParts(instant);
  if (format === '24h') return `${pad(hour)}:${pad(minute)}`;
  const suffix = hour < 12 ? 'a. m.' : 'p. m.';
  return `${hour % 12 === 0 ? 12 : hour % 12}:${pad(minute)} ${suffix}`;
};

export const addDays = (d: LocalDate, days: number): LocalDate => fromEpochDay(toEpochDay(d) + days);

/** Suma meses calendario; si el día no existe en el mes destino, usa el último (31/01 + 1 mes = 28/02). */
export const addMonthsClamped = (d: LocalDate, months: number): LocalDate => {
  const { year, month, day } = toParts(d);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  return fromParts(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
};

/** Último día del mes de `d`. */
export const lastDayOfMonth = (d: LocalDate): LocalDate => {
  const { year, month } = toParts(d);
  return fromParts(year, month, daysInMonth(year, month));
};

/** Días de `from` a `to` (negativo si `to` es anterior). */
export const daysBetween = (from: LocalDate, to: LocalDate): number => toEpochDay(to) - toEpochDay(from);

/** Domingo de la semana de `d`: la semana empieza el domingo (BR-GEN-07). */
export const startOfWeek = (d: LocalDate): LocalDate => {
  const epochDay = toEpochDay(d);
  const weekday = new Date(epochDay * MS_PER_DAY).getUTCDay(); // 0 = domingo
  return fromEpochDay(epochDay - weekday);
};
