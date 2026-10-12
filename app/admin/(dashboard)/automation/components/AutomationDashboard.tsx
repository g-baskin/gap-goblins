"use client";

import { useState } from "react";
import { Label } from "@/components/shadcn/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import { AutomationCallTasks } from "./AutomationCallTasks";
import { AutomationFlowsTable } from "./AutomationFlowsTable";
import { AutomationSectionCards } from "./AutomationSectionCards";
import { CreateAutomationFlowDialog } from "./CreateAutomationFlowDialog";

type AvailableTenant = { id: string; name: string; slug: string; role: string };

export function AutomationDashboard({ tenants }: { tenants: AvailableTenant[] }) {
  const [tenantId, setTenantId] = useState(tenants.length === 1 ? (tenants[0]?.id ?? "") : "");

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">Automation</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Build workflows, recover failed runs, and manage human call tasks.
          </p>
        </div>
        {tenantId && <CreateAutomationFlowDialog tenantId={tenantId} />}
      </div>

      <div className="mb-6 max-w-sm space-y-2">
        <Label htmlFor="automation-tenant">Tenant</Label>
        <Select value={tenantId} onValueChange={setTenantId}>
          <SelectTrigger id="automation-tenant" className="w-full">
            <SelectValue placeholder="Select a tenant" />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tenantId ? (
        <div className="space-y-6" key={tenantId}>
          <AutomationSectionCards tenantId={tenantId} />
          <AutomationFlowsTable tenantId={tenantId} />
          <AutomationCallTasks tenantId={tenantId} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {tenants.length === 0
            ? "No active tenant memberships are available."
            : "Select a tenant to manage its automations."}
        </div>
      )}
    </div>
  );
}
