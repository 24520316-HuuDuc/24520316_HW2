export function createAntiDriftTimer(
  durationMs: number,
  onTick: (remainingMs: number) => void,
  onComplete: () => void = () => {}
): () => void {
  const safeDuration = Number.isFinite(durationMs)
    ? Math.max(0, durationMs)
    : 0;

  const targetTime = Date.now() + safeDuration;
  let frameId: number | null = null;
  let stopped = false;

  function tick(): void {
    if (stopped) return;

    const remainingMs = Math.max(0, targetTime - Date.now());

    onTick(remainingMs);

    if (remainingMs === 0) {
      stopped = true;
      onComplete();
      return;
    }

    frameId = requestAnimationFrame(tick);
  }

  tick();

  return () => {
    stopped = true;

    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };
}