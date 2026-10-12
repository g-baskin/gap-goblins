import { createHash } from "node:crypto";
import { hasRegisteredAction } from "@/lib/automation/actions/catalog";
import { automationGraphSchema } from "@/lib/validations/automation-graph";
import type { AutomationGraph } from "./types";

export type GraphCompileIssue = {
  code: string;
  message: string;
  nodeKey?: string;
  edgeId?: string;
};

export class GraphCompileError extends Error {
  constructor(readonly issues: GraphCompileIssue[]) {
    super("Workflow graph is invalid");
    this.name = "GraphCompileError";
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashAutomationGraph(graph: AutomationGraph): string {
  return createHash("sha256").update(stableJson(graph)).digest("hex");
}

export function compileAutomationGraph(input: unknown): {
  graph: AutomationGraph;
  graphHash: string;
  topologicalOrder: string[];
} {
  const parsed = automationGraphSchema.safeParse(input);
  if (!parsed.success) {
    throw new GraphCompileError(
      parsed.error.issues.map((issue) => ({
        code: "schema",
        message: issue.message,
        nodeKey: typeof issue.path[1] === "number" ? undefined : String(issue.path[1] ?? ""),
      })),
    );
  }
  const graph = parsed.data;
  const issues: GraphCompileIssue[] = [];
  const nodes = new Map<string, AutomationGraph["nodes"][number]>();
  for (const node of graph.nodes) {
    if (nodes.has(node.key)) {
      issues.push({
        code: "duplicate_node",
        message: "Node keys must be unique",
        nodeKey: node.key,
      });
    }
    nodes.set(node.key, node);
  }

  const triggers = graph.nodes.filter((node) => node.type === "trigger");
  if (triggers.length !== 1) {
    issues.push({ code: "trigger_count", message: "Workflow requires exactly one trigger" });
  }

  const outgoing = new Map<string, typeof graph.edges>();
  const incoming = new Map<string, typeof graph.edges>();
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({ code: "duplicate_edge", message: "Edge IDs must be unique", edgeId: edge.id });
    }
    edgeIds.add(edge.id);
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) {
      issues.push({
        code: "missing_endpoint",
        message: "Edge source and target must exist",
        edgeId: edge.id,
      });
      continue;
    }
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]);
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge]);
  }

  for (const node of graph.nodes) {
    const inputs = incoming.get(node.key) ?? [];
    const outputs = outgoing.get(node.key) ?? [];
    if (
      node.type === "registered_custom_action" &&
      !hasRegisteredAction(node.config.actionId, node.config.version)
    ) {
      issues.push({
        code: "unknown_action",
        message: `Unknown registered action ${node.config.actionId}@${node.config.version}`,
        nodeKey: node.key,
      });
    }
    if (node.type !== "trigger" && inputs.length === 0) {
      issues.push({ code: "orphan", message: "Node has no incoming edge", nodeKey: node.key });
    }
    if (inputs.length > 1) {
      issues.push({
        code: "multi_input",
        message: "Multi-input joins are not supported",
        nodeKey: node.key,
      });
    }
    if (node.type === "condition") {
      const handles = outputs.map((edge) => edge.sourceHandle).sort();
      if (handles.length !== 2 || handles[0] !== "false" || handles[1] !== "true") {
        issues.push({
          code: "condition_outputs",
          message: "Conditions require exactly true and false outputs",
          nodeKey: node.key,
        });
      }
    } else if (outputs.length > 0) {
      if (outputs.length !== 1 || outputs[0]?.sourceHandle !== "default") {
        issues.push({
          code: "default_output",
          message: "Non-condition nodes allow one default output",
          nodeKey: node.key,
        });
      }
    }
  }

  const trigger = triggers[0];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const topologicalOrder: string[] = [];
  const visit = (nodeKey: string) => {
    if (visiting.has(nodeKey)) {
      issues.push({ code: "cycle", message: "Workflow must be acyclic", nodeKey });
      return;
    }
    if (visited.has(nodeKey)) return;
    visiting.add(nodeKey);
    for (const edge of outgoing.get(nodeKey) ?? []) visit(edge.target);
    visiting.delete(nodeKey);
    visited.add(nodeKey);
    topologicalOrder.unshift(nodeKey);
  };
  if (trigger) visit(trigger.key);
  for (const node of graph.nodes) {
    if (!visited.has(node.key)) {
      issues.push({
        code: "unreachable",
        message: "Node is unreachable from trigger",
        nodeKey: node.key,
      });
    }
  }

  if (issues.length) throw new GraphCompileError(issues);
  return {
    graph,
    graphHash: hashAutomationGraph(graph),
    topologicalOrder,
  };
}
