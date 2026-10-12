import { describe, expect, it } from "vitest";
import type { AutomationGraph } from "@/lib/automation/graph/types";
import { initialWorkflowDraftState, workflowDraftReducer } from "./useWorkflowDraft";

const changedGraph: AutomationGraph = {
  nodes: [
    {
      key: "trigger",
      type: "trigger",
      name: "Started manually",
      position: { x: 120, y: 80 },
      config: { triggerType: "manual_enrollment", filters: {} },
    },
  ],
  edges: [],
};

describe("workflowDraftReducer", () => {
  it("records graph changes and restores them through undo and redo", () => {
    const changed = workflowDraftReducer(initialWorkflowDraftState, {
      type: "change",
      graph: changedGraph,
    });

    expect(changed.dirty).toBe(true);
    expect(changed.past).toHaveLength(1);
    const undone = workflowDraftReducer(changed, { type: "undo" });
    expect(undone.graph.nodes[0]?.name).toBe("Workflow trigger");
    expect(workflowDraftReducer(undone, { type: "redo" }).graph).toEqual(changedGraph);
  });

  it("clears history when a remote draft is loaded", () => {
    const loaded = workflowDraftReducer(initialWorkflowDraftState, {
      type: "load",
      draft: {
        graph: changedGraph,
        revisionId: "revision-1",
        optimisticToken: "token-1",
      },
    });

    expect(loaded.dirty).toBe(false);
    expect(loaded.past).toEqual([]);
    expect(loaded.selectedNodeKey).toBe("trigger");
  });

  it("marks a successful save clean without discarding the graph", () => {
    const changed = workflowDraftReducer(initialWorkflowDraftState, {
      type: "change",
      graph: changedGraph,
    });
    const saved = workflowDraftReducer(changed, {
      type: "saved",
      revisionId: "revision-2",
      optimisticToken: "token-2",
    });

    expect(saved.graph).toEqual(changedGraph);
    expect(saved.dirty).toBe(false);
    expect(saved.optimisticToken).toBe("token-2");
  });

  it("keeps nested configuration snapshots isolated from later mutations", () => {
    const changed = workflowDraftReducer(initialWorkflowDraftState, {
      type: "change",
      graph: changedGraph,
    });
    const config = changed.graph.nodes[0]?.config as { filters: Record<string, unknown> };
    config.filters.changed = true;

    const undone = workflowDraftReducer(changed, { type: "undo" });

    expect(undone.graph.nodes[0]?.config).toEqual({
      triggerType: "manual_enrollment",
      filters: {},
    });
  });
});
