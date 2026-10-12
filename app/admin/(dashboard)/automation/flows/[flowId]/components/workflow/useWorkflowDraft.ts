"use client";

import { useCallback, useEffect, useReducer } from "react";
import type { AutomationGraph, AutomationGraphNode } from "@/lib/automation/graph/types";

export type WorkflowDraft = {
  graph: AutomationGraph;
  optimisticToken?: string;
  revisionId?: string;
  version?: number;
};

export type WorkflowDraftState = WorkflowDraft & {
  past: AutomationGraph[];
  future: AutomationGraph[];
  dirty: boolean;
  selectedNodeKey: string | null;
};

export type WorkflowDraftAction =
  | { type: "load"; draft: WorkflowDraft }
  | { type: "change"; graph: AutomationGraph }
  | { type: "select"; key: string | null }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "saved"; optimisticToken: string; revisionId: string };

const starterGraph: AutomationGraph = {
  nodes: [
    {
      key: "trigger",
      type: "trigger",
      name: "Workflow trigger",
      position: { x: 80, y: 180 },
      config: { triggerType: "manual_enrollment", filters: {} },
    },
  ],
  edges: [],
};

export const initialWorkflowDraftState: WorkflowDraftState = {
  graph: starterGraph,
  past: [],
  future: [],
  dirty: false,
  selectedNodeKey: "trigger",
};

function copyGraph(graph: AutomationGraph): AutomationGraph {
  return structuredClone(graph);
}

export function workflowDraftReducer(
  state: WorkflowDraftState,
  action: WorkflowDraftAction,
): WorkflowDraftState {
  switch (action.type) {
    case "load":
      return {
        ...initialWorkflowDraftState,
        ...action.draft,
        selectedNodeKey: action.draft.graph.nodes[0]?.key ?? null,
      };
    case "change":
      return {
        ...state,
        past: [...state.past.slice(-49), copyGraph(state.graph)],
        graph: copyGraph(action.graph),
        future: [],
        dirty: true,
      };
    case "select":
      return { ...state, selectedNodeKey: action.key };
    case "undo": {
      const graph = state.past.at(-1);
      if (!graph) return state;
      return {
        ...state,
        graph: copyGraph(graph),
        past: state.past.slice(0, -1),
        future: [copyGraph(state.graph), ...state.future],
        dirty: true,
      };
    }
    case "redo": {
      const [graph, ...future] = state.future;
      if (!graph) return state;
      return {
        ...state,
        graph: copyGraph(graph),
        past: [...state.past, copyGraph(state.graph)],
        future,
        dirty: true,
      };
    }
    case "saved":
      return {
        ...state,
        optimisticToken: action.optimisticToken,
        revisionId: action.revisionId,
        dirty: false,
      };
  }
}

export function useWorkflowDraft() {
  const [state, dispatch] = useReducer(workflowDraftReducer, initialWorkflowDraftState);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (state.dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state.dirty]);

  const updateNode = useCallback(
    (key: string, patch: Partial<AutomationGraphNode>) => {
      dispatch({
        type: "change",
        graph: {
          ...state.graph,
          nodes: state.graph.nodes.map((node) =>
            node.key === key ? ({ ...node, ...patch } as AutomationGraphNode) : node,
          ),
        },
      });
    },
    [state.graph],
  );

  return { state, dispatch, updateNode };
}
