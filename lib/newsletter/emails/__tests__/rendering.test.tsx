import { render } from "@react-email/render";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmationEmail } from "../confirmation-email";
import { CuratedBriefNewsletter } from "../curated-brief-newsletter";

function parseEmail(html: string) {
  return new DOMParser().parseFromString(html, "text/html");
}

afterEach(() => vi.unstubAllEnvs());

describe("maintained React Email components", () => {
  it("renders confirmation links, accessible logo and table layout with inline styles", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    const verificationUrl = "https://example.test/verify?token=test-token&source=email";
    const html = await render(
      <ConfirmationEmail verificationUrl={verificationUrl} email="reader@example.test" />,
    );
    const doc = parseEmail(html);
    const links = [...doc.querySelectorAll("a")];
    expect(links.find((link) => link.textContent?.includes("Confirm Subscription"))?.href).toBe(
      verificationUrl,
    );
    expect(links.find((link) => link.textContent === "Unsubscribe")?.href).toBe(
      "https://example.test/newsletter/unsubscribe?email=reader@example.test",
    );
    expect(doc.querySelector("img")?.getAttribute("alt")).toBe("__YOUR_BRAND__");
    expect(doc.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.test/logos/logo.png",
    );
    expect(doc.querySelector('table[role="presentation"]')).not.toBeNull();
    expect(doc.body.getAttribute("style")).toContain("background-color:#f9fafb");
    expect(doc.body.textContent).toContain("This link expires in 24 hours");
  });

  it("renders newsletter content as escaped text and preserves story links", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    const html = await render(
      <CuratedBriefNewsletter
        firstName="Alex & Sam"
        date="18 October 2026"
        email="reader@example.test"
        issueNumber={7}
        stories={[
          {
            headline: "A <b>literal</b> headline",
            content: "News & updates",
            whyItMatters: "Useful context",
            readMoreUrl: "https://example.test/story?one=1&two=2",
          },
        ]}
      />,
    );
    const doc = parseEmail(html);
    expect(doc.body.textContent).toContain("Hi Alex & Sam");
    expect(doc.body.textContent).toContain("A <b>literal</b> headline");
    expect(doc.querySelector("b")).toBeNull();
    expect(doc.body.textContent).toContain("News & updates");
    expect(doc.body.textContent).toContain("Useful context");
    expect(doc.body.textContent).toContain("Issue #7");
    expect(
      [...doc.querySelectorAll("a")].find((link) => link.textContent?.includes("Read more"))?.href,
    ).toBe("https://example.test/story?one=1&two=2");
  });

  it("renders plain text without markup or sending email", async () => {
    const text = await render(
      <ConfirmationEmail
        verificationUrl="https://example.test/verify?token=test-token"
        email="reader@example.test"
      />,
      { plainText: true },
    );
    expect(text).toContain("https://example.test/verify?token=test-token");
    expect(text).toContain("This link expires in 24 hours");
    expect(text).not.toContain("<table");
  });
});
