import type {
  CommunicationDirection,
  CommunicationEventKind,
  CommunicationStatus,
  ConversationChannel,
} from "@/lib/conversations";

export type ComposeChannel = Exclude<ConversationChannel, "voice">;
export type ConversationFilter = "all" | "unread" | "recent" | "starred";

export interface DemoTimelineEvent {
  id: string;
  channel: ConversationChannel;
  kind: CommunicationEventKind | "assignment" | "appointment" | "opportunity";
  direction?: CommunicationDirection;
  status?: CommunicationStatus;
  occurredAt: string;
  actor: string;
  body?: string;
  label?: string;
  metadata?: string;
  presentation?: "text" | "link" | "media" | "reaction";
  href?: string;
}

export interface DemoConversation {
  id: string;
  contact: {
    id: string;
    name: string;
    initials: string;
    company: string;
    title: string;
    email: string;
    phone: string;
    location: string;
  };
  assignee: string;
  owner: string;
  followers: readonly string[];
  starred: boolean;
  status: "open" | "waiting";
  unreadCount: number;
  lastActivityAt: string;
  preview: string;
  channels: readonly ConversationChannel[];
  composeAvailability: Readonly<Record<ComposeChannel, string | null>>;
  crm: {
    stage: string;
    opportunity: string;
    value: string;
    source: string;
    nextAppointment: string;
    tags: readonly string[];
    triggers: Readonly<Record<string, string>>;
    fields: Readonly<Record<string, string>>;
  };
  events: readonly DemoTimelineEvent[];
}

function compactConversation(
  id: string,
  name: string,
  initials: string,
  company: string,
  preview: string,
  lastActivityAt: string,
  unreadCount: number,
  channel: ComposeChannel,
): DemoConversation {
  const slug = name.toLowerCase().replaceAll(" ", ".");
  return {
    id,
    contact: {
      id: `contact-${id}`,
      name,
      initials,
      company,
      title: "Operations Lead",
      email: `${slug}@example.com`,
      phone: "+1 (555) 010-0100",
      location: "United States",
    },
    assignee: "Alex Morgan",
    owner: "Alex Morgan",
    followers: [],
    starred: false,
    status: "open",
    unreadCount,
    lastActivityAt,
    preview,
    channels: [channel],
    composeAvailability: {
      web_chat: channel === "web_chat" ? null : "No active web chat session for this contact.",
      sms: channel === "sms" ? null : "SMS consent has not been recorded for this contact.",
      email: channel === "email" ? null : "No deliverable email address is available.",
    },
    crm: {
      stage: "New lead",
      opportunity: "Not created",
      value: "Not set",
      source: "Website inquiry",
      nextAppointment: "No appointment scheduled",
      tags: ["New inquiry"],
      triggers: { "Evaluation status": "New inquiry" },
      fields: { "Contact source": "Website inquiry", "Preferred channel": channelLabels[channel] },
    },
    events: [
      {
        id: `event-${id}`,
        channel,
        kind: "message",
        direction: "inbound",
        status: "received",
        occurredAt: lastActivityAt,
        actor: name,
        body: preview,
      },
    ],
  };
}

const channelLabels: Record<ComposeChannel, string> = {
  web_chat: "Web chat",
  sms: "SMS",
  email: "Email",
};

export const demoConversations: readonly DemoConversation[] = [
  {
    id: "thread-maya-chen",
    contact: {
      id: "contact-maya-chen",
      name: "Maya Chen",
      initials: "MC",
      company: "Northstar Home Services",
      title: "Operations Director",
      email: "maya@northstar.example",
      phone: "+1 (415) 555-0142",
      location: "San Francisco, CA",
    },
    assignee: "Alex Morgan",
    owner: "Alex Morgan",
    followers: ["Taylor Reed"],
    starred: true,
    status: "open",
    unreadCount: 2,
    lastActivityAt: "2026-09-08T14:42:00-07:00",
    preview: "Thursday at 10 works. Can you send the rollout outline?",
    channels: ["web_chat", "sms", "email", "voice"],
    composeAvailability: { web_chat: null, sms: null, email: null },
    crm: {
      stage: "Proposal",
      opportunity: "Northstar automation rollout",
      value: "$18,500",
      source: "Website consultation",
      nextAppointment: "Thu, Sep 10 · 10:00 AM PT",
      tags: ["High intent", "Operations", "West Coast", "Pilot ready"],
      triggers: {
        "Evaluation status": "Outline requested",
        "Pricing guide": "Sent",
        "Review meeting": "Scheduled",
      },
      fields: {
        "Contact source": "Website consultation",
        "Preferred channel": "SMS",
        "Pilot locations": "2",
      },
    },
    events: [
      {
        id: "evt-chat-1",
        channel: "web_chat",
        kind: "message",
        direction: "inbound",
        status: "received",
        occurredAt: "2026-09-08T09:04:00-07:00",
        actor: "Maya Chen",
        body: "Hi — we are comparing options for consolidating our service follow-up. Can your team handle SMS and email from one place?",
      },
      {
        id: "evt-chat-2",
        channel: "web_chat",
        kind: "message",
        direction: "outbound",
        status: "read",
        occurredAt: "2026-09-08T09:08:00-07:00",
        actor: "Alex Morgan",
        body: "Yes. We keep the contact history together across web chat, SMS, email, and calls. I can send a short rollout outline today.",
      },
      {
        id: "evt-assignment",
        channel: "web_chat",
        kind: "assignment",
        occurredAt: "2026-09-08T09:09:00-07:00",
        actor: "System",
        label: "Conversation assigned",
        metadata: "Alex Morgan · Sales",
      },
      {
        id: "evt-sms-1",
        channel: "sms",
        kind: "message",
        direction: "inbound",
        status: "received",
        occurredAt: "2026-09-08T10:21:00-07:00",
        actor: "Maya Chen",
        body: "Perfect. We have 12 dispatchers and want to start with two locations.",
        presentation: "media",
      },
      {
        id: "evt-email-1",
        channel: "email",
        kind: "message",
        direction: "outbound",
        status: "delivered",
        occurredAt: "2026-09-08T11:16:00-07:00",
        actor: "Alex Morgan",
        label: "Two-location rollout outline",
        body: "Maya, I mapped a phased rollout for your two pilot locations. The outline covers shared ownership, response routing, and reporting milestones.",
        presentation: "link",
        href: "https://northstar.example/rollout-outline",
      },
      {
        id: "evt-call-ringing",
        channel: "voice",
        kind: "call_ringing",
        direction: "outbound",
        status: "ringing",
        occurredAt: "2026-09-08T13:30:00-07:00",
        actor: "Alex Morgan",
        label: "Outbound call ringing",
      },
      {
        id: "evt-call-answered",
        channel: "voice",
        kind: "call_answered",
        direction: "outbound",
        status: "in_progress",
        occurredAt: "2026-09-08T13:30:08-07:00",
        actor: "Maya Chen",
        label: "Call answered",
      },
      {
        id: "evt-call-complete",
        channel: "voice",
        kind: "call_completed",
        direction: "outbound",
        status: "completed",
        occurredAt: "2026-09-08T13:42:00-07:00",
        actor: "Alex Morgan",
        label: "Call completed · 11m 52s",
        metadata: "Recording off · Transcript unavailable in Phase 0",
      },
      {
        id: "evt-opportunity",
        channel: "web_chat",
        kind: "opportunity",
        occurredAt: "2026-09-08T13:45:00-07:00",
        actor: "Alex Morgan",
        label: "Opportunity advanced",
        metadata: "Qualified → Proposal · $18,500",
      },
      {
        id: "evt-appointment",
        channel: "web_chat",
        kind: "appointment",
        occurredAt: "2026-09-08T13:47:00-07:00",
        actor: "Alex Morgan",
        label: "Rollout review scheduled",
        metadata: "Thu, Sep 10 · 10:00 AM PT",
      },
      {
        id: "evt-sms-2",
        channel: "sms",
        kind: "message",
        direction: "inbound",
        status: "received",
        occurredAt: "2026-09-08T14:42:00-07:00",
        actor: "Maya Chen",
        body: "Thursday at 10 works. Can you send the rollout outline here too?",
        presentation: "reaction",
      },
    ],
  },
  {
    id: "thread-jordan-bell",
    contact: {
      id: "contact-jordan-bell",
      name: "Jordan Bell",
      initials: "JB",
      company: "Bell & Pine Dental",
      title: "Practice Manager",
      email: "jordan@bellpine.example",
      phone: "+1 (312) 555-0198",
      location: "Chicago, IL",
    },
    assignee: "Alex Morgan",
    owner: "Alex Morgan",
    followers: [],
    starred: false,
    status: "waiting",
    unreadCount: 0,
    lastActivityAt: "2026-09-08T11:52:00-07:00",
    preview: "I’ll confirm with our office manager and reply tomorrow.",
    channels: ["email", "voice"],
    composeAvailability: {
      web_chat: "No active web chat session for this contact.",
      sms: "SMS consent has not been recorded for this contact.",
      email: null,
    },
    crm: {
      stage: "Discovery",
      opportunity: "Patient follow-up pilot",
      value: "$6,400",
      source: "Partner referral",
      nextAppointment: "No appointment scheduled",
      tags: ["Dental", "Referral"],
      triggers: { "Evaluation status": "Awaiting reply" },
      fields: { "Contact source": "Partner referral", "Preferred channel": "Email" },
    },
    events: [
      {
        id: "evt-jordan-email",
        channel: "email",
        kind: "message",
        direction: "inbound",
        status: "received",
        occurredAt: "2026-09-08T11:52:00-07:00",
        actor: "Jordan Bell",
        label: "Re: Patient follow-up pilot",
        body: "I’ll confirm with our office manager and reply tomorrow.",
      },
    ],
  },
  {
    id: "thread-sofia-reyes",
    contact: {
      id: "contact-sofia-reyes",
      name: "Sofia Reyes",
      initials: "SR",
      company: "Reyes Property Group",
      title: "Founder",
      email: "sofia@reyesproperty.example",
      phone: "+1 (646) 555-0137",
      location: "New York, NY",
    },
    assignee: "Unassigned",
    owner: "Unassigned",
    followers: ["Alex Morgan"],
    starred: true,
    status: "open",
    unreadCount: 1,
    lastActivityAt: "2026-09-07T16:18:00-07:00",
    preview: "Could someone show me how lead assignment works?",
    channels: ["web_chat"],
    composeAvailability: {
      web_chat: null,
      sms: "No mobile number has been verified for SMS.",
      email: "No deliverable email address is available.",
    },
    crm: {
      stage: "New lead",
      opportunity: "Not created",
      value: "—",
      source: "Website chat",
      nextAppointment: "No appointment scheduled",
      tags: ["Real estate", "New"],
      triggers: { "Evaluation status": "New inquiry" },
      fields: { "Contact source": "Website chat", "Preferred channel": "Web chat" },
    },
    events: [
      {
        id: "evt-sofia-chat",
        channel: "web_chat",
        kind: "message",
        direction: "inbound",
        status: "received",
        occurredAt: "2026-09-07T16:18:00-07:00",
        actor: "Sofia Reyes",
        body: "Could someone show me how lead assignment works?",
      },
    ],
  },
  compactConversation(
    "thread-avery-wilson",
    "Avery Wilson",
    "AW",
    "Harbor Field Services",
    "Thanks for sending the implementation checklist.",
    "2026-09-08T10:37:00-07:00",
    3,
    "sms",
  ),
  compactConversation(
    "thread-devon-price",
    "Devon Price",
    "DP",
    "Juniper Wellness",
    "Can we add another teammate to the evaluation?",
    "2026-09-08T08:26:00-07:00",
    1,
    "web_chat",
  ),
  compactConversation(
    "thread-riley-khan",
    "Riley Khan",
    "RK",
    "Summit Repair Co.",
    "The shared inbox looks like a strong fit.",
    "2026-09-07T15:20:00-07:00",
    1,
    "email",
  ),
  compactConversation(
    "thread-cameron-lee",
    "Cameron Lee",
    "CL",
    "Lakeview Electric",
    "Please resend the calendar link when available.",
    "2026-09-06T13:04:00-07:00",
    2,
    "sms",
  ),
  compactConversation(
    "thread-morgan-patel",
    "Morgan Patel",
    "MP",
    "Atlas Property Care",
    "We will review this with our service managers.",
    "2026-09-05T09:46:00-07:00",
    1,
    "email",
  ),
];

const recentCutoff = Date.parse("2026-09-08T00:00:00-07:00");

export function filterDemoConversations(
  conversations: readonly DemoConversation[],
  query: string,
  filter: ConversationFilter,
): readonly DemoConversation[] {
  const normalizedQuery = query.trim().toLowerCase();

  return conversations
    .filter((conversation) => {
      if (filter === "unread" && conversation.unreadCount === 0) return false;
      if (filter === "recent" && Date.parse(conversation.lastActivityAt) < recentCutoff)
        return false;
      if (filter === "starred" && !conversation.starred) return false;
      if (!normalizedQuery) return true;

      return [
        conversation.contact.name,
        conversation.contact.company,
        conversation.contact.email,
        conversation.contact.phone,
        conversation.preview,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    })
    .sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt));
}

export function getComposeDisabledReason(
  conversation: DemoConversation,
  channel: ComposeChannel,
  draft: string,
): string | null {
  const unavailableReason = conversation.composeAvailability[channel];
  if (unavailableReason) return unavailableReason;
  if (!draft.trim()) return "Write a message before sending.";
  return "Sending is disabled in the Phase 0 local demo.";
}
