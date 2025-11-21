/** Time helpers for consistent millisecond calculations. */

export const nowMs = (): number => Date.now();

export const msUntil = (futureMs?: number): number | undefined => {
  if (futureMs === undefined) return undefined;
  return futureMs - nowMs();
};
