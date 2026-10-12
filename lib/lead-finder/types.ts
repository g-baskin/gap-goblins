/**
 * Lead Finder domain types shared by sources, scoring, the scan job and the UI.
 * Pure types: safe to import from client components, the worker and tests.
 */

export const leadSourceIds = ["fixture", "csv-import", "omkar-desktop"] as const;
export type LeadSourceId = (typeof leadSourceIds)[number];

/** A tri-state fact: the source said yes, said no, or did not provide the field. */
export type Tri = boolean | null;

/**
 * One business as every LeadSource returns it. Fields a source cannot provide
 * are `null`, never guessed. Scoring turns `null` into an "unknown" flag.
 */
export interface NormalizedBusiness {
  kgmid: string | null;
  placeId: string | null;
  cid: string | null;
  name: string;
  mainCategory: string | null;
  address: string | null;
  phoneRaw: string | null;
  phoneE164: string | null;
  website: string | null;
  gbpUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  imageCount: number | null;
  canClaim: Tri;
  hasDescription: Tri;
  hasHours: Tri;
  ownerPostsCount: number | null;
  isPermanentlyClosed: Tri;
  isTemporarilyClosed: Tri;
  /** Only when the source itself provides one (omkar paid enrichment). Never discovered. */
  email: string | null;
  /** The source's original record, size-capped before storage. */
  rawPayload: Record<string, unknown> | null;
}

export interface LeadSourceQuery {
  niche: string;
  location: string;
  maxResults: number;
}

export interface LeadSourceFetchContext {
  tenantId: string;
  /** CSV scans: the uploaded file's bytes, already size-checked. */
  file?: { name: string; content: string };
  signal?: AbortSignal;
}

export interface LeadSourceHealth {
  available: boolean;
  /** "verified" when the contract was proven; "unverified" when it is disabled or unproven. */
  contract: "verified" | "unverified";
  message: string;
}

export interface LeadSource {
  id: LeadSourceId;
  label: string;
  health(): Promise<LeadSourceHealth>;
  fetch(query: LeadSourceQuery, context: LeadSourceFetchContext): Promise<NormalizedBusiness[]>;
}

/** Thrown when a source cannot be used. Its message is shown to the user as is. */
export class LeadSourceUnavailableError extends Error {
  constructor(
    readonly sourceId: LeadSourceId,
    message: string,
  ) {
    super(message);
    this.name = "LeadSourceUnavailableError";
  }
}

/** Thrown for bad user input to a source (for example a CSV over the limits). */
export class LeadSourceInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadSourceInputError";
  }
}
