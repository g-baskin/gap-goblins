/**
 * The Gap Goblins scoring rubric. Change weights or thresholds here only, and
 * bump RUBRIC_VERSION whenever the result for the same input could change:
 * every scan result and report stores the version it was scored with.
 */

export const RUBRIC_VERSION = "2026-10-m1.1";

export const MAX_SCORE = 100;

export const gapFlagKeys = [
  "gbp_unclaimed",
  "gbp_thin",
  "no_website",
  "few_reviews",
  "low_rating",
  "few_photos",
] as const;
export type GapFlagKey = (typeof gapFlagKeys)[number];

export const GAP_WEIGHTS: Record<GapFlagKey, number> = {
  gbp_unclaimed: 40,
  gbp_thin: 40,
  no_website: 25,
  few_reviews: 15,
  low_rating: 10,
  few_photos: 10,
};

export const THRESHOLDS = {
  /** few_reviews when review count is below this. */
  minReviews: 20,
  /** low_rating when rating is below this and there is at least one review. */
  minRating: 4.0,
  /** few_photos when image count is below this. */
  minPhotos: 10,
} as const;

/** Short labels for badges and the score breakdown. */
export const GAP_LABELS: Record<GapFlagKey, string> = {
  gbp_unclaimed: "Unclaimed profile",
  gbp_thin: "Thin profile",
  no_website: "No website",
  few_reviews: "Few reviews",
  low_rating: "Low rating",
  few_photos: "Few photos",
};

/** Default and hard cap for a scan's max results. The cap can be lowered by env. */
export const DEFAULT_MAX_RESULTS = 50;
export const HARD_MAX_RESULTS_CAP = 1000;

export function maxResultsCap(env: Record<string, string | undefined> = process.env): number {
  const raw = Number.parseInt(env.LEAD_SCAN_MAX_RESULTS_CAP ?? "", 10);
  if (!Number.isFinite(raw) || raw < 1) return 200;
  return Math.min(raw, HARD_MAX_RESULTS_CAP);
}
