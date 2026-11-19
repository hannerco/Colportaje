import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDismissTimer } from './dismiss-timer';

describe('createDismissTimer (HU-UI-15, R3)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('CA-1: sin interacción, vence a los 6 s (no antes)', () => {
    const onExpire = vi.fn();
    createDismissTimer(6000, onExpire);
    vi.advanceTimersByTime(5999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('CA-4: con el puntero encima a los 5 s, a los 8 s sigue; al salir, el tiempo continúa donde iba', () => {
    const onExpire = vi.fn();
    const timer = createDismissTimer(6000, onExpire);
    vi.advanceTimersByTime(5000);
    timer.pause('hover');
    vi.advanceTimersByTime(3000);
    expect(onExpire).not.toHaveBeenCalled();
    timer.resume('hover');
    vi.advanceTimersByTime(999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('con foco y puntero, soltar solo el puntero no reanuda', () => {
    const onExpire = vi.fn();
    const timer = createDismissTimer(1000, onExpire);
    timer.pause('focus');
    timer.pause('hover');
    timer.resume('hover');
    vi.advanceTimersByTime(5000);
    expect(onExpire).not.toHaveBeenCalled();
    timer.resume('focus');
    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('reanudar sin haber pausado, o pausar dos veces, no cambia el tiempo', () => {
    const onExpire = vi.fn();
    const timer = createDismissTimer(1000, onExpire);
    timer.resume('hover');
    timer.pause('hover');
    timer.pause('hover');
    timer.resume('hover');
    vi.advanceTimersByTime(999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('detenido (cerrado o reemplazado), ya no vence ni se reanuda', () => {
    const onExpire = vi.fn();
    const timer = createDismissTimer(1000, onExpire);
    timer.pause('hover');
    timer.stop();
    timer.resume('hover');
    timer.pause('focus');
    vi.advanceTimersByTime(5000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('una vez vencido, pausar o reanudar no lo vuelve a llamar', () => {
    const onExpire = vi.fn();
    const timer = createDismissTimer(10, onExpire);
    vi.advanceTimersByTime(10);
    timer.pause('hover');
    timer.resume('hover');
    timer.stop();
    vi.advanceTimersByTime(100);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
