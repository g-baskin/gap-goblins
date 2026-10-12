"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import * as React from "react";
import { hasThemeUserOverride, resetThemeUserOverride } from "@/lib/theme-user-override";

export interface AdminThemeWrapperProps {
  children: React.ReactNode;
}

export function AdminThemeWrapper({ children }: AdminThemeWrapperProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { data: session } = useSession();
  const previousPathRef = React.useRef<string>(pathname);
  const hasFetchedTheme = React.useRef<boolean>(false);

  // Fetch saved theme once when entering admin (sole server → client hydration path)
  React.useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");
    const isLoginPage = pathname === "/admin/login";

    if (isAdmin && !isLoginPage && session?.user && !hasFetchedTheme.current) {
      hasFetchedTheme.current = true;

      fetch("/api/admin/settings")
        .then((res) => res.json())
        .then((data) => {
          if (hasThemeUserOverride()) return;
          if (data.preferences?.theme) {
            setTheme(data.preferences.theme);
          }
        })
        .catch((err) => {
          console.error("Failed to load theme preference:", err);
        });
    }

    // Reset when leaving admin so next visit hydrates from server again
    if (!isAdmin && previousPathRef.current.startsWith("/admin")) {
      hasFetchedTheme.current = false;
      resetThemeUserOverride();
    }

    previousPathRef.current = pathname;
  }, [pathname, session?.user, setTheme]);

  // Force light mode on public pages
  React.useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");

    if (!isAdmin && theme !== "light") {
      setTheme("light");
    }
  }, [pathname, theme, setTheme]);

  return <>{children}</>;
}
