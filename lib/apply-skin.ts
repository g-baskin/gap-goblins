import { buildSkinCss } from "@/lib/themes";

export const APPLIED_SKIN_STYLE_ID = "applied-skin";
export const PREVIEW_SKIN_STYLE_ID = "skin-preview";

function injectStyle(styleId: string, css: string): void {
  let el = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = styleId;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

/** Persist skin CSS on the admin layout layer (survives navigation). */
export function applySkin(skinId: string): void {
  const css = buildSkinCss(skinId);
  if (!css) return;
  injectStyle(APPLIED_SKIN_STYLE_ID, css);
}

/** Temporary preview while picking on the Appearance page. */
export function applySkinPreview(skinId: string): void {
  const css = buildSkinCss(skinId);
  if (!css) return;
  injectStyle(PREVIEW_SKIN_STYLE_ID, css);
}

export function removeSkinPreview(): void {
  document.getElementById(PREVIEW_SKIN_STYLE_ID)?.remove();
}

/** After a successful save: promote preview into the applied layer. */
export function commitSkin(skinId: string): void {
  applySkin(skinId);
  removeSkinPreview();
}
