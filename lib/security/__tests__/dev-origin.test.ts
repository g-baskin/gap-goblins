import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

describe("local development origins", () => {
  it("allows the explicit loopback hostname used for local sign-in without wildcard origins", () => {
    expect(nextConfig.allowedDevOrigins).toEqual(["127.0.0.1"]);
  });
});
