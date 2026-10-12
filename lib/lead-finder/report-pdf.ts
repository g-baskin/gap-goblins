/**
 * Renders gap report HTML to a Letter PDF with Playwright Chromium.
 * Worker-only (it launches a browser). JavaScript is disabled and every network
 * request is aborted: the document must be fully self-contained (inline CSS,
 * data: URI logo, system fonts).
 */
import { chromium } from "playwright";

export interface PdfRenderResult {
  pdf: Buffer;
  /** Requests the page tried to make (all blocked). Should be empty. */
  blockedRequests: string[];
}

export async function renderReportPdf(html: string): Promise<PdfRenderResult> {
  const browser = await chromium.launch({ headless: true });
  const blockedRequests: string[] = [];
  try {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      offline: true,
      bypassCSP: false,
    });
    await context.route("**/*", (route) => {
      blockedRequests.push(route.request().url());
      return route.abort("blockedbyclient");
    });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
    });
    await context.close();
    return { pdf: Buffer.from(pdf), blockedRequests };
  } finally {
    await browser.close();
  }
}

/** Counts pages in a PDF produced by Chromium (counts /Type /Page objects). */
export function countPdfPages(pdf: Buffer): number {
  const text = pdf.toString("latin1");
  return (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
}
