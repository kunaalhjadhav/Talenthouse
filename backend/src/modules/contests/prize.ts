/** Share of the prize pool for each winning rank (as fractions that add up to 1). */
export function prizeShares(numWinners: number): number[] {
  const n = Math.max(1, Math.floor(numWinners));
  if (n === 1) return [1];
  if (n === 2) return [0.6, 0.4];
  if (n === 3) return [0.5, 0.3, 0.2];
  const rest = 0.2 / (n - 3);
  return [0.4, 0.25, 0.15, ...Array.from({ length: n - 3 }, () => rest)];
}
