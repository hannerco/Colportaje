/**
 * Temporizador del Aviso (HU-UI-15, R3): llama `onExpire` a los `durationMs`, y el tiempo se detiene mientras haya
 * alguna razón de pausa (foco o puntero encima). Las razones se cuentan aparte: soltar el puntero no reanuda si el
 * foco sigue dentro.
 */
export type DismissTimer = {
  pause: (reason: PauseReason) => void;
  resume: (reason: PauseReason) => void;
  stop: () => void;
};

export type PauseReason = 'hover' | 'focus';

export function createDismissTimer(durationMs: number, onExpire: () => void): DismissTimer {
  let remaining = durationMs;
  let startedAt = 0;
  let handle: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const reasons = new Set<PauseReason>();

  const run = () => {
    startedAt = Date.now();
    handle = setTimeout(() => {
      handle = undefined;
      stopped = true;
      onExpire();
    }, remaining);
  };

  run();

  return {
    pause(reason) {
      if (stopped) return;
      reasons.add(reason);
      if (handle === undefined) return;
      clearTimeout(handle);
      handle = undefined;
      remaining = Math.max(0, remaining - (Date.now() - startedAt));
    },
    resume(reason) {
      if (stopped || !reasons.delete(reason) || reasons.size > 0 || handle !== undefined) return;
      run();
    },
    stop() {
      stopped = true;
      if (handle !== undefined) clearTimeout(handle);
      handle = undefined;
    },
  };
}
