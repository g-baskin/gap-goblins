/** Stable keys for static skeleton placeholder lists. */
export function skeletonKeys(count: number, prefix = "skeleton"): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}
