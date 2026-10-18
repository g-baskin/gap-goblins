import {
  GAP_WEIGHTS,
  type GapFlagKey,
  gapFlagKeys,
  MAX_SCORE,
  RUBRIC_VERSION,
  THRESHOLDS,
} from "./scoring-config";
import type { NormalizedBusiness } from "./types";

/** true = the gap exists, false = checked and fine, "unknown" = the source lacked the data. */
export type FlagValue = boolean | "unknown";
export type GapFlags = Record<GapFlagKey, FlagValue>;

export interface ScoreResult {
  score: number;
  flags: GapFlags;
  /** Points actually awarded per flag (0 for false and unknown). */
  points: Record<GapFlagKey, number>;
  rubricVersion: string;
}

type ScoringInput = Pick<
  NormalizedBusiness,
  | "canClaim"
  | "hasDescription"
  | "hasHours"
  | "ownerPostsCount"
  | "website"
  | "reviewCount"
  | "rating"
  | "imageCount"
>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * gbp_thin: the profile is claimed (CAN_CLAIM false) but has no description,
 * no hours and no owner posts. Any one of those present means not thin; it is
 * "unknown" only when claim status is unknown or a missing field leaves it open.
 */
function thinFlag(input: ScoringInput): FlagValue {
  if (input.canClaim === null) return "unknown";
  if (input.canClaim === true) return false; // Unclaimed is its own gap; never both.
  const parts: FlagValue[] = [
    input.hasDescription === null ? "unknown" : !input.hasDescription,
    input.hasHours === null ? "unknown" : !input.hasHours,
    input.ownerPostsCount === null ? "unknown" : input.ownerPostsCount <= 0,
  ];
  if (parts.includes(false)) return false;
  if (parts.includes("unknown")) return "unknown";
  return true;
}

function websiteFlag(website: string | null): FlagValue {
  if (website === null) return "unknown";
  return website.trim() === "";
}

export function computeFlags(input: ScoringInput): GapFlags {
  const reviews = isFiniteNumber(input.reviewCount) ? input.reviewCount : null;
  const rating = isFiniteNumber(input.rating) ? input.rating : null;
  const images = isFiniteNumber(input.imageCount) ? input.imageCount : null;

  let lowRating: FlagValue;
  if (reviews === 0)
    lowRating = false; // No reviews means no rating to judge.
  else if (rating !== null && rating >= THRESHOLDS.minRating) lowRating = false;
  else if (rating === null || reviews === null) lowRating = "unknown";
  else lowRating = true; // rating below the threshold with at least one review

  return {
    gbp_unclaimed: input.canClaim === null ? "unknown" : input.canClaim === true,
    gbp_thin: thinFlag(input),
    no_website: websiteFlag(input.website),
    few_reviews: reviews === null ? "unknown" : reviews < THRESHOLDS.minReviews,
    low_rating: lowRating,
    few_photos: images === null ? "unknown" : images < THRESHOLDS.minPhotos,
  };
}

export function scoreBusiness(input: ScoringInput): ScoreResult {
  const flags = computeFlags(input);
  const points = Object.fromEntries(gapFlagKeys.map((key) => [key, 0])) as Record<
    GapFlagKey,
    number
  >;
  for (const key of gapFlagKeys) {
    if (flags[key] === true) points[key] = GAP_WEIGHTS[key];
  }
  // Defensive: the two profile gaps are mutually exclusive, so +40 counts once.
  if (points.gbp_unclaimed > 0 && points.gbp_thin > 0) points.gbp_thin = 0;
  const total = gapFlagKeys.reduce((sum, key) => sum + points[key], 0);
  return { score: Math.min(MAX_SCORE, total), flags, points, rubricVersion: RUBRIC_VERSION };
}

export function trueFlags(flags: GapFlags): GapFlagKey[] {
  return gapFlagKeys.filter((key) => flags[key] === true);
}

export function unknownFlags(flags: GapFlags): GapFlagKey[] {
  return gapFlagKeys.filter((key) => flags[key] === "unknown");
}

/** Parses flags read back from jsonb, treating anything malformed as unknown. */
export function parseStoredFlags(value: unknown): GapFlags {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return Object.fromEntries(
    gapFlagKeys.map((key) => {
      const v = source[key];
      return [key, v === true || v === false ? v : "unknown"];
    }),
  ) as GapFlags;
}
