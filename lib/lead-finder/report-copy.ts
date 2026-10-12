/**
 * Deterministic gap report copy. No LLM, no guarantees, no invented statistics,
 * no named competitors. Every sentence describes what the public listing shows
 * and a practical fix. Facts are interpolated only from the business's own data.
 *
 * Wording rules (enforced by tests in __tests__/report.test.ts):
 * - never "guarantee", "will rank", "#1", "100%", or a percentage claim
 * - competitors may be mentioned only as a possibility ("may appear ahead of you")
 */
import { type GapFlagKey, THRESHOLDS } from "./scoring-config";

export interface GapFacts {
  reviewCount: number | null;
  rating: number | null;
  imageCount: number | null;
}

export interface GapSection {
  key: GapFlagKey;
  title: string;
  finding: string;
  whyItMatters: string;
  fix: string;
}

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

export function gapSection(key: GapFlagKey, facts: GapFacts): GapSection {
  switch (key) {
    case "gbp_unclaimed":
      return {
        key,
        title: "Your Google Business Profile is not claimed",
        finding:
          "Google shows a claim option on this listing, which means no owner has verified it yet.",
        whyItMatters:
          "Until it is claimed, you can't add photos, reply to reviews, post updates or correct your details, and anyone can suggest edits to it.",
        fix: "Claim and verify the profile at business.google.com, then check your name, address, phone, hours and categories.",
      };
    case "gbp_thin":
      return {
        key,
        title: "Your Google Business Profile is sparse",
        finding:
          "The listing is claimed but has no business description, no opening hours and no owner posts.",
        whyItMatters:
          "Searchers compare listings side by side. A sparse profile gives them little reason to choose you, and competitors with fuller profiles may appear ahead of you.",
        fix: "Add a clear description of your services and service area, set your opening hours, and post a short update or offer every couple of weeks.",
      };
    case "no_website":
      return {
        key,
        title: "No website is linked to your listing",
        finding: "The listing has no website link.",
        whyItMatters:
          "Many customers want to check services, prices or credentials before they call. Without a website they have nowhere to go but the next listing.",
        fix: "Link a website to your profile. Even a simple one-page site with your services, service area, photos and a call button helps.",
      };
    case "few_reviews": {
      const count = facts.reviewCount ?? 0;
      return {
        key,
        title: "Few Google reviews",
        finding: `The listing has ${plural(count, "review", "reviews")} (we flag fewer than ${THRESHOLDS.minReviews}).`,
        whyItMatters:
          "Reviews are one of the first things people read when choosing a local business, and a short review history can make a good business look unproven.",
        fix: "Ask happy customers for a review right after each job, with a direct review link by text or email, and reply to every review you get.",
      };
    }
    case "low_rating": {
      const rating = facts.rating ?? 0;
      return {
        key,
        title: "Your average rating is below 4.0",
        finding: `The listing shows an average rating of ${rating.toFixed(1)} out of 5.`,
        whyItMatters:
          "Many people filter or skim by star rating, so a rating under 4.0 can cost you calls before anyone reads the details.",
        fix: "Reply politely to critical reviews, fix the recurring issues they mention, and keep asking satisfied customers to share their experience.",
      };
    }
    case "few_photos": {
      const count = facts.imageCount ?? 0;
      return {
        key,
        title: "Few photos on your listing",
        finding: `The listing has ${plural(count, "photo", "photos")} (we flag fewer than ${THRESHOLDS.minPhotos}).`,
        whyItMatters:
          "Photos show customers your work, your team and your premises. Listings with few photos give them less to trust.",
        fix: "Upload recent photos of your work, team, vehicles and storefront, and add a few new ones every month.",
      };
    }
  }
}

/** Shown in the "Not checked" list for unknown flags. */
export const NOT_CHECKED_LABELS: Record<GapFlagKey, string> = {
  gbp_unclaimed: "Whether the Google Business Profile is claimed",
  gbp_thin: "Profile completeness (description, hours, owner posts)",
  no_website: "Whether a website is linked",
  few_reviews: "Number of reviews",
  low_rating: "Average rating",
  few_photos: "Number of photos",
};

export function scoreSummary(score: number, gapCount: number): { label: string; sentence: string } {
  if (gapCount === 0) {
    return {
      label: "No gaps found",
      sentence:
        'We didn\'t find any of the gaps we check for on this listing. Nice work. The items under "Not checked" are worth a look.',
    };
  }
  const label =
    score >= 60 ? "Big opportunity" : score >= 30 ? "Room to improve" : "A few quick wins";
  return {
    label,
    sentence: `We found ${plural(gapCount, "gap", "gaps")} in this business's public Google listing. Each one below comes with a practical fix.`,
  };
}

export const SCORE_EXPLAINER =
  "The Gap Score runs from 0 to 100. Higher means more gaps in the public listing, and more room to grow.";

export function captureLine(captureDate: Date): string {
  const date = captureDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return `Based on the public Google Maps listing as of ${date}.`;
}

export const DISCLAIMER =
  "This report reflects publicly visible information at the time it was captured and may have changed since. It is an independent review, not affiliated with or endorsed by Google. It is not a guarantee of any ranking or result.";

export const DEFAULT_CTA = {
  headline: "Want help closing these gaps?",
  body: "We help local businesses fix exactly these issues. Get in touch for a free, no-obligation walkthrough of this report.",
};
