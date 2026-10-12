"use client";

import { useEffect, useState } from "react";
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

interface PublicNewsletterSettings {
  branding: {
    logo: string;
    primaryColor: string;
    fontFamily: string;
    formTitle: string;
    formDescription: string;
    buttonText: string;
    successMessage: string;
    consentText: string;
  };
  footer: {
    companyName: string;
    address: string;
  };
}

const fallbackSettings: PublicNewsletterSettings = {
  branding: {
    logo: "",
    primaryColor: "#3B82F6",
    fontFamily: "Inter, sans-serif",
    formTitle: "Join the newsletter",
    formDescription: "Get practical systems ideas and examples in your inbox.",
    buttonText: "Subscribe",
    successMessage: "Thanks for subscribing. You're on the list.",
    consentText: "I agree to receive newsletter emails and can unsubscribe at any time.",
  },
  footer: {
    companyName: "Newsletter",
    address: "Australian Business",
  },
};

export default function NewsletterSubscribePage() {
  const [settings, setSettings] = useState<PublicNewsletterSettings>(fallbackSettings);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      try {
        const response = await fetch("/api/newsletter/settings?public=1");
        if (!response.ok) return;
        const data = (await response.json()) as PublicNewsletterSettings;
        if (!ignore) setSettings({ ...fallbackSettings, ...data });
      } catch {
        // Use fallback copy if public settings are unavailable.
      }
    }

    loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
          businessName: businessName || undefined,
          source: "newsletter_subscribe_page",
          consent: true,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Could not subscribe. Please try again.");
      }

      setSuccess(true);
      setEmail("");
      setFirstName("");
      setBusinessName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not subscribe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const accentColor = settings.branding.primaryColor || fallbackSettings.branding.primaryColor;

  return (
    <main
      className="min-h-screen bg-muted/30 flex items-center justify-center px-4 py-12"
      style={{ fontFamily: settings.branding.fontFamily }}
    >
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4 text-center">
          {settings.branding.logo && (
            // biome-ignore lint/performance/noImgElement: remote newsletter logos are admin-configured and not known to next/image.
            <img
              src={settings.branding.logo}
              alt={`${settings.footer.companyName} logo`}
              className="mx-auto h-12 w-auto object-contain"
            />
          )}
          <div>
            <CardTitle className="text-3xl">{settings.branding.formTitle}</CardTitle>
            <CardDescription className="mt-3 text-base">
              {settings.branding.formDescription}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              {settings.branding.successMessage}
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  autoComplete="organization"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <p className="text-sm text-muted-foreground">{settings.branding.consentText}</p>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                className="w-full text-white"
                style={{ backgroundColor: accentColor }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Subscribing..." : settings.branding.buttonText}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {settings.footer.companyName} · {settings.footer.address}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
