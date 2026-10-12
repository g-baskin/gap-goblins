"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { Badge } from "@/components/shadcn/ui/badge";
import type { GraphNodeType } from "@/lib/automation/graph/types";
import { cn } from "@/lib/utils";
import { nodeCatalog } from "./workflow-node-catalog";

export type WorkflowCanvasNode = Node<
  {
    label: string;
    type: GraphNodeType;
    invalid?: boolean;
  },
  "workflow"
>;

export function WorkflowNode({ data, selected }: NodeProps<WorkflowCanvasNode>) {
  const item = nodeCatalog.find((entry) => entry.type === data.type);
  const Icon = item?.icon;
  const isTrigger = data.type === "trigger";
  const isCondition = data.type === "condition";

  return (
    <div
      className={cn(
        "w-56 rounded-lg border bg-card text-card-foreground shadow-sm transition-[border-color,box-shadow]",
        selected && "border-primary ring-2 ring-primary/20",
        data.invalid && "border-destructive",
      )}
    >
      {!isTrigger && (
        <Handle type="target" position={Position.Left} aria-label="Incoming connection" />
      )}
      <div className="flex min-h-20 items-start gap-3 p-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          {Icon && <Icon className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <Badge variant="outline" className="mb-1 rounded-md text-[10px] uppercase tracking-wide">
            {item?.label}
          </Badge>
          <p className="truncate text-sm font-medium">{data.label}</p>
          {data.invalid && <p className="mt-1 text-xs text-destructive">Needs attention</p>}
        </div>
      </div>
      {isCondition ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: "35%" }}
            aria-label="True output"
          />
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            style={{ top: "70%" }}
            aria-label="False output"
          />
          <span className="pointer-events-none absolute right-3 top-[26%] text-[10px] text-muted-foreground">
            True
          </span>
          <span className="pointer-events-none absolute right-3 top-[61%] text-[10px] text-muted-foreground">
            False
          </span>
        </>
      ) : (
        <Handle
          id="default"
          type="source"
          position={Position.Right}
          aria-label="Next step connection"
        />
      )}
    </div>
  );
}
