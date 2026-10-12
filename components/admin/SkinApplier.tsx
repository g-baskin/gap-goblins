"use client";

import { useEffect } from "react";
import { applySkin } from "@/lib/apply-skin";

export function SkinApplier() {
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        applySkin(data.skinId || "concrete");
      } catch {
        // non-critical
      }
    };

    load();
  }, []);

  return null;
}
