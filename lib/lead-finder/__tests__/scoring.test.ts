import { describe, expect, it } from "vitest";
import { computeFlags, parseStoredFlags, scoreBusiness, trueFlags, unknownFlags } from "../scoring";
import { GAP_WEIGHTS, RUBRIC_VERSION } from "../scoring-config";

const strong = {
  canClaim: false,
  hasDescription: true,
  hasHours: true,
  ownerPostsCount: 3,
  website: "https://example.com",
  reviewCount: 120,
  rating: 4.7,
  imageCount: 40,
} as const;

describe("scoreBusiness rubric", () => {
  it.each([
    ["strong listing scores 0", {}, 0, []],
    ["unclaimed → +40", { canClaim: true }, 40, ["gbp_unclaimed"]],
    [
      "claimed but thin (no description, hours or posts) → +40",
      { hasDescription: false, hasHours: false, ownerPostsCount: 0 },
      40,
      ["gbp_thin"],
    ],
    ["claimed with description only is not thin", { hasHours: false, ownerPostsCount: 0 }, 0, []],
    ["empty website → +25", { website: "" }, 25, ["no_website"]],
    ["whitespace website → +25", { website: "   " }, 25, ["no_website"]],
    ["19 reviews → +15", { reviewCount: 19 }, 15, ["few_reviews"]],
    ["20 reviews is enough", { reviewCount: 20 }, 0, []],
    ["rating 3.9 with reviews → +10", { rating: 3.9 }, 10, ["low_rating"]],
    ["rating exactly 4.0 is fine", { rating: 4.0 }, 0, []],
    ["9 photos → +10", { imageCount: 9 }, 10, ["few_photos"]],
    ["10 photos is enough", { imageCount: 10 }, 0, []],
    [
      "0 reviews: few_reviews yes, low_rating no (nothing to judge)",
      { reviewCount: 0, rating: null },
      15,
      ["few_reviews"],
    ],
  ])("%s", (_name, overrides, expectedScore, expectedTrue) => {
    const result = scoreBusiness({ ...strong, ...overrides });
    expect(result.score).toBe(expectedScore);
    expect(trueFlags(result.flags)).toEqual(expectedTrue);
    expect(result.rubricVersion).toBe(RUBRIC_VERSION);
  });

  it("caps the weakest possible listing at 100 and awards the +40 only once", () => {
    const result = scoreBusiness({
      canClaim: true,
      hasDescription: false,
      hasHours: false,
      ownerPostsCount: 0,
      website: "",
      reviewCount: 3,
      rating: 2.5,
      imageCount: 1,
    });
    expect(result.flags.gbp_unclaimed).toBe(true);
    expect(result.flags.gbp_thin).toBe(false);
    expect(result.points.gbp_thin).toBe(0);
    // 40 + 25 + 15 + 10 + 10 = 100
    expect(result.score).toBe(100);
  });

  it("weights match the spec", () => {
    expect(GAP_WEIGHTS).toEqual({
      gbp_unclaimed: 40,
      gbp_thin: 40,
      no_website: 25,
      few_reviews: 15,
      low_rating: 10,
      few_photos: 10,
    });
  });
});

describe("unknown and null edges", () => {
  const allNull = {
    canClaim: null,
    hasDescription: null,
    hasHours: null,
    ownerPostsCount: null,
    website: null,
    reviewCount: null,
    rating: null,
    imageCount: null,
  };

  it("every flag is unknown and scores 0 when the source gave nothing", () => {
    const result = scoreBusiness(allNull);
    expect(result.score).toBe(0);
    expect(unknownFlags(result.flags)).toHaveLength(6);
  });

  it("unknown claim status makes both profile gaps unknown", () => {
    const flags = computeFlags({ ...strong, canClaim: null });
    expect(flags.gbp_unclaimed).toBe("unknown");
    expect(flags.gbp_thin).toBe("unknown");
  });

  it("thin is false as soon as one profile element is known to exist", () => {
    expect(
      computeFlags({ ...strong, hasDescription: true, hasHours: null, ownerPostsCount: null })
        .gbp_thin,
    ).toBe(false);
  });

  it("thin is unknown when known parts are missing but one is unknown", () => {
    expect(
      computeFlags({ ...strong, hasDescription: false, hasHours: false, ownerPostsCount: null })
        .gbp_thin,
    ).toBe("unknown");
  });

  it("unclaimed listings are never also thin", () => {
    expect(
      computeFlags({
        ...strong,
        canClaim: true,
        hasDescription: false,
        hasHours: false,
        ownerPostsCount: 0,
      }).gbp_thin,
    ).toBe(false);
  });

  it("low rating is unknown when the rating is missing but reviews exist", () => {
    expect(computeFlags({ ...strong, rating: null, reviewCount: 5 }).low_rating).toBe("unknown");
  });

  it("low rating is unknown when a low rating exists but the review count is unknown", () => {
    expect(computeFlags({ ...strong, rating: 3.2, reviewCount: null }).low_rating).toBe("unknown");
  });

  it("a good rating is fine even when the review count is unknown", () => {
    expect(computeFlags({ ...strong, rating: 4.8, reviewCount: null }).low_rating).toBe(false);
  });

  it("NaN numbers are treated as unknown", () => {
    const flags = computeFlags({ ...strong, reviewCount: Number.NaN, imageCount: Number.NaN });
    expect(flags.few_reviews).toBe("unknown");
    expect(flags.few_photos).toBe("unknown");
  });

  it("parseStoredFlags turns malformed values into unknown", () => {
    expect(
      parseStoredFlags({ gbp_unclaimed: true, no_website: "yes", few_reviews: false }),
    ).toEqual({
      gbp_unclaimed: true,
      gbp_thin: "unknown",
      no_website: "unknown",
      few_reviews: false,
      low_rating: "unknown",
      few_photos: "unknown",
    });
    expect(parseStoredFlags(null).gbp_unclaimed).toBe("unknown");
  });
});
