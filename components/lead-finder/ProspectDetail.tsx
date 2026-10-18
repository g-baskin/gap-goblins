"use client";

import { IconArrowLeft, IconDownload, IconFileTypePdf } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import type { BusinessDetail } from "@/lib/lead-finder/queries";
import { GAP_WEIGHTS, gapFlagKeys, RUBRIC_VERSION } from "@/lib/lead-finder/scoring-config";
import {
  type AvailableTenant,
  FlagStatus,
  formatDate,
  GapBadges,
  NoTenant,
  ScorePill,
  TenantPicker,
  tenantFetch,
  useLeadFinderTenant,
} from "./shared";

type DetailResponse = Omit<BusinessDetail, "business"> & {
  business: Omit<BusinessDetail["business"], "rawPayload">;
};

export function ProspectDetail({
  tenants,
  businessId,
}: {
  tenants: AvailableTenant[];
  businessId: string;
}) {
  const { tenantId, setTenantId } = useLeadFinderTenant(tenants);
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/lead-finder">
          <IconArrowLeft className="size-4" /> Lead Finder
        </Link>
      </Button>
      <TenantPicker tenants={tenants} tenantId={tenantId} onChange={setTenantId} />
      {tenantId ? (
        <ProspectView key={tenantId} tenantId={tenantId} businessId={businessId} />
      ) : (
        <NoTenant tenants={tenants} />
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function tri(value: boolean | null) {
  return value === null ? "Not checked" : value ? "Yes" : "No";
}

function ProspectView({ tenantId, businessId }: { tenantId: string; businessId: string }) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [waitingSince, setWaitingSince] = useState<number | null>(null);

  const load = useCallback(() => {
    tenantFetch<DetailResponse>(tenantId, `/api/lead-finder/businesses/${businessId}`)
      .then((body) => {
        setData(body);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the prospect"));
  }, [tenantId, businessId]);

  useEffect(() => {
    load();
  }, [load]);

  // After "Generate PDF", poll every 2s until a new report appears (max 2 minutes).
  // An interval (not a one-shot timeout) so polling continues while the count is unchanged.
  const reportCount = data?.reports.length ?? 0;
  const [countAtRequest, setCountAtRequest] = useState(0);
  useEffect(() => {
    if (waitingSince === null) return;
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [waitingSince, load]);
  useEffect(() => {
    if (waitingSince === null) return;
    if (reportCount > countAtRequest) {
      setWaitingSince(null);
      toast.success("PDF ready");
      return;
    }
    const remaining = 120_000 - (Date.now() - waitingSince);
    const timer = setTimeout(
      () => {
        setWaitingSince(null);
        toast.error("The PDF is taking longer than expected. Is the worker running?");
      },
      Math.max(remaining, 0),
    );
    return () => clearTimeout(timer);
  }, [waitingSince, reportCount, countAtRequest]);

  // Report preview: fetched as HTML and shown in a sandboxed srcdoc iframe. The app
  // forbids framing its own routes (X-Frame-Options DENY, frame-ancestors 'none'),
  // and srcdoc keeps that protection intact. sandbox="" disables scripts entirely.
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const latestResultId = data?.latestResult?.id ?? null;
  useEffect(() => {
    if (!latestResultId) return;
    let cancelled = false;
    fetch(`/api/lead-finder/businesses/${businessId}/report`, {
      headers: { "x-tenant-id": tenantId },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Preview failed (${response.status})`);
        return response.text();
      })
      .then((html) => {
        if (!cancelled) {
          setPreviewHtml(html);
          setPreviewError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setPreviewError(e instanceof Error ? e.message : "Preview failed");
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, businessId, latestResultId]);

  async function generate() {
    setGenerating(true);
    try {
      await tenantFetch(tenantId, `/api/lead-finder/businesses/${businessId}/reports`, {
        method: "POST",
      });
      setCountAtRequest(reportCount);
      setWaitingSince(Date.now());
      toast.message("Generating the PDF…");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the PDF");
    } finally {
      setGenerating(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const b = data.business;
  const latest = data.latestResult;
  const tenantQuery = `tenantId=${encodeURIComponent(tenantId)}`;
  const previewUrl = `/api/lead-finder/businesses/${businessId}/report?${tenantQuery}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold md:text-3xl">{b.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[b.mainCategory, b.address].filter(Boolean).join(" · ")}
          </p>
          {latest ? (
            <div className="mt-2">
              <GapBadges flags={latest.flags} />
            </div>
          ) : null}
        </div>
        {latest ? (
          <div className="flex items-center gap-3">
            <ScorePill score={latest.score} className="px-3 py-1 text-xl" />
            <Button onClick={generate} disabled={generating || waitingSince !== null}>
              <IconFileTypePdf className="size-4" />
              {waitingSince !== null ? "Generating…" : "Generate PDF"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Score breakdown</CardTitle>
              <CardDescription>
                Rubric {latest?.rubricVersion ?? RUBRIC_VERSION}. "Not checked" means the source
                didn't include that data; it scores 0.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {latest ? (
                <>
                  {gapFlagKeys.map((key) => (
                    <FlagStatus
                      key={key}
                      flagKey={key}
                      value={latest.flags[key]}
                      points={latest.flags[key] === true ? GAP_WEIGHTS[key] : 0}
                    />
                  ))}
                  <div className="flex justify-between pt-3 text-sm font-semibold">
                    <span>Gap Score</span>
                    <span className="tabular-nums">{latest.score} / 100</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Not scored yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business data</CardTitle>
              <CardDescription>
                From the public listing, last seen in scan {formatDate(latest?.createdAt)}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Fact label="Phone">{b.phoneRaw ?? b.phoneE164 ?? "—"}</Fact>
              <Fact label="Website">
                {b.website ? (
                  <a
                    className="break-all text-primary hover:underline"
                    href={b.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {b.website}
                  </a>
                ) : b.website === "" ? (
                  "None"
                ) : (
                  "Not checked"
                )}
              </Fact>
              <Fact label="Google Maps">
                {b.gbpUrl ? (
                  <a
                    className="text-primary hover:underline"
                    href={b.gbpUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    Open listing
                  </a>
                ) : (
                  "—"
                )}
              </Fact>
              <Fact label="Rating">{b.rating?.toFixed(1) ?? "—"}</Fact>
              <Fact label="Reviews">{b.reviewCount ?? "—"}</Fact>
              <Fact label="Photos">{b.imageCount ?? "Not checked"}</Fact>
              <Fact label="Claimable (unclaimed)">{tri(b.canClaim)}</Fact>
              <Fact label="Description">{tri(b.hasDescription)}</Fact>
              <Fact label="Hours">{tri(b.hasHours)}</Fact>
              <Fact label="Owner posts">{b.ownerPostsCount ?? "Not checked"}</Fact>
              {b.email ? <Fact label="Email (from source)">{b.email}</Fact> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CRM</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Fact label="Contact">
                {data.contact ? (
                  <Link className="text-primary hover:underline" href="/admin/crm/leads">
                    {data.contact.name ?? "Contact"}
                  </Link>
                ) : (
                  "—"
                )}
              </Fact>
              <Fact label="Deal">
                {data.deal ? (
                  <Link className="text-primary hover:underline" href="/admin/crm/pipeline">
                    {data.deal.stageName ?? "Open deal"}
                  </Link>
                ) : (
                  "—"
                )}
              </Fact>
              <Fact label="Scans">{data.history.length}</Fact>
              {data.history.length > 1 ? (
                <p className="text-xs text-muted-foreground">
                  Score history:{" "}
                  {data.history
                    .map((h) => h.score)
                    .reverse()
                    .join(" → ")}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>PDF reports</CardTitle>
            </CardHeader>
            <CardContent>
              {data.reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No PDFs yet. Use "Generate PDF".</p>
              ) : (
                <ul className="space-y-2">
                  {data.reports.map((report) => (
                    <li key={report.id} className="flex items-center justify-between text-sm">
                      <span>{formatDate(report.generatedAt)}</span>
                      <Button asChild size="sm" variant="outline">
                        <a href={`/api/lead-finder/reports/${report.id}/download?${tenantQuery}`}>
                          <IconDownload className="size-4" /> Download
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Report preview</CardTitle>
            <CardDescription>
              Exactly what the PDF contains. Edit branding under{" "}
              <Link className="text-primary hover:underline" href="/admin/lead-finder/branding">
                Report branding
              </Link>
              .{" "}
              {latest ? (
                <a
                  className="text-primary hover:underline"
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in new tab
                </a>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latest ? (
              previewHtml ? (
                <iframe
                  title="Gap report preview"
                  srcDoc={previewHtml}
                  sandbox=""
                  className="h-[1100px] w-full rounded-md border bg-white"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {previewError ?? "Loading preview…"}
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">No scan result yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
