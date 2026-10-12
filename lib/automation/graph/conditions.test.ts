import { describe, expect, it } from "vitest";
import { evaluateCondition } from "./conditions";

const rule = (operator: string, ...args: [value?: unknown, field?: string]) => ({
  kind: "rule",
  field: args[1] ?? "value",
  operator,
  ...(args.length > 0 ? { value: args[0] } : {}),
});

describe("evaluateCondition", () => {
  it.each([
    ["equals", 4, 4, true],
    ["not_equals", 4, 5, true],
    ["contains", "hello world", "world", true],
    ["contains", ["a", "b"], "b", true],
    ["in", "b", ["a", "b"], true],
    ["gt", 5, 4, true],
    ["gte", 5, 5, true],
    ["lt", 4, 5, true],
    ["lte", 5, 5, true],
  ])("evaluates %s without coercion", (operator, actual, expected, result) => {
    expect(evaluateCondition(rule(operator as string, expected), { value: actual })).toBe(result);
  });

  it("distinguishes absent fields from explicit null", () => {
    expect(evaluateCondition(rule("exists"), {})).toBe(false);
    expect(evaluateCondition(rule("exists"), { value: null })).toBe(true);
    expect(evaluateCondition(rule("equals", null), { value: null })).toBe(true);
  });

  it("supports nested and/or groups and dotted fields", () => {
    expect(
      evaluateCondition(
        {
          kind: "group",
          combinator: "and",
          conditions: [
            rule("equals", "lead", "contact.status"),
            {
              kind: "group",
              combinator: "or",
              conditions: [rule("gte", 10, "score"), rule("contains", "vip", "tags")],
            },
          ],
        },
        { contact: { status: "lead" }, score: 3, tags: ["vip"] },
      ),
    ).toBe(true);
  });

  it("rejects numeric coercion", () => {
    expect(evaluateCondition(rule("gt", 4), { value: "5" })).toBe(false);
    expect(evaluateCondition(rule("equals", 5), { value: "5" })).toBe(false);
  });

  it("rejects malformed expressions", () => {
    expect(() => evaluateCondition({ kind: "rule", field: "x", operator: "equals" }, {})).toThrow();
  });
});
