import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Guard the credential-to-network boundary without generating a real TOTP seed.
describe("TOTP enrollment privacy", () => {
  it("uses manual entry instead of an external QR image", () => {
    const source = readFileSync("app/admin/(dashboard)/settings/security/page.tsx", "utf8");
    expect(source).not.toContain("api.qrserver.com");
    expect(source).not.toMatch(/<img\b|<Image\b/);
    expect(source).not.toContain("setTotpOtpauth");
    expect(source).toContain('htmlFor="totpSecret"');
    expect(source).toContain("JSON.stringify({ secret: totpSecret, token: totpToken })");
  });

  it("no longer authorizes the external QR service in image policies", () => {
    for (const path of ["lib/security/csp-nonce.ts", "next.config.ts"]) {
      expect(readFileSync(path, "utf8")).not.toContain("api.qrserver.com");
    }
  });
});
