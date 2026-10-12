"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/shadcn/ui/button";
import { Input } from "@/components/shadcn/ui/input";
import type { GraphNodeType } from "@/lib/automation/graph/types";
import { nodeCatalog } from "./workflow-node-catalog";

export function WorkflowPalette({ onAdd }: { onAdd: (type: GraphNodeType) => void }) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search
      ? nodeCatalog.filter((item) =>
          `${item.label} ${item.description} ${item.group}`.toLowerCase().includes(search),
        )
      : nodeCatalog;
  }, [query]);

  return (
    <aside
      className="flex h-full min-h-0 flex-col border-b bg-card lg:border-r lg:border-b-0"
      aria-label="Workflow node palette"
    >
      <div className="border-b p-3">
        <h2 className="text-sm font-semibold">Add a step</h2>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search steps"
            className="pl-9"
          />
        </div>
      </div>
      <div className="grid max-h-48 gap-1 overflow-y-auto p-2 sm:grid-cols-2 lg:max-h-none lg:grid-cols-1">
        {items.map((item) => (
          <Button
            key={item.type}
            type="button"
            variant="ghost"
            className="h-auto min-h-14 justify-start gap-3 px-3 py-2 text-left"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("application/automation-node", item.type);
              event.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => onAdd(item.type)}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {item.description}
              </span>
            </span>
          </Button>
        ))}
      </div>
    </aside>
  );
}
