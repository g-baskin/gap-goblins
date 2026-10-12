"use client";

import { IconDeviceFloppy, IconLoader2, IconUpload, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import { Separator } from "@/components/shadcn/ui/separator";
import { useSiteSettings } from "@/lib/site-settings-context";

type AddressFormat = "us" | "international";

type BusinessSettings = {
  businessName: string;
  abn: string;
  phone: string;
  email: string;
  website: string;
  addressFormat: AddressFormat;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressPostcode: string;
  addressCountry: string;
  logoUrl: string;
};

const EMPTY: BusinessSettings = {
  businessName: "",
  abn: "",
  phone: "",
  email: "",
  website: "",
  addressFormat: "us",
  addressStreet: "",
  addressCity: "",
  addressState: "",
  addressPostcode: "",
  addressCountry: "United States",
  logoUrl: "",
};

const getAddressFormat = (country: unknown): AddressFormat =>
  typeof country === "string" && country.trim().toLowerCase() !== "united states"
    ? "international"
    : "us";

const addressCopy = {
  us: {
    helper: "Use the United States address format.",
    stateLabel: "State",
    statePlaceholder: "CA",
    postcodeLabel: "ZIP code",
    postcodePlaceholder: "90210",
    cityPlaceholder: "Los Angeles",
    countryPlaceholder: "United States",
  },
  international: {
    helper: "Use a non-American address format.",
    stateLabel: "State / province / region",
    statePlaceholder: "Ontario",
    postcodeLabel: "Postal code",
    postcodePlaceholder: "M5V 2T6",
    cityPlaceholder: "Toronto",
    countryPlaceholder: "Canada",
  },
} satisfies Record<
  AddressFormat,
  {
    helper: string;
    stateLabel: string;
    statePlaceholder: string;
    postcodeLabel: string;
    postcodePlaceholder: string;
    cityPlaceholder: string;
    countryPlaceholder: string;
  }
>;

export default function BusinessSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings>(EMPTY);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refresh } = useSiteSettings();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/site-settings");
        const data = await res.json();
        if (res.ok && data.settings) {
          const s = data.settings;
          const addressCountry = s.addressCountry ?? "United States";
          setSettings({
            businessName: s.businessName ?? "",
            abn: s.abn ?? "",
            phone: s.phone ?? "",
            email: s.email ?? "",
            website: s.website ?? "",
            addressFormat: getAddressFormat(addressCountry),
            addressStreet: s.addressStreet ?? "",
            addressCity: s.addressCity ?? "",
            addressState: s.addressState ?? "",
            addressPostcode: s.addressPostcode ?? "",
            addressCountry,
            logoUrl: s.logoUrl ?? "",
          });
        }
      } catch (err) {
        console.error("Failed to load business settings:", err);
      }
    };
    load();
  }, []);

  const addressLabels = addressCopy[settings.addressFormat];

  const set = (field: keyof BusinessSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings((prev) => ({ ...prev, [field]: e.target.value }));

  const setAddressFormat = (value: string) => {
    const addressFormat: AddressFormat = value === "international" ? "international" : "us";

    setSettings((prev) => ({
      ...prev,
      addressFormat,
      addressCountry:
        addressFormat === "us"
          ? "United States"
          : prev.addressCountry === "United States"
            ? ""
            : prev.addressCountry,
    }));
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload/logo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to upload logo");
        return;
      }

      setSettings((prev) => ({ ...prev, logoUrl: data.url }));
      refresh();
      toast.success("Logo uploaded");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    setIsUploading(true);
    try {
      const res = await fetch("/api/admin/upload/logo", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to remove logo");
        return;
      }
      setSettings((prev) => ({ ...prev, logoUrl: "" }));
      refresh();
      toast.success("Logo removed");
    } catch {
      toast.error("Failed to remove logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: settings.businessName,
          abn: settings.abn,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          addressStreet: settings.addressStreet,
          addressCity: settings.addressCity,
          addressState: settings.addressState,
          addressPostcode: settings.addressPostcode,
          addressCountry: settings.addressCountry,
          logoUrl: settings.logoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Business settings saved");
      refresh();
    } catch {
      toast.error("Failed to save business settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
          <CardDescription>
            Configure your business name, logo, contact details, and address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>Business Logo</Label>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted ring-1 ring-foreground/10 overflow-hidden">
                {settings.logoUrl ? (
                  /* biome-ignore lint/performance/noImgElement: logo preview from upload URL */
                  <img
                    src={settings.logoUrl}
                    alt="Business logo"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground text-center leading-tight px-1">
                    No logo
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <IconUpload className="w-4 h-4 mr-2" />
                    )}
                    Upload Logo
                  </Button>
                  {settings.logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={isUploading}
                    >
                      <IconX className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WebP, or SVG. Max 2MB. Appears in the sidebar and sheet headers.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>

          <Separator />

          {/* Business Details */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={settings.businessName}
                onChange={set("businessName")}
                placeholder="Acme Pty Ltd"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="abn">ABN</Label>
                <Input
                  id="abn"
                  value={settings.abn}
                  onChange={set("abn")}
                  placeholder="12 345 678 901"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={settings.phone}
                  onChange={set("phone")}
                  placeholder="+61 4XX XXX XXX"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bizEmail">Email</Label>
                <Input
                  id="bizEmail"
                  type="email"
                  value={settings.email}
                  onChange={set("email")}
                  placeholder="hello@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={settings.website}
                  onChange={set("website")}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Address */}
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Address</p>
              <p className="text-sm text-muted-foreground">{addressLabels.helper}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addressFormat">Address type</Label>
              <Select value={settings.addressFormat} onValueChange={setAddressFormat}>
                <SelectTrigger id="addressFormat" className="w-full">
                  <SelectValue placeholder="Choose address type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">American address</SelectItem>
                  <SelectItem value="international">Non-American address</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addressStreet">Street address</Label>
              <Input
                id="addressStreet"
                value={settings.addressStreet}
                onChange={set("addressStreet")}
                placeholder="123 Example St"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="addressCity">City</Label>
                <Input
                  id="addressCity"
                  value={settings.addressCity}
                  onChange={set("addressCity")}
                  placeholder={addressLabels.cityPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addressState">{addressLabels.stateLabel}</Label>
                <Input
                  id="addressState"
                  value={settings.addressState}
                  onChange={set("addressState")}
                  placeholder={addressLabels.statePlaceholder}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="addressPostcode">{addressLabels.postcodeLabel}</Label>
                <Input
                  id="addressPostcode"
                  value={settings.addressPostcode}
                  onChange={set("addressPostcode")}
                  placeholder={addressLabels.postcodePlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addressCountry">Country</Label>
                <Input
                  id="addressCountry"
                  value={settings.addressCountry}
                  onChange={set("addressCountry")}
                  placeholder={addressLabels.countryPlaceholder}
                  disabled={settings.addressFormat === "us"}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="shadow-sm">
            {isSaving ? (
              <IconLoader2 className="w-4 h-4 animate-spin" />
            ) : (
              <IconDeviceFloppy className="w-4 h-4" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
