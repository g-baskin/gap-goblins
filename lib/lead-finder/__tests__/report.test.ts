// @vitest-environment node
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { describe, expect, it } from "vitest";
import { detectImageType, toDataUri, validateLogo } from "../image-validation";
import {
  DEFAULT_CTA,
  DISCLAIMER,
  gapSection,
  NOT_CHECKED_LABELS,
  scoreSummary,
} from "../report-copy";
import {
  escapeHtml,
  type ReportModel,
  renderGapReportHtml,
  safeColor,
  safeHttpUrl,
  safeLogo,
} from "../report-html";
import { countPdfPages, renderReportPdf } from "../report-pdf";
import { computeFlags, scoreBusiness } from "../scoring";
import { gapFlagKeys } from "../scoring-config";

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

function model(overrides: Partial<ReportModel> = {}): ReportModel {
  const input = {
    canClaim: true,
    hasDescription: false,
    hasHours: false,
    ownerPostsCount: 0,
    website: "",
    reviewCount: 3,
    rating: 3.2,
    imageCount: null,
  };
  const scored = scoreBusiness(input);
  return {
    branding: {
      companyName: "Acme Growth Co",
      logoDataUri: toDataUri(PNG_1PX),
      primaryColor: "#0f172a",
      accentColor: "#16a34a",
      ctaHeadline: "Let's fix this together",
      ctaBody: "Book a free 15-minute call.",
      ctaUrl: "https://acme.example/book",
      contactEmail: "hello@acme.example",
      contactPhone: "(540) 555-0199",
      website: "https://acme.example",
      physicalAddress: "1 Main St, Fredericksburg, VA",
    },
    business: {
      name: "Ace Plumbing",
      mainCategory: "Plumber",
      address: "2 Elm St",
      phone: "(540) 555-0101",
    },
    score: scored.score,
    flags: scored.flags,
    facts: { reviewCount: 3, rating: 3.2, imageCount: null },
    captureDate: new Date("2026-10-11T12:00:00Z"),
    rubricVersion: scored.rubricVersion,
    ...overrides,
  };
}

describe("report escaping", () => {
  const hostile = `<script>alert("x")</script><img src=x onerror=alert(1)>Bob's "Pipes" & Co`;

  it("a business name containing <script> renders inert", () => {
    const html = renderGapReportHtml(
      model({
        business: {
          name: hostile,
          mainCategory: "<b>cat</b>",
          address: "<svg onload=alert(1)>",
          phone: "' onmouseover='x",
        },
      }),
    );
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<img src=x/i);
    expect(html).not.toMatch(/<svg onload/i);
    expect(html).not.toMatch(/<b>cat<\/b>/);
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("Bob&#39;s &quot;Pipes&quot; &amp; Co");
  });

  it("escapes tenant branding text too", () => {
    const html = renderGapReportHtml(
      model({
        branding: {
          ...model().branding,
          companyName: "</title><script>x()</script>",
          ctaHeadline: "<iframe src=//evil>",
          physicalAddress: "<style>body{display:none}</style>",
        },
      }),
    );
    expect(html).not.toMatch(/<script|<iframe|<style>body/i);
  });

  it("drops unsafe colours, logos and URLs", () => {
    expect(safeColor("red;}</style><script>", "#111111")).toBe("#111111");
    expect(safeColor("#AbCdEf", "#111111")).toBe("#AbCdEf");
    expect(safeLogo("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(safeLogo("https://evil.example/logo.png")).toBeNull();
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("https://ok.example/x")).toBe("https://ok.example/x");
    expect(escapeHtml("`")).toBe("&#96;");
  });

  it("carries a CSP that blocks scripts and network", () => {
    const html = renderGapReportHtml(model());
    expect(html).toContain("default-src 'none'; img-src data:");
    expect(html).not.toMatch(/https?:\/\/[^"<\s]*\.(css|js|woff2?)/i);
  });
});

describe("report content", () => {
  it("shows one section per TRUE flag only and lists unknown flags as Not checked", () => {
    const m = model();
    const html = renderGapReportHtml(m);
    // TRUE: unclaimed, no website, few reviews, low rating. Unknown: photos. False: thin.
    expect(html).toContain("Your Google Business Profile is not claimed");
    expect(html).toContain("No website is linked to your listing");
    expect(html).toContain("Few Google reviews");
    expect(html).toContain("Your average rating is below 4.0");
    expect(html).not.toContain("Your Google Business Profile is sparse");
    expect(html).not.toContain("Few photos on your listing");
    expect(html).toContain("Not checked");
    expect(html).toContain(NOT_CHECKED_LABELS.few_photos);
    expect(html).toContain("Based on the public Google Maps listing as of October 11, 2026.");
    expect(html).toContain("Let&#39;s fix this together");
    expect(html).toContain('href="https://acme.example/book"');
  });

  it("falls back to default CTA copy without branding", () => {
    const html = renderGapReportHtml(
      model({
        branding: {
          companyName: null,
          logoDataUri: null,
          primaryColor: null,
          accentColor: null,
          ctaHeadline: null,
          ctaBody: null,
          ctaUrl: null,
          contactEmail: null,
          contactPhone: null,
          website: null,
          physicalAddress: null,
        },
      }),
    );
    expect(html).toContain(escapeHtml(DEFAULT_CTA.headline));
  });

  it("copy makes no guarantees, invented statistics or factual competitor claims", () => {
    const facts = { reviewCount: 7, rating: 3.4, imageCount: 2 };
    const all = [
      ...gapFlagKeys.flatMap((key) => {
        const s = gapSection(key, facts);
        return [s.title, s.finding, s.whyItMatters, s.fix];
      }),
      DISCLAIMER.replace("It is not a guarantee of any ranking or result.", ""),
      DEFAULT_CTA.headline,
      DEFAULT_CTA.body,
      scoreSummary(80, 4).sentence,
      scoreSummary(0, 0).sentence,
    ].join(" \n");
    expect(all).not.toMatch(
      /guarantee|will rank|#1|number one|\d+\s?%|percent|double your|triple/i,
    );
    expect(all).not.toMatch(/competitors (show up|appear|rank) (first|ahead)/i);
    expect(all).not.toMatch(/\b(yelp|angi|homeadvisor|thumbtack)\b/i);
    // Numbers in the copy come only from the business's own data or the rubric thresholds.
    const numbers = all.match(/\d+(\.\d+)?/g) ?? [];
    // 4 is the gap count passed to scoreSummary.
    expect(new Set(numbers)).toEqual(new Set(["7", "20", "3.4", "4.0", "2", "10", "5", "4"]));
  });

  it("a clean listing says no gaps were found", () => {
    const flags = computeFlags({
      canClaim: false,
      hasDescription: true,
      hasHours: true,
      ownerPostsCount: 2,
      website: "https://x.example",
      reviewCount: 50,
      rating: 4.8,
      imageCount: 30,
    });
    const html = renderGapReportHtml(model({ score: 0, flags }));
    expect(html).toContain("No gaps found");
    expect(html).not.toContain('class="gap"');
  });
});

describe("logo validation by magic bytes", () => {
  it("accepts PNG, JPEG and WebP; rejects SVG, GIF and oversized files", () => {
    expect(detectImageType(PNG_1PX)).toBe("png");
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("jpeg");
    expect(detectImageType(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1"))).toBe("webp");
    expect(
      validateLogo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')),
    ).toMatchObject({ ok: false });
    expect(validateLogo(Buffer.from("GIF89a....", "latin1"))).toMatchObject({ ok: false });
    const big = Buffer.alloc(1024 * 1024 + 1);
    PNG_1PX.copy(big);
    expect(validateLogo(big)).toMatchObject({ ok: false, error: "Logo must be 1 MB or smaller" });
    expect(validateLogo(PNG_1PX)).toMatchObject({ ok: true, mime: "image/png" });
  });
});

const hasChromium = (() => {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

describe.skipIf(!hasChromium)("Playwright PDF", () => {
  it("renders Letter PDFs of 1–2 pages, with a very long name, and makes no network requests", async () => {
    const longName =
      "The Extraordinarily Long-Named Family-Owned Emergency Plumbing, Heating, Cooling & Drain Cleaning Company of Greater Fredericksburg and Stafford County LLC";
    for (const m of [model(), model({ business: { ...model().business, name: longName } })]) {
      const { pdf, blockedRequests } = await renderReportPdf(renderGapReportHtml(m));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      const pages = countPdfPages(pdf);
      expect(pages).toBeGreaterThanOrEqual(1);
      expect(pages).toBeLessThanOrEqual(2);
      expect(blockedRequests).toEqual([]);
      // Letter = 612 x 792 points.
      expect(pdf.toString("latin1")).toMatch(/\/MediaBox\s*\[\s*0 0 612 792\s*\]/);
    }
  }, 180_000);

  it("blocks a remote resource the HTML tries to load", async () => {
    const { blockedRequests } = await renderReportPdf(
      '<html><body><img src="https://example.com/x.png"><p>hi</p></body></html>',
    );
    expect(blockedRequests).toEqual(["https://example.com/x.png"]);
  }, 180_000);
});
