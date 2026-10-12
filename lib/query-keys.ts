/**
 * Centralized React Query key factory.
 *
 * Keep cache reads, invalidation, and mutations pointed at these builders
 * instead of hand-writing tuple literals in components.
 */

type QueryParams = Record<string, unknown>;

const resource = <Name extends string>(name: Name) => ({
  all: () => [name] as const,
  lists: () => [name, "list"] as const,
  list: (params?: QueryParams) =>
    params ? ([name, "list", params] as const) : ([name, "list"] as const),
  details: () => [name, "detail"] as const,
  detail: (id: string) => [name, "detail", id] as const,
});

export const queryKeys = {
  admin: {
    dashboard: () => ["admin", "dashboard"] as const,
    settings: () => ["admin", "settings"] as const,
    siteSettings: () => ["admin", "site-settings"] as const,
    users: () => ["admin", "users"] as const,
    sessions: () => ["admin", "security", "sessions"] as const,
  },
  automation: {
    flows: resource("automation-flows"),
    stats: () => ["automation", "stats"] as const,
  },
  crm: {
    contacts: resource("crm-contacts"),
    deals: resource("crm-deals"),
    pipelineDeals: () => ["crm", "pipeline-deals"] as const,
    metrics: () => ["crm", "metrics"] as const,
    activity: () => ["crm", "activity"] as const,
  },
  newsletter: {
    issues: resource("newsletters"),
    stats: () => ["newsletter", "stats"] as const,
    settings: () => ["newsletter", "settings"] as const,
    publicSettings: () => ["newsletter", "settings", "public"] as const,
    queueStats: () => ["newsletter", "queue", "stats"] as const,
  },
  notifications: {
    all: () => ["notifications"] as const,
    list: () => ["notifications", "list"] as const,
    detail: (id: string) => ["notifications", "detail", id] as const,
  },
  outreach: {
    campaigns: resource("outreach-campaigns"),
    blocklist: resource("outreach-blocklist"),
    health: () => ["outreach", "health"] as const,
    replies: resource("outreach-replies"),
    senderAccounts: resource("outreach-sender-accounts"),
    tags: () => ["outreach", "campaigns", "tags"] as const,
  },
} as const;
