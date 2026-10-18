"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import { Textarea } from "@/components/shadcn/ui/textarea";
import type { TenantBrandingRow } from "@/lib/lead-finder/queries";
import {
  type AvailableTenant,
  NoTenant,
  TenantPicker,
  tenantFetch,
  useLeadFinderTenant,
} from "./shared";

export function BrandingSettings({ tenants }: { tenants: AvailableTenant[] }) {
  const { tenantId, setTenantId } = useLeadFinderTenant(tenants);
  return (
    <div className="mx-auto w-full max-w-[900px] space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/lead-finder">
          <IconArrowLeft className="size-4" /> Lead Finder
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Report branding</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Your logo, colours and call to action on every gap report.
        </p>
      </div>
      <TenantPicker tenants={tenants} tenantId={tenantId} onChange={setTenantId} />
      {tenantId ? (
        <BrandingForm key={tenantId} tenantId={tenantId} />
      ) : (
        <NoTenant tenants={tenants} />
      )}
    </div>
  );
}

type FormState = Record<
  | "companyName"
  | "primaryColor"
  | "accentColor"
  | "ctaHeadline"
  | "ctaBody"
  | "ctaUrl"
  | "contactEmail"
  | "contactPhone"
  | "website"
  | "physicalAddress",
  string
>;

const EMPTY: FormState = {
  companyName: "",
  primaryColor: "#1f2937",
  accentColor: "#7c3aed",
  ctaHeadline: "",
  ctaBody: "",
  ctaUrl: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  physicalAddress: "",
};

function BrandingForm({ tenantId }: { tenantId: string }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [hasLogo, setHasLogo] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    tenantFetch<{ branding: TenantBrandingRow | null }>(tenantId, "/api/lead-finder/branding")
      .then(({ branding }) => {
        if (!branding) return;
        setForm({
          companyName: branding.companyName ?? "",
          primaryColor: branding.primaryColor ?? EMPTY.primaryColor,
          accentColor: branding.accentColor ?? EMPTY.accentColor,
          ctaHeadline: branding.ctaHeadline ?? "",
          ctaBody: branding.ctaBody ?? "",
          ctaUrl: branding.ctaUrl ?? "",
          contactEmail: branding.contactEmail ?? "",
          contactPhone: branding.contactPhone ?? "",
          website: branding.website ?? "",
          physicalAddress: branding.physicalAddress ?? "",
        });
        setHasLogo(!!branding.logoStorageKey);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load branding"));
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await tenantFetch(tenantId, "/api/lead-finder/branding", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      toast.success("Branding saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Logo must be 1 MB or smaller");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      await tenantFetch(tenantId, "/api/lead-finder/branding/logo", { method: "POST", body });
      setHasLogo(true);
      setLogoVersion((v) => v + 1);
      toast.success("Logo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeLogo() {
    try {
      await tenantFetch(tenantId, "/api/lead-finder/branding/logo", { method: "DELETE" });
      setHasLogo(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove the logo");
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>PNG, JPEG or WebP logo, up to 1 MB. SVG isn't accepted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-40 items-center justify-center rounded-md border bg-white p-2">
              {hasLogo ? (
                // biome-ignore lint/performance/noImgElement: tenant-checked API image, not a static asset
                <img
                  src={`/api/lead-finder/branding/logo?tenantId=${encodeURIComponent(tenantId)}&v=${logoVersion}`}
                  alt="Logo"
                  className="max-h-12 max-w-36 object-contain"
                />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(e) => uploadLogo(e.target.files?.[0])}
              />
              {hasLogo ? (
                <Button type="button" variant="ghost" size="sm" onClick={removeLogo}>
                  Remove logo
                </Button>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-company">Company name</Label>
            <Input
              id="b-company"
              value={form.companyName}
              onChange={set("companyName")}
              maxLength={120}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["primaryColor", "accentColor"] as const).map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`b-${key}`}>
                  {key === "primaryColor" ? "Primary colour" : "Accent colour"}
                </Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    aria-label={`${key} picker`}
                    value={/^#[0-9a-f]{6}$/i.test(form[key]) ? form[key] : "#000000"}
                    onChange={set(key)}
                    className="h-9 w-12 cursor-pointer rounded border"
                  />
                  <Input
                    id={`b-${key}`}
                    value={form[key]}
                    onChange={set(key)}
                    placeholder="#1f2937"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call to action</CardTitle>
          <CardDescription>Shown at the end of every report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="b-cta-h">Headline</Label>
            <Input
              id="b-cta-h"
              value={form.ctaHeadline}
              onChange={set("ctaHeadline")}
              placeholder="Want help closing these gaps?"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-cta-b">Message</Label>
            <Textarea
              id="b-cta-b"
              value={form.ctaBody}
              onChange={set("ctaBody")}
              maxLength={600}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-cta-u">Button link</Label>
            <Input
              id="b-cta-u"
              value={form.ctaUrl}
              onChange={set("ctaUrl")}
              placeholder="https://yourdomain.com/book"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="b-email">Email</Label>
            <Input
              id="b-email"
              type="email"
              value={form.contactEmail}
              onChange={set("contactEmail")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-phone">Phone</Label>
            <Input id="b-phone" value={form.contactPhone} onChange={set("contactPhone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-web">Website</Label>
            <Input
              id="b-web"
              value={form.website}
              onChange={set("website")}
              placeholder="https://yourdomain.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-addr">Physical address</Label>
            <Input id="b-addr" value={form.physicalAddress} onChange={set("physicalAddress")} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save branding"}
      </Button>
    </form>
  );
}
