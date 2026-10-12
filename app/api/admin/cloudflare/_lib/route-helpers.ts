import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { auth } from "@/lib/auth";
import type {
  CloudflareClientError,
  CloudflareResponseMeta,
  CloudflareResult,
} from "@/lib/cloudflare/types";
import { logger } from "@/lib/logger";

type AdminRole = "admin" | "super_admin";

type AuthResult =
  | { ok: true; role: AdminRole; userId: string }
  | { ok: false; response: NextResponse };

interface PublicCloudflareMeta {
  method: string;
  status: number;
  elapsedMs: number;
  cfRay?: string;
  resultInfo?: CloudflareResponseMeta["resultInfo"];
}

interface PublicCloudflareError {
  kind: CloudflareClientError["kind"];
  message: string;
  status?: number;
  code?: number | string;
  missingEnv?: CloudflareClientError["missingEnv"];
}

export async function requireCloudflareAdmin(options?: {
  mutation?: boolean;
}): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!["admin", "super_admin"].includes(session.user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (options?.mutation && session.user.role !== "super_admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Only super admins can change Cloudflare settings" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, role: session.user.role, userId: session.user.id };
}

function zodIssuesToMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function parseJsonBody<TSchema extends z.ZodType>(
  request: NextRequest,
  schema: TSchema,
): Promise<{ ok: true; data: z.infer<TSchema> } | { ok: false; response: NextResponse }> {
  let body: unknown;

  try {
    const text = await request.text();
    body = text.trim() ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid request body" }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: zodIssuesToMessage(parsed.error) }, { status: 400 }),
    };
  }

  return { ok: true, data: parsed.data };
}

export function parseSearchParams<TSchema extends z.ZodType>(
  request: NextRequest,
  schema: TSchema,
): { ok: true; data: z.infer<TSchema> } | { ok: false; response: NextResponse } {
  const url = new URL(request.url);
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json({ error: zodIssuesToMessage(parsed.error) }, { status: 400 }),
    };
  }

  return { ok: true, data: parsed.data };
}

export function toPublicCloudflareMeta(
  meta: CloudflareResponseMeta | undefined,
): PublicCloudflareMeta | undefined {
  if (!meta) return undefined;

  return {
    method: meta.method,
    status: meta.status,
    elapsedMs: meta.elapsedMs,
    cfRay: meta.cfRay,
    resultInfo: meta.resultInfo,
  };
}

export function toPublicCloudflareError(error: CloudflareClientError): PublicCloudflareError {
  return {
    kind: error.kind,
    message: error.message,
    status: error.status,
    code: error.code,
    missingEnv: error.missingEnv,
  };
}

export function cloudflareFailureResponse(
  result: Extract<CloudflareResult<unknown>, { ok: false }>,
  fallbackMessage: string,
): NextResponse {
  const status = result.error.kind === "configuration" ? 503 : 502;

  logger.warn(fallbackMessage, {
    kind: result.error.kind,
    status: result.error.status,
    code: result.error.code,
  });

  return NextResponse.json(
    {
      error: fallbackMessage,
      cloudflare: {
        error: toPublicCloudflareError(result.error),
        meta: toPublicCloudflareMeta(result.meta),
      },
    },
    { status },
  );
}

export function cloudflareDataResponse<TData>(
  key: string,
  result: CloudflareResult<TData>,
  mapper: (data: TData) => unknown = (data) => data,
): NextResponse {
  if (!result.ok) {
    return cloudflareFailureResponse(result, `Failed to load Cloudflare ${key}`);
  }

  return NextResponse.json({
    [key]: mapper(result.data),
    messages: result.messages,
    meta: toPublicCloudflareMeta(result.meta),
  });
}
