/**
 * Gap report HTML: one self-contained document used for the in-app preview and
 * for the Playwright PDF. Pure function, no I/O.
 *
 * Security: every scraped or tenant-entered string goes through escapeHtml.
 * Colours, the logo data URI and the CTA URL are validated against strict
 * patterns and dropped if they don't match. The document carries a CSP that
 * forbids scripts and any network access (data: images only).
 */
import {
  captureLine,
  DEFAULT_CTA,
  DISCLAIMER,
  type GapFacts,
  gapSection,
  NOT_CHECKED_LABELS,
  SCORE_EXPLAINER,
  scoreSummary,
} from "./report-copy";
import { type GapFlags, trueFlags, unknownFlags } from "./scoring";
import { GAP_LABELS, GAP_WEIGHTS } from "./scoring-config";

export interface ReportBranding {
  companyName: string | null;
  logoDataUri: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  ctaHeadline: string | null;
  ctaBody: string | null;
  ctaUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  physicalAddress: string | null;
}

export interface ReportModel {
  branding: ReportBranding;
  business: {
    name: string;
    mainCategory: string | null;
    address: string | null;
    phone: string | null;
  };
  score: number;
  flags: GapFlags;
  facts: GapFacts;
  captureDate: Date;
  rubricVersion: string;
}

export const REPORT_CSP =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"'`]/g, (ch) => HTML_ESCAPES[ch]);
}

const HEX = /^#[0-9a-f]{6}$/i;
export function safeColor(value: string | null | undefined, fallback: string): string {
  return value && HEX.test(value.trim()) ? value.trim() : fallback;
}

const LOGO_DATA_URI = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i;
export function safeLogo(value: string | null | undefined): string | null {
  return value && LOGO_DATA_URI.test(value) ? value : null;
}

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Readable text colour (black or white) on a hex background. */
function onColor(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#ffffff";
}

function severityColor(score: number): string {
  if (score >= 60) return "#dc2626";
  if (score >= 30) return "#d97706";
  return "#16a34a";
}

function gauge(score: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const length = Math.PI * 80;
  const filled = (clamped / 100) * length;
  const color = severityColor(clamped);
  return `<svg class="gauge" viewBox="0 0 200 118" role="img" aria-label="Gap Score ${clamped} out of 100">
  <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" stroke-width="18" stroke-linecap="round"/>
  <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round"
    stroke-dasharray="${filled.toFixed(2)} ${length.toFixed(2)}"/>
  <text x="100" y="92" text-anchor="middle" class="gauge-score" fill="#111827">${clamped}</text>
  <text x="100" y="113" text-anchor="middle" class="gauge-max" fill="#6b7280">out of 100</text>
</svg>`;
}

function nameSizeClass(name: string): string {
  if (name.length > 90) return "name-xs";
  if (name.length > 55) return "name-sm";
  if (name.length > 30) return "name-md";
  return "";
}

export function renderGapReportHtml(model: ReportModel): string {
  const { branding, business, flags, facts } = model;
  const primary = safeColor(branding.primaryColor, "#1f2937");
  const accent = safeColor(branding.accentColor, "#7c3aed");
  const onPrimary = onColor(primary);
  const onAccent = onColor(accent);
  const logo = safeLogo(branding.logoDataUri);
  const ctaUrl = safeHttpUrl(branding.ctaUrl);
  const tenantSite = safeHttpUrl(branding.website);
  const companyName = branding.companyName?.trim() || "Your local marketing partner";
  const gaps = trueFlags(flags);
  const unknown = unknownFlags(flags);
  const summary = scoreSummary(model.score, gaps.length);

  const gapCards = gaps
    .map((key, index) => {
      const section = gapSection(key, facts);
      return `<section class="gap">
  <div class="gap-head">
    <span class="gap-num">${index + 1}</span>
    <h3>${escapeHtml(section.title)}</h3>
    <span class="gap-points">+${GAP_WEIGHTS[key]}</span>
  </div>
  <p class="finding">${escapeHtml(section.finding)}</p>
  <p class="why"><strong>Why it matters.</strong> ${escapeHtml(section.whyItMatters)}</p>
  <p class="fix"><strong>Practical fix.</strong> ${escapeHtml(section.fix)}</p>
</section>`;
    })
    .join("\n");

  const notChecked =
    unknown.length > 0
      ? `<section class="not-checked">
  <h4>Not checked</h4>
  <p>The source data didn't include these, so they're not part of the score:</p>
  <ul>${unknown.map((key) => `<li>${escapeHtml(NOT_CHECKED_LABELS[key])}</li>`).join("")}</ul>
</section>`
      : "";

  const contactBits = [
    branding.contactPhone ? escapeHtml(branding.contactPhone) : "",
    branding.contactEmail ? escapeHtml(branding.contactEmail) : "",
    tenantSite ? escapeHtml(displayUrl(tenantSite)) : "",
  ].filter(Boolean);

  const badges = gaps
    .map((key) => `<span class="badge">${escapeHtml(GAP_LABELS[key])}</span>`)
    .join("");

  const meta = [business.mainCategory, business.address, business.phone]
    .filter((v): v is string => !!v && v.trim() !== "")
    .map((v) => `<span>${escapeHtml(v)}</span>`)
    .join('<span class="dot">•</span>');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${REPORT_CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gap Report: ${escapeHtml(business.name)}</title>
<style>
  @page { size: Letter; margin: 0.45in 0.5in 0.55in; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111827; font-size: 10.5pt; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
  .page { max-width: 7.5in; margin: 0 auto; }
  header.brand { display: flex; align-items: center; justify-content: space-between; gap: 16px; background: ${primary}; color: ${onPrimary}; border-radius: 12px; padding: 14px 18px; }
  .brand-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .brand img { max-height: 44px; max-width: 160px; object-fit: contain; background: #fff; border-radius: 6px; padding: 4px; }
  .brand-name { font-size: 13pt; font-weight: 700; overflow-wrap: anywhere; }
  .brand-tag { font-size: 8.5pt; opacity: .85; text-transform: uppercase; letter-spacing: .08em; white-space: nowrap; }
  .hero { display: grid; grid-template-columns: 1fr 200px; gap: 20px; align-items: center; margin: 18px 2px 6px; }
  .eyebrow { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .1em; color: ${accent}; font-weight: 700; margin: 0 0 4px; }
  h1 { font-size: 24pt; line-height: 1.1; margin: 0 0 6px; overflow-wrap: anywhere; word-break: break-word; hyphens: auto; }
  h1.name-md { font-size: 19pt; } h1.name-sm { font-size: 15pt; } h1.name-xs { font-size: 12pt; }
  .meta { color: #4b5563; font-size: 9.5pt; overflow-wrap: anywhere; }
  .meta .dot { margin: 0 6px; color: #9ca3af; }
  .badges { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
  .badge { font-size: 8pt; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
  .gauge { width: 200px; height: auto; display: block; }
  .gauge-score { font-size: 40px; font-weight: 800; }
  .gauge-max { font-size: 11px; }
  .gauge-label { text-align: center; font-weight: 700; font-size: 10pt; margin-top: 2px; color: ${severityColor(model.score)}; }
  .summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; margin: 10px 0 14px; }
  .summary p { margin: 0; } .summary .explainer { color: #6b7280; font-size: 8.5pt; margin-top: 4px; }
  .gap { border: 1px solid #e5e7eb; border-left: 4px solid ${accent}; border-radius: 10px; padding: 10px 14px; margin: 0 0 10px; break-inside: avoid; page-break-inside: avoid; }
  .gap-head { display: flex; align-items: center; gap: 10px; }
  .gap-num { flex: none; width: 22px; height: 22px; border-radius: 999px; background: ${accent}; color: ${onAccent}; font-weight: 700; font-size: 9pt; display: inline-flex; align-items: center; justify-content: center; }
  .gap h3 { font-size: 11.5pt; margin: 0; flex: 1; }
  .gap-points { font-size: 8.5pt; font-weight: 700; color: #6b7280; }
  .gap p { margin: 5px 0 0; }
  .finding { color: #111827; }
  .why, .fix { color: #374151; }
  .fix strong { color: ${accent}; }
  .not-checked { border: 1px dashed #d1d5db; border-radius: 10px; padding: 8px 14px; margin: 4px 0 12px; break-inside: avoid; color: #4b5563; font-size: 9pt; }
  .not-checked h4 { margin: 0 0 2px; font-size: 9.5pt; color: #374151; }
  .not-checked p { margin: 0 0 4px; }
  .not-checked ul { margin: 0; padding-left: 18px; }
  .cta { background: ${accent}; color: ${onAccent}; border-radius: 12px; padding: 14px 18px; margin: 6px 0 12px; break-inside: avoid; page-break-inside: avoid; }
  .cta h2 { margin: 0 0 4px; font-size: 14pt; }
  .cta p { margin: 0 0 6px; }
  .cta .cta-link { display: inline-block; background: ${onAccent}; color: ${accent}; font-weight: 700; padding: 6px 12px; border-radius: 8px; text-decoration: none; overflow-wrap: anywhere; }
  .cta .contact { font-size: 9pt; opacity: .95; margin-top: 6px; overflow-wrap: anywhere; }
  footer { border-top: 1px solid #e5e7eb; padding-top: 8px; color: #6b7280; font-size: 8pt; break-inside: avoid; }
  footer p { margin: 0 0 3px; }
  .capture { font-weight: 600; color: #374151; }
</style>
</head>
<body>
<div class="page">
  <header class="brand">
    <div class="brand-left">
      ${logo ? `<img src="${logo}" alt="">` : ""}
      <div class="brand-name">${escapeHtml(companyName)}</div>
    </div>
    <div class="brand-tag">Online Presence Gap Report</div>
  </header>

  <div class="hero">
    <div>
      <p class="eyebrow">Prepared for</p>
      <h1 class="${nameSizeClass(business.name)}">${escapeHtml(business.name)}</h1>
      ${meta ? `<div class="meta">${meta}</div>` : ""}
      ${badges ? `<div class="badges">${badges}</div>` : ""}
    </div>
    <div>
      ${gauge(model.score)}
      <div class="gauge-label">${escapeHtml(summary.label)}</div>
    </div>
  </div>

  <div class="summary">
    <p>${escapeHtml(summary.sentence)}</p>
    <p class="explainer">${escapeHtml(SCORE_EXPLAINER)}</p>
  </div>

  ${gapCards}
  ${notChecked}

  <section class="cta">
    <h2>${escapeHtml(branding.ctaHeadline?.trim() || DEFAULT_CTA.headline)}</h2>
    <p>${escapeHtml(branding.ctaBody?.trim() || DEFAULT_CTA.body)}</p>
    ${ctaUrl ? `<a class="cta-link" href="${escapeHtml(ctaUrl)}">${escapeHtml(displayUrl(ctaUrl))}</a>` : ""}
    ${contactBits.length ? `<div class="contact">${escapeHtml(companyName)} · ${contactBits.join(" · ")}</div>` : ""}
  </section>

  <footer>
    <p class="capture">${escapeHtml(captureLine(model.captureDate))}</p>
    <p>${escapeHtml(DISCLAIMER)}</p>
    ${branding.physicalAddress ? `<p>${escapeHtml(companyName)} · ${escapeHtml(branding.physicalAddress)}</p>` : ""}
    <p>Scoring rubric ${escapeHtml(model.rubricVersion)}</p>
  </footer>
</div>
</body>
</html>`;
}
