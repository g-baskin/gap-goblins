"use client";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type NodeChange,
  type OnReconnect,
  Panel,
  ReactFlow,
  type ReactFlowInstance,
  reconnectEdge,
} from "@xyflow/react";
import { Cable, Check, ChevronDown, History, Redo2, Save, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/shadcn/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/ui/dialog";
import { Input } from "@/components/shadcn/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/shadcn/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/ui/tabs";
import type {
  AutomationGraph,
  AutomationGraphNode,
  GraphNodeType,
} from "@/lib/automation/graph/types";
import { automationGraphSchema } from "@/lib/validations/automation-graph";
import { useWorkflowDraft } from "./useWorkflowDraft";
import { type ActionDescriptor, type PipelineOption, WorkflowInspector } from "./WorkflowInspector";
import { type WorkflowCanvasNode, WorkflowNode } from "./WorkflowNode";
import { WorkflowPalette } from "./WorkflowPalette";
import { WorkflowRunPanel } from "./WorkflowRunPanel";
import { type WorkflowValidationIssue, WorkflowValidationPanel } from "./WorkflowValidationPanel";
import { createWorkflowNode, nodeCatalog } from "./workflow-node-catalog";

const nodeTypes = { workflow: WorkflowNode };

type Template = { id: string; name: string; description: string | null };
type Revision = { id: string; version: number; lifecycle: string };

type Props = { flowId: string; tenantId: string };

export function AutomationWorkflowBuilder({ flowId, tenantId }: Props) {
  const { state, dispatch, updateNode } = useWorkflowDraft();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [instance, setInstance] = useState<ReactFlowInstance<WorkflowCanvasNode, Edge> | null>(
    null,
  );
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [pipelineOptions, setPipelineOptions] = useState<PipelineOption[]>([]);
  const [actions, setActions] = useState<ActionDescriptor[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [webhookCredentials, setWebhookCredentials] = useState<{
    hookId: string;
    secret: string;
  } | null>(null);

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", "x-tenant-id": tenantId }),
    [tenantId],
  );
  const nodes = useMemo<WorkflowCanvasNode[]>(
    () =>
      state.graph.nodes.map((node) => ({
        id: node.key,
        type: "workflow",
        position: node.position,
        data: { label: node.name, type: node.type },
        ariaLabel: `${node.name}, ${node.type.replaceAll("_", " ")} node`,
        selected: node.key === state.selectedNodeKey,
      })),
    [state.graph.nodes, state.selectedNodeKey],
  );
  const edges = useMemo<Edge[]>(
    () =>
      state.graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        label: edge.label,
        reconnectable: true,
      })),
    [state.graph.edges],
  );
  const selectedNode = state.graph.nodes.find((node) => node.key === state.selectedNodeKey) ?? null;
  const issues = useMemo(() => validateGraph(state.graph), [state.graph]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [draftResponse, catalogResponse, pipelineResponse, templateResponse] =
        await Promise.all([
          fetch(`/api/automation/flows/${flowId}/graph`, { headers }),
          fetch("/api/automation/action-catalog", { headers }),
          fetch("/api/automation/pipeline-options", { headers }),
          fetch("/api/automation/templates", { headers }),
        ]);
      if (draftResponse.ok) {
        const payload = await draftResponse.json();
        dispatch({
          type: "load",
          draft: {
            graph: payload.draft.graph,
            optimisticToken: payload.draft.optimisticToken,
            revisionId: payload.draft.id,
            version: payload.draft.version,
          },
        });
        setRevisions(payload.revisions ?? []);
      } else if (draftResponse.status !== 404) toast.error(await responseError(draftResponse));
      if (catalogResponse.ok) setActions((await catalogResponse.json()).actions);
      if (pipelineResponse.ok) setPipelineOptions((await pipelineResponse.json()).options);
      if (templateResponse.ok) setTemplates((await templateResponse.json()).templates);
    } catch {
      toast.error("Could not load the workflow builder");
    } finally {
      setLoading(false);
    }
  }, [dispatch, flowId, headers]);

  useEffect(() => {
    void load();
  }, [load]);

  function setGraph(graph: AutomationGraph) {
    dispatch({ type: "change", graph });
  }
  function addNode(type: GraphNodeType, position?: { x: number; y: number }) {
    if (type === "trigger" && state.graph.nodes.some((node) => node.type === "trigger"))
      return toast.error("A workflow can only have one trigger");
    const node = createWorkflowNode(
      type,
      position ?? {
        x: 180 + state.graph.nodes.length * 36,
        y: 100 + state.graph.nodes.length * 28,
      },
    );
    setGraph({ ...state.graph, nodes: [...state.graph.nodes, node] });
    dispatch({ type: "select", key: node.key });
    setInspectorOpen(true);
  }

  function removeSelected() {
    if (!selectedNode || selectedNode.type === "trigger") return;
    setGraph({
      nodes: state.graph.nodes.filter((node) => node.key !== selectedNode.key),
      edges: state.graph.edges.filter(
        (edge) => edge.source !== selectedNode.key && edge.target !== selectedNode.key,
      ),
    });
    dispatch({ type: "select", key: null });
  }

  function duplicateSelected() {
    if (!selectedNode || selectedNode.type === "trigger") return;
    const copy = {
      ...selectedNode,
      key: `${selectedNode.type}-${crypto.randomUUID()}`,
      name: `${selectedNode.name} copy`,
      position: { x: selectedNode.position.x + 40, y: selectedNode.position.y + 40 },
    } as AutomationGraphNode;
    setGraph({ ...state.graph, nodes: [...state.graph.nodes, copy] });
    dispatch({ type: "select", key: copy.key });
  }

  function connect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const source = state.graph.nodes.find((node) => node.key === connection.source);
    const sourceHandle =
      source?.type === "condition" ? (connection.sourceHandle ?? "true") : "default";
    const next = addEdge({ ...connection, id: `edge-${crypto.randomUUID()}`, sourceHandle }, edges);
    updateEdges(next);
  }

  function updateEdges(next: Edge[]) {
    setGraph({
      ...state.graph,
      edges: next.map((edge, order) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? "default",
        order,
        ...(typeof edge.label === "string" ? { label: edge.label } : {}),
      })),
    });
  }

  function onNodesChange(changes: NodeChange<WorkflowCanvasNode>[]) {
    const removals = changes.filter((change) => change.type === "remove");
    if (!removals.length) return;
    const next = applyNodeChanges(removals, nodes);
    const removed = new Set(
      nodes
        .filter((node) => !next.some((item) => item.id === node.id) && node.data.type !== "trigger")
        .map((node) => node.id),
    );
    setGraph({
      nodes: state.graph.nodes.filter((node) => !removed.has(node.key)),
      edges: state.graph.edges.filter(
        (edge) => !removed.has(edge.source) && !removed.has(edge.target),
      ),
    });
  }

  const onReconnect: OnReconnect<Edge> = (oldEdge, connection) =>
    updateEdges(reconnectEdge(oldEdge, connection, edges));

  async function save() {
    setWorking("save");
    try {
      const response = await fetch(`/api/automation/flows/${flowId}/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ graph: state.graph, optimisticToken: state.optimisticToken }),
      });
      if (response.status === 409) {
        setConflict(true);
        return;
      }
      if (!response.ok) return toast.error(await responseError(response));
      const { draft } = await response.json();
      dispatch({
        type: "saved",
        optimisticToken: draft.optimisticToken,
        revisionId: draft.revisionId,
      });
      setConflict(false);
      toast.success("Draft saved");
      return draft.optimisticToken as string;
    } catch {
      toast.error("Could not save the draft");
    } finally {
      setWorking(null);
    }
  }

  async function publish() {
    if (issues.length) {
      focusIssue(issues[0]);
      return toast.error("Fix validation issues before publishing");
    }
    const token = state.dirty || !state.optimisticToken ? await save() : state.optimisticToken;
    if (!token) return;
    setWorking("publish");
    try {
      const response = await fetch(`/api/automation/flows/${flowId}/publish`, {
        method: "POST",
        headers,
        body: JSON.stringify({ optimisticToken: token }),
      });
      if (!response.ok) return toast.error(await responseError(response));
      const payload = await response.json();
      if (payload.revision.webhook) setWebhookCredentials(payload.revision.webhook);
      toast.success("Workflow published for new enrollments");
      await load();
    } finally {
      setWorking(null);
    }
  }

  async function applyTemplate(templateId: string) {
    if (state.dirty && !window.confirm("Replace your unsaved draft with this template?")) return;
    const response = await fetch(`/api/automation/templates/${templateId}/apply`, {
      method: "POST",
      headers,
      body: JSON.stringify({ flowId }),
    });
    if (!response.ok) return toast.error(await responseError(response));
    toast.success("Template applied as a draft");
    await load();
  }

  async function rollback(revisionId: string) {
    const response = await fetch(`/api/automation/flows/${flowId}/rollback`, {
      method: "POST",
      headers,
      body: JSON.stringify({ revisionId }),
    });
    if (!response.ok) return toast.error(await responseError(response));
    toast.success("New enrollments now use the selected revision");
    await load();
  }

  function focusIssue(issue?: WorkflowValidationIssue) {
    if (!issue?.nodeKey) return;
    dispatch({ type: "select", key: issue.nodeKey });
    setInspectorOpen(true);
    void instance?.fitView({ nodes: [{ id: issue.nodeKey }], padding: 1.5, duration: 300 });
  }

  if (loading)
    return (
      <div className="flex h-[42rem] items-center justify-center rounded-xl border text-sm text-muted-foreground">
        Loading workflow…
      </div>
    );

  return (
    <Tabs defaultValue="builder" className="min-w-0">
      <Dialog
        open={Boolean(webhookCredentials)}
        onOpenChange={(open) => !open && setWebhookCredentials(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save the inbound webhook secret</DialogTitle>
            <DialogDescription>
              This secret is shown once. Store it before closing this window.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <CopyValue
              label="Webhook URL"
              value={
                webhookCredentials
                  ? `${window.location.origin}/api/webhooks/automation/${webhookCredentials.hookId}`
                  : ""
              }
            />
            <CopyValue label="Signing secret" value={webhookCredentials?.secret ?? ""} />
          </div>
          <DialogFooter>
            <Button onClick={() => setWebhookCredentials(null)}>I saved it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap items-center gap-2">
          <Select onValueChange={applyTemplate}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Use template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {revisions.some((revision) => revision.lifecycle === "superseded") && (
            <Select onValueChange={rollback}>
              <SelectTrigger className="w-40">
                <History className="size-4" />
                <SelectValue placeholder="Roll back" />
              </SelectTrigger>
              <SelectContent>
                {revisions
                  .filter((revision) => revision.lifecycle === "superseded")
                  .map((revision) => (
                    <SelectItem key={`revision-${revision.version}`} value={revision.id}>
                      Revision {revision.version}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: "undo" })}
            disabled={!state.past.length}
            aria-label="Undo"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch({ type: "redo" })}
            disabled={!state.future.length}
            aria-label="Redo"
          >
            <Redo2 className="size-4" />
          </Button>
          <Button variant="outline" onClick={save} disabled={working !== null}>
            <Save className="size-4" />
            {working === "save" ? "Saving…" : "Save draft"}
          </Button>
          <Button onClick={publish} disabled={working !== null}>
            <Check className="size-4" />
            {working === "publish" ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>
      {conflict && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <span>This draft changed elsewhere. Your local edits are still here.</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(state.graph, null, 2))}
            >
              Copy local draft
            </Button>
            <Button size="sm" onClick={load}>
              Reload saved draft
            </Button>
          </div>
        </div>
      )}
      <TabsContent value="builder" className="mt-0">
        <div className="grid min-h-[42rem] min-w-0 grid-rows-[auto_minmax(30rem,1fr)] overflow-hidden rounded-b-xl border-x border-b lg:grid-cols-[240px_minmax(0,1fr)] lg:grid-rows-1 xl:grid-cols-[240px_minmax(0,1fr)_340px]">
          <WorkflowPalette onAdd={addNode} />
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="automation-canvas min-h-[30rem] flex-1">
              <ReactFlow<WorkflowCanvasNode, Edge>
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const type = event.dataTransfer.getData(
                    "application/automation-node",
                  ) as GraphNodeType;
                  if (nodeCatalog.some((item) => item.type === type) && instance)
                    addNode(
                      type,
                      instance.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
                    );
                }}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onInit={setInstance}
                onNodesChange={onNodesChange}
                onNodeDragStop={(_, node) => {
                  const graphNode = state.graph.nodes.find(
                    (item) => item.key.localeCompare(node.id) === 0,
                  );
                  if (graphNode) updateNode(graphNode.key, { position: node.position });
                }}
                onEdgesChange={(changes) => {
                  const removals = changes.filter((change) => change.type === "remove");
                  if (removals.length) updateEdges(applyEdgeChanges(removals, edges));
                }}
                onConnect={connect}
                onReconnect={onReconnect}
                onNodeClick={(_, node) => {
                  dispatch({ type: "select", key: node.id });
                  setInspectorOpen(true);
                }}
                onPaneClick={() => dispatch({ type: "select", key: null })}
                deleteKeyCode={["Backspace", "Delete"]}
                fitView
                minZoom={0.25}
                maxZoom={1.75}
                snapToGrid
                snapGrid={[16, 16]}
                aria-label="Workflow editor"
              >
                <Background gap={16} size={1} />
                <Controls showInteractive={false} />
                <MiniMap pannable zoomable />
                <Panel position="top-left">
                  <ConnectionDialog nodes={state.graph.nodes} onConnect={connect} />
                </Panel>
              </ReactFlow>
            </div>
            <WorkflowValidationPanel
              issues={issues}
              onFocus={(nodeKey) => focusIssue({ nodeKey, message: "" })}
            />
          </div>
          <div className="hidden min-h-0 xl:block">
            <WorkflowInspector
              node={selectedNode}
              pipelineOptions={pipelineOptions}
              actions={actions}
              onChange={(node) => updateNode(node.key, node)}
              onDuplicate={duplicateSelected}
              onDelete={removeSelected}
              onClose={() => dispatch({ type: "select", key: null })}
            />
          </div>
        </div>
        <Sheet open={inspectorOpen && Boolean(selectedNode)} onOpenChange={setInspectorOpen}>
          <SheetContent side="right" className="w-full p-0 sm:max-w-md xl:hidden">
            <SheetTitle className="sr-only">Step settings</SheetTitle>
            <SheetDescription className="sr-only">
              Configure the selected workflow step.
            </SheetDescription>
            <WorkflowInspector
              node={selectedNode}
              pipelineOptions={pipelineOptions}
              actions={actions}
              onChange={(node) => updateNode(node.key, node)}
              onDuplicate={duplicateSelected}
              onDelete={removeSelected}
              onClose={() => setInspectorOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </TabsContent>
      <TabsContent value="runs" className="mt-0 rounded-b-xl border-x border-b">
        <WorkflowRunPanel flowId={flowId} tenantId={tenantId} />
      </TabsContent>
    </Tabs>
  );
}

function ConnectionDialog({
  nodes,
  onConnect,
}: {
  nodes: AutomationGraphNode[];
  onConnect: (connection: Connection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [handle, setHandle] = useState("default");
  const sourceNode = nodes.find((node) => node.key === source);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Cable className="size-4" />
          Connect steps
          <ChevronDown className="size-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect two steps</DialogTitle>
          <DialogDescription>Choose a source, output path, and destination step.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <NodeSelect
            label="From"
            value={source}
            nodes={nodes}
            onChange={(value) => {
              setSource(value);
              setHandle(
                nodes.find((node) => node.key === value)?.type === "condition" ? "true" : "default",
              );
            }}
          />
          <NodeSelect
            label="To"
            value={target}
            nodes={nodes.filter((node) => node.key !== source)}
            onChange={setTarget}
          />
          {sourceNode?.type === "condition" && (
            <Select value={handle} onValueChange={setHandle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">True branch</SelectItem>
                <SelectItem value="false">False branch</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onConnect({ source, target, sourceHandle: handle, targetHandle: null });
              setOpen(false);
            }}
            disabled={!source || !target}
          >
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NodeSelect({
  label,
  value,
  nodes,
  onChange,
}: {
  label: string;
  value: string;
  nodes: AutomationGraphNode[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose step" />
        </SelectTrigger>
        <SelectContent>
          {nodes.map((node) => (
            <SelectItem key={node.key} value={node.key}>
              {node.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function validateGraph(graph: AutomationGraph): WorkflowValidationIssue[] {
  const parsed = automationGraphSchema.safeParse(graph);
  if (!parsed.success)
    return parsed.error.issues.map((issue) => ({
      message: issue.message,
      nodeKey: typeof issue.path[1] === "number" ? graph.nodes[issue.path[1]]?.key : undefined,
    }));
  const issues: WorkflowValidationIssue[] = [];
  const triggers = graph.nodes.filter((node) => node.type === "trigger");
  if (triggers.length !== 1) issues.push({ message: "Add exactly one trigger" });
  for (const node of graph.nodes) {
    if (node.type !== "trigger" && !graph.edges.some((edge) => edge.target === node.key))
      issues.push({ message: `${node.name} needs an incoming connection`, nodeKey: node.key });
    if (node.type === "condition")
      for (const output of ["true", "false"])
        if (!graph.edges.some((edge) => edge.source === node.key && edge.sourceHandle === output))
          issues.push({ message: `${node.name} needs its ${output} branch`, nodeKey: node.key });
  }
  return issues;
}

function CopyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={`copy-${label.replaceAll(" ", "-")}`}>
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          id={`copy-${label.replaceAll(" ", "-")}`}
          value={value}
          readOnly
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => navigator.clipboard.writeText(value)}
        >
          Copy
        </Button>
      </div>
    </div>
  );
}

async function responseError(response: Response) {
  try {
    const body = await response.json();
    return body.error ?? "Request failed";
  } catch {
    return "Request failed";
  }
}
