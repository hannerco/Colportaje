import type { Clock } from '@/domain/time';

/** El reloj real. Solo se usa al conectar la app; el dominio lo recibe inyectado (BR-GEN-05). */
export const systemClock: Clock = { now: () => new Date() };
