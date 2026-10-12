import { requireTenantContext, type TenantContext } from "./domain";

export interface ConversationPersistence<TThread = unknown, TEvent = unknown> {
  findThread(tenantId: string, threadId: string): Promise<TThread | null>;
  listEvents(tenantId: string, threadId: string): Promise<TEvent[]>;
}

export class TenantConversationRepository<TThread = unknown, TEvent = unknown> {
  readonly tenantId: string;

  constructor(
    context: TenantContext,
    private readonly persistence: ConversationPersistence<TThread, TEvent>,
  ) {
    this.tenantId = requireTenantContext(context);
  }

  findThread(threadId: string): Promise<TThread | null> {
    if (!threadId.trim()) throw new Error("Thread ID is required");
    return this.persistence.findThread(this.tenantId, threadId);
  }

  listEvents(threadId: string): Promise<TEvent[]> {
    if (!threadId.trim()) throw new Error("Thread ID is required");
    return this.persistence.listEvents(this.tenantId, threadId);
  }
}
