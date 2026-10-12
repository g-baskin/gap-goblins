import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const proxySource = readFileSync(resolve(process.cwd(), "proxy.ts"), "utf8");

describe("proxy matcher security exclusions", () => {
  it("excludes automation unsubscribe routes from API CSRF matching", () => {
    expect(proxySource).toContain("automation/unsubscribe");
  });

  it("excludes automation unsubscribe pages from the catch-all matcher", () => {
    expect(proxySource).toContain("api/automation/unsubscribe");
  });
});
