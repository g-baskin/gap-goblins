import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { automationCallTasks } from "@/lib/db/schema";
import { requireAutomationTenant } from "../_lib";

const statusSchema = z.enum(["open", "completed", "skipped", "cancelled"]);

export async function GET(request: Request) {
  const auth = await requireAutomationTenant(request);
  if (auth instanceof Response) return auth;
  const status = statusSchema.safeParse(new URL(request.url).searchParams.get("status"));
  const rows = await db
    .select()
    .from(automationCallTasks)
    .where(
      and(
        eq(automationCallTasks.tenantId, auth.tenant.tenantId),
        ...(status.success ? [eq(automationCallTasks.status, status.data)] : []),
      ),
    )
    .orderBy(asc(automationCallTasks.dueAt))
    .limit(500);
  const now = Date.now();
  return Response.json({
    tasks: rows.map((task) => ({
      ...task,
      displayStatus:
        task.status === "open" && new Date(task.dueAt).getTime() < now ? "overdue" : task.status,
    })),
  });
}
