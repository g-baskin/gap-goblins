import { describe, expect, it } from "vitest";
import { compileAutomationGraph, GraphCompileError } from "./compiler";

const trigger = {
  key: "trigger",
  name: "Trigger",
  type: "trigger" as const,
  position: { x: 0, y: 0 },
  config: { triggerType: "manual_enrollment" as const, filters: {} },
};
const email = (key: string) => ({
  key,
  name: key,
  type: "email" as const,
  position: { x: 100, y: 0 },
  config: { subject: "Hello", bodyText: "World" },
});

function issueCodes(input: unknown) {
  try {
    compileAutomationGraph(input);
    return [];
  } catch (error) {
    expect(error).toBeInstanceOf(GraphCompileError);
    return (error as GraphCompileError).issues.map((issue) => issue.code);
  }
}

describe("compileAutomationGraph", () => {
  it("compiles a valid branch and returns a stable hash", () => {
    const graph = {
      nodes: [
        trigger,
        {
          key: "condition",
          name: "Qualified?",
          type: "condition" as const,
          position: { x: 100, y: 0 },
          config: {
            expression: {
              kind: "rule" as const,
              field: "score",
              operator: "gte" as const,
              value: 10,
            },
          },
        },
        email("yes"),
        email("no"),
      ],
      edges: [
        { id: "a", source: "trigger", target: "condition", sourceHandle: "default" },
        { id: "b", source: "condition", target: "yes", sourceHandle: "true" },
        { id: "c", source: "condition", target: "no", sourceHandle: "false" },
      ],
    };
    const first = compileAutomationGraph(graph);
    const second = compileAutomationGraph(graph);
    expect(first.topologicalOrder[0]).toBe("trigger");
    expect(first.graphHash).toBe(second.graphHash);
  });

  it("rejects cycles", () => {
    expect(
      issueCodes({
        nodes: [trigger, email("one")],
        edges: [
          { id: "a", source: "trigger", target: "one" },
          { id: "b", source: "one", target: "trigger" },
        ],
      }),
    ).toContain("cycle");
  });

  it("rejects orphan and unreachable nodes", () => {
    const codes = issueCodes({ nodes: [trigger, email("orphan")], edges: [] });
    expect(codes).toContain("orphan");
    expect(codes).toContain("unreachable");
  });

  it("rejects malformed condition handles", () => {
    const codes = issueCodes({
      nodes: [
        trigger,
        {
          key: "condition",
          name: "Condition",
          type: "condition",
          position: { x: 1, y: 1 },
          config: { expression: { kind: "rule", field: "x", operator: "exists" } },
        },
        email("next"),
      ],
      edges: [
        { id: "a", source: "trigger", target: "condition" },
        { id: "b", source: "condition", target: "next", sourceHandle: "default" },
      ],
    });
    expect(codes).toContain("condition_outputs");
  });

  it("rejects unsupported nodes and graph limits", () => {
    expect(issueCodes({ nodes: [{ ...trigger, type: "shell" }], edges: [] })).toContain("schema");
    expect(
      issueCodes({
        nodes: [trigger, ...Array.from({ length: 100 }, (_, index) => email(`n${index}`))],
        edges: [],
      }),
    ).toContain("schema");
  });

  it("rejects multi-input joins", () => {
    const codes = issueCodes({
      nodes: [trigger, email("left"), email("right"), email("join")],
      edges: [
        { id: "a", source: "trigger", target: "left" },
        { id: "b", source: "left", target: "join" },
        { id: "c", source: "right", target: "join" },
      ],
    });
    expect(codes).toContain("multi_input");
  });
});
