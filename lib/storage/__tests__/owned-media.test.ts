import { describe, expect, it } from "vitest";
import { ownedMediaKey } from "../owned-media";

const filename = "1700000000000-0123456789abcdef.png";

describe("ownedMediaKey", () => {
  it("accepts the current user's server-issued avatar reference", () => {
    expect(ownedMediaKey("avatars", "admin-1", `/api/media/avatars/admin-1--${filename}`)).toBe(
      `avatars/admin-1--${filename}`,
    );
  });

  it("accepts the dedicated global logo namespace", () => {
    expect(
      ownedMediaKey("logos", "site-default", `/api/media/logos/site-default--${filename}`),
    ).toBe(`logos/site-default--${filename}`);
  });

  it.each([
    `/api/media/avatars/admin-2--${filename}`,
    `/api/media/avatars/admin-10--${filename}`,
    `/api/media/logos/site-default--${filename}`,
    `/api/media/avatars/${filename}`,
    `avatars/admin-1--${filename}`,
    "tenants/another-tenant/reports/report.pdf",
    `/api/media/avatars/admin-1--${filename}?download=1`,
    "/api/media/avatars/admin-1--../other.png",
    null,
    {},
  ])("refuses foreign, legacy or malformed references: %j", (url) => {
    expect(ownedMediaKey("avatars", "admin-1", url)).toBeNull();
  });

  it("never authorizes a logo outside its namespace", () => {
    expect(ownedMediaKey("logos", "site-default", "/api/media/logos/old-logo.svg")).toBeNull();
    expect(ownedMediaKey("logos", "site-default", "tenants/another-tenant/report.pdf")).toBeNull();
  });
});
