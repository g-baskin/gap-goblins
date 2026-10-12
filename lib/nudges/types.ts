export const HUMAN_NUDGE_STATUSES = ["pending", "acted", "dismissed", "snoozed"] as const;
export type HumanNudgeStatus = (typeof HUMAN_NUDGE_STATUSES)[number];

export const HUMAN_NUDGE_PRIORITIES = ["low", "medium", "high"] as const;
export type HumanNudgePriority = (typeof HUMAN_NUDGE_PRIORITIES)[number];

export const HUMAN_NUDGE_SUGGESTED_ACTIONS = [
  "call",
  "text",
  "email",
  "send_card",
  "review",
] as const;
export type HumanNudgeSuggestedAction = (typeof HUMAN_NUDGE_SUGGESTED_ACTIONS)[number];

export interface ListHumanNudgesParams {
  status?: HumanNudgeStatus | "all";
  priority?: HumanNudgePriority | "all";
  contactId?: string;
  dealId?: string;
  due?: "all" | "due" | "upcoming";
  page: number;
  limit: number;
}

export interface HumanNudgeInput {
  contactId?: string | null;
  dealId?: string | null;
  nudgeType: string;
  title: string;
  message: string;
  suggestedAction?: HumanNudgeSuggestedAction | null;
  priority?: HumanNudgePriority;
  dueDate?: string;
  assignedToUserId?: string | null;
  dedupKey?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
}

export interface HumanNudgeListResult {
  nudges: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
}
