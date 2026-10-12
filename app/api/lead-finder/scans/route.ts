import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { tenantStoragePrefix } from "@/lib/lead-finder/db";
import { createScan, listScans, markScanFailed } from "@/lib/lead-finder/queries";
import { importBusinesses } from "@/lib/lead-finder/sources/csv-import";
import { getLeadSource } from "@/lib/lead-finder/sources/index";
import { LeadSourceInputError, leadSourceIds } from "@/lib/lead-finder/types";
import { logger } from "@/lib/logger";
import { enqueueLeadScan } from "@/lib/queue";
import { requireLeadFinderTenant, webStorage } from "../_lib";

const scanSchema = z.object({
  niche: z.string().trim().min(1, "Niche is required").max(200),
  location: z.string().trim().min(1, "Location is required").max(200),
  maxResults: z.coerce.number().int().min(1).max(1000).optional(),
  source: z.enum(leadSourceIds),
});

export async function GET(request: Request) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const scans = await listScans(db, authResult.tenant.tenantId);
  return Response.json({ scans });
}

export async function POST(request: Request) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const tenantId = authResult.tenant.tenantId;

  const isMultipart = request.headers.get("content-type")?.includes("multipart/form-data");
  let fields: Record<string, unknown>;
  let file: File | null = null;
  try {
    if (isMultipart) {
      const form = await request.formData();
      fields = Object.fromEntries(
        ["niche", "location", "maxResults", "source"].map((key) => [
          key,
          form.get(key) ?? undefined,
        ]),
      );
      const upload = form.get("file");
      file = upload instanceof File ? upload : null;
    } else {
      fields = await request.json();
    }
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = scanSchema.safeParse(fields);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const source = getLeadSource(input.source);
  if (!source) return Response.json({ error: "Unknown source" }, { status: 400 });

  let sourceFileKey: string | null = null;
  let sourceFileName: string | null = null;
  if (input.source === "csv-import") {
    if (!file) return Response.json({ error: "Upload a CSV or JSON file" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: "File is larger than 5 MB" }, { status: 400 });
    }
    const content = await file.text();
    try {
      const preview = importBusinesses({ name: file.name, content });
      if (preview.businesses.length === 0) {
        return Response.json({ error: "No usable rows found in the file" }, { status: 400 });
      }
    } catch (error) {
      if (error instanceof LeadSourceInputError) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
    const ext = /\.json$/i.test(file.name) ? "json" : "csv";
    sourceFileKey = `${tenantStoragePrefix(tenantId)}lead-imports/${randomUUID()}.${ext}`;
    sourceFileName = file.name;
    await webStorage.upload(
      sourceFileKey,
      Buffer.from(content, "utf8"),
      ext === "json" ? "application/json" : "text/csv",
    );
  } else {
    const health = await source.health();
    if (!health.available) return Response.json({ error: health.message }, { status: 409 });
  }

  const scan = await createScan(db, tenantId, {
    ...input,
    sourceFileKey,
    sourceFileName,
    createdBy: authResult.userId,
  });
  try {
    await enqueueLeadScan({ scanId: scan.id, tenantId });
  } catch (error) {
    logger.error("Failed to enqueue lead scan", error);
    await markScanFailed(
      db,
      tenantId,
      scan.id,
      "Could not queue the scan. Is the worker database reachable?",
    );
    return Response.json({ error: "Could not queue the scan" }, { status: 503 });
  }
  return Response.json({ scan }, { status: 201 });
}
