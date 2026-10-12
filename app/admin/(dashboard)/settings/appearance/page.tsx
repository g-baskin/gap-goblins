"use client";

import {
  IconDeviceDesktop,
  IconDeviceFloppy,
  IconLoader2,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { SkinPicker } from "@/components/settings/skin-picker";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Separator } from "@/components/shadcn/ui/separator";
import { markThemeUserOverride } from "@/lib/theme-user-override";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
  { value: "system", label: "System", icon: IconDeviceDesktop },
] as const;

type ThemeValue = (typeof THEMES)[number]["value"];

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

async function saveThemePreference(theme: ThemeValue): Promise<boolean> {
  const res = await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preferences: { theme } }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    toast.error(data.error || "Failed to save theme");
    return false;
  }
  return true;
}

export default function AppearanceSettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();
  const [isSaving, setIsSaving] = useState(false);
  const [currentSkinId, setCurrentSkinId] = useState("concrete");
  const [selectedTheme, setSelectedTheme] = useState<ThemeValue>("system");
  const hasLoadedSettings = useRef(false);

  // Load skin + initial theme label once (do not call setTheme — AdminThemeWrapper hydrates)
  useEffect(() => {
    if (!session?.user || hasLoadedSettings.current) return;

    const load = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (res.ok) {
          if (data.preferences?.theme) {
            setSelectedTheme(data.preferences.theme as ThemeValue);
          }
          if (data.skinId) setCurrentSkinId(data.skinId);
          hasLoadedSettings.current = true;
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    load();
  }, [session?.user]);

  // Keep selectedTheme in sync after mount when next-themes reports stored preference
  useEffect(() => {
    if (mounted && theme && (theme === "light" || theme === "dark" || theme === "system")) {
      setSelectedTheme(theme);
    }
  }, [mounted, theme]);

  const handleThemeSelect = useCallback(
    async (value: ThemeValue) => {
      markThemeUserOverride();
      setSelectedTheme(value);
      setTheme(value);

      setIsSaving(true);
      try {
        const ok = await saveThemePreference(value);
        if (ok) toast.success("Theme saved");
      } catch {
        toast.error("Failed to save theme");
      } finally {
        setIsSaving(false);
      }
    },
    [setTheme],
  );

  const handleSaveTheme = async () => {
    setIsSaving(true);
    try {
      markThemeUserOverride();
      setTheme(selectedTheme);
      const ok = await saveThemePreference(selectedTheme);
      if (ok) toast.success("Theme saved");
    } catch {
      toast.error("Failed to save theme");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customise the look and feel of the dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme picker */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium">Theme</h3>
              <p className="text-xs text-muted-foreground">
                Choose light, dark, or follow your system
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {THEMES.map((t) => {
                const isActive = mounted && selectedTheme === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleThemeSelect(t.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                      isActive
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                      isSaving && "opacity-60",
                    )}
                  >
                    <t.icon className="size-6" />
                    <span className="text-sm font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
            <Button onClick={handleSaveTheme} disabled={isSaving} size="sm" className="shadow-sm">
              {isSaving ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <IconDeviceFloppy className="w-4 h-4" />
              )}
              Save theme
            </Button>
          </div>

          <Separator />

          {/* Colour scheme / skin picker */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium">Colour Scheme</h3>
              <p className="text-xs text-muted-foreground">
                Choose a colour accent for the dashboard
              </p>
            </div>
            <SkinPicker
              currentSkinId={currentSkinId}
              onSkinSaved={(skinId) => setCurrentSkinId(skinId)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
