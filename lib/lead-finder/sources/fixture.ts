/**
 * Fixture lead source: deterministic sample businesses for tests and local dev.
 * Same niche + location always returns the same businesses (same KGMIDs), so a
 * re-scan exercises dedupe. Phone numbers use 555-0100..0199, which NANP
 * reserves for fiction. Clearly labelled as sample data in the UI.
 */
import { toUsE164 } from "../phone";
import type { LeadSource, LeadSourceQuery, NormalizedBusiness } from "../types";

export const FIXTURE_POOL_SIZE = 60;

/** FNV-1a 32-bit: a small, stable hash so fixture output never changes between runs. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PREFIXES = [
  "Blue Ridge",
  "Rappahannock",
  "Colonial",
  "Riverside",
  "Liberty",
  "Old Town",
  "Patriot",
  "Summit",
  "Keystone",
  "Hometown",
  "Precision",
  "Reliable",
  "Family",
  "Heritage",
  "Northside",
];
const SUFFIXES = ["Pros", "& Sons", "Co.", "Services", "Experts", "Group", "Solutions", "Works"];
const STREETS = [
  "Princess Anne St",
  "Caroline St",
  "Jefferson Davis Hwy",
  "Plank Rd",
  "Lafayette Blvd",
  "Route 3",
];

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function nicheWord(niche: string): string {
  const cleaned = niche.trim() || "Local Business";
  // "plumbers" → "Plumbing"-ish label without guessing grammar: keep the user's word.
  return titleCase(cleaned.replace(/s$/i, ""));
}

export function fixtureBusinesses(
  query: Pick<LeadSourceQuery, "niche" | "location">,
): NormalizedBusiness[] {
  const key = `${query.niche.trim().toLowerCase()}|${query.location.trim().toLowerCase()}`;
  const seed = fnv1a(key);
  const random = rng(seed);
  const word = nicheWord(query.niche);
  const city = query.location.trim() || "Fredericksburg, VA";
  const results: NormalizedBusiness[] = [];

  for (let i = 0; i < FIXTURE_POOL_SIZE; i++) {
    const r = () => random();
    const name = `${PREFIXES[i % PREFIXES.length]} ${word} ${SUFFIXES[Math.floor(r() * SUFFIXES.length)]}`;
    const id = (fnv1a(`${key}#${i}`) >>> 0).toString(36);
    const phoneLine = String(100 + (i % 100)).padStart(4, "0");
    const phoneRaw = `(540) 555-${phoneLine}`;

    // A spread of profiles from very weak to strong, plus some unknown fields.
    const profile = i % 6;
    const canClaim = profile === 0 ? true : profile === 5 && i % 12 === 5 ? null : false;
    const thin = profile === 1;
    const reviewCount = profile <= 1 ? Math.floor(r() * 12) : 15 + Math.floor(r() * 300);
    const rating = reviewCount === 0 ? null : Math.round((3 + r() * 2) * 10) / 10;
    const imageCount =
      i % 7 === 3 ? null : profile <= 2 ? Math.floor(r() * 9) : 8 + Math.floor(r() * 80);
    const hasWebsite = profile >= 3 || (profile === 2 && i % 4 === 0);
    const permanentlyClosed = i % 23 === 11;

    results.push({
      kgmid: `/g/fx${id}`,
      placeId: i % 9 === 4 ? null : `FIXTURE_${id.toUpperCase()}`,
      cid: String(fnv1a(`cid:${key}#${i}`)),
      name,
      mainCategory: word,
      address: `${100 + i * 7} ${STREETS[i % STREETS.length]}, ${city}`,
      phoneRaw,
      phoneE164: toUsE164(phoneRaw),
      website: hasWebsite ? `https://www.example.com/${id}` : "",
      gbpUrl: `https://www.google.com/maps/place/?q=place_id:FIXTURE_${id.toUpperCase()}`,
      rating,
      reviewCount,
      imageCount,
      canClaim,
      hasDescription: thin ? false : canClaim === null ? null : r() > 0.3,
      hasHours: thin ? false : r() > 0.2,
      ownerPostsCount: thin ? 0 : Math.floor(r() * 4),
      isPermanentlyClosed: permanentlyClosed,
      isTemporarilyClosed: false,
      email: null,
      rawPayload: { fixture: true, index: i },
    });
  }
  return results;
}

export const fixtureSource: LeadSource = {
  id: "fixture",
  label: "Sample data (fixture)",
  async health() {
    return { available: true, contract: "verified", message: "Deterministic sample data" };
  },
  async fetch(query) {
    // Return the whole pool; the scan runner skips closed businesses and then
    // applies max_results, so a scan of 50 yields up to 50 open businesses.
    return fixtureBusinesses(query);
  },
};
