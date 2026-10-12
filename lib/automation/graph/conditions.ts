import { conditionExpressionSchema } from "@/lib/validations/automation-graph";
import type { ConditionExpression } from "./types";

const missing = Symbol("missing");

function fieldValue(input: unknown, path: string): unknown | typeof missing {
  let value = input;
  for (const segment of path.split(".")) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return missing;
    if (!Object.hasOwn(value, segment)) return missing;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

function evaluateRule(
  rule: Extract<ConditionExpression, { kind: "rule" }>,
  input: unknown,
): boolean {
  const actual = fieldValue(input, rule.field);
  if (rule.operator === "exists") return actual !== missing;
  if (actual === missing) return false;

  switch (rule.operator) {
    case "equals":
      return Object.is(actual, rule.value);
    case "not_equals":
      return !Object.is(actual, rule.value);
    case "contains":
      if (typeof actual === "string" && typeof rule.value === "string") {
        return actual.includes(rule.value);
      }
      return Array.isArray(actual) && actual.some((value) => Object.is(value, rule.value));
    case "in":
      return Array.isArray(rule.value) && rule.value.some((value) => Object.is(value, actual));
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (typeof actual !== "number" || typeof rule.value !== "number") return false;
      if (!Number.isFinite(actual) || !Number.isFinite(rule.value)) return false;
      if (rule.operator === "gt") return actual > rule.value;
      if (rule.operator === "gte") return actual >= rule.value;
      if (rule.operator === "lt") return actual < rule.value;
      return actual <= rule.value;
    }
  }
}

function evaluate(expression: ConditionExpression, input: unknown): boolean {
  if (expression.kind === "rule") return evaluateRule(expression, input);
  const results = expression.conditions.map((condition) =>
    evaluate(condition as ConditionExpression, input),
  );
  return expression.combinator === "and" ? results.every(Boolean) : results.some(Boolean);
}

export function evaluateCondition(expression: unknown, input: unknown): boolean {
  return evaluate(conditionExpressionSchema.parse(expression) as ConditionExpression, input);
}
