import { z } from "zod";
import { polygonSchema } from "@/lib/lead-finder/territories/store";
import { TERRITORY_LIMITS } from "@/lib/lead-finder/territories/types";

/** Request body for creating or updating a territory. ZIP outlines are fetched server-side. */
export const territoryBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(TERRITORY_LIMITS.nameLength),
  zipCodes: z
    .array(z.string().regex(/^\d{5}$/, "ZIP codes must be 5 digits"))
    .max(TERRITORY_LIMITS.zips)
    .default([])
    .transform((zips) => [...new Set(zips)].sort()),
  polygons: z.array(polygonSchema).max(TERRITORY_LIMITS.drawnAreas).default([]),
});

export type TerritoryBody = z.infer<typeof territoryBodySchema>;

export function validationError(error: z.ZodError) {
  const first = error.issues[0]?.message ?? "Invalid territory";
  return Response.json(
    { error: first, details: z.flattenError(error) },
    {
      status: 400,
    },
  );
}

/** Per-user limit on saves and ZIP previews, since each can call the Census service. */
export const CENSUS_RATE_LIMIT = { limit: 30, windowMs: 60_000 };
