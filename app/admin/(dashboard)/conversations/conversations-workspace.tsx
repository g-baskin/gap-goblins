"use client";

import {
  IconArrowLeft,
  IconArrowsSort,
  IconBell,
  IconBellOff,
  IconBrandHipchat,
  IconBriefcase,
  IconCalendarEvent,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconClock,
  IconCurrencyDollar,
  IconDownload,
  IconExternalLink,
  IconFilter,
  IconInbox,
  IconInfoCircle,
  IconMail,
  IconMessage,
  IconNotes,
  IconPaperclip,
  IconPhone,
  IconSearch,
  IconSend,
  IconSparkles,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/shadcn/ui/avatar";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/shadcn/ui/sheet";
import type { ConversationChannel } from "@/lib/conversations";
import {
  type ComposeChannel,
  type ConversationFilter,
  type DemoConversation,
  type DemoTimelineEvent,
  demoConversations,
  filterDemoConversations,
  getComposeDisabledReason,
} from "./conversations-demo";

const channelLabels: Record<ConversationChannel, string> = {
  web_chat: "Web chat",
  sms: "SMS",
  email: "Email",
  voice: "Voice",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function ChannelIcon({
  channel,
  className = "size-4",
}: {
  channel: ConversationChannel;
  className?: string;
}) {
  const Icon =
    channel === "web_chat"
      ? IconBrandHipchat
      : channel === "sms"
        ? IconMessage
        : channel === "email"
          ? IconMail
          : IconPhone;
  return <Icon aria-hidden="true" className={className} />;
}

function IconButton({
  label,
  children,
  selected,
  disabled = false,
  onClick,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      disabled={disabled}
      title={disabled ? `${label} is unavailable in this demo` : label}
      onClick={onClick}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-primary aria-pressed:text-primary-foreground ${className}`}
    >
      {children}
    </button>
  );
}

function ChannelRail() {
  const [selected, setSelected] = useState("inbox");
  const channels = [
    ["inbox", "All conversations", IconInbox],
    ["download", "Incoming conversations", IconDownload],
    ["search", "Search conversations", IconSearch],
    ["contacts", "Contact conversations", IconUser],
    ["team", "Team inbox", IconUsers],
    ["automation", "Automation activity", IconSparkles],
    ["notes", "Conversation notes", IconNotes],
  ] as const;

  return (
    <nav
      aria-label="Conversation tools"
      className="hidden w-11 shrink-0 flex-col items-center border-r bg-background py-1.5 md:flex"
    >
      {channels.map(([id, label, Icon], index) => (
        <IconButton
          key={id}
          label={label}
          selected={selected === id}
          onClick={() => setSelected(id)}
          className={index === 4 ? "mt-2 border-t" : ""}
        >
          <Icon aria-hidden="true" className="size-[17px]" />
        </IconButton>
      ))}
    </nav>
  );
}

function ConversationRow({
  conversation,
  selected,
  checked,
  starred,
  onCheck,
  onSelect,
  onStar,
}: {
  conversation: DemoConversation;
  selected: boolean;
  checked: boolean;
  starred: boolean;
  onCheck: (checked: boolean) => void;
  onSelect: () => void;
  onStar: () => void;
}) {
  return (
    <li
      className={`grid grid-cols-[24px_1fr_28px] items-start gap-1 border-b px-2 py-2 transition-colors ${selected ? "border-l-2 border-l-primary bg-muted/70" : "border-l-2 border-l-transparent bg-background hover:bg-muted/40"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheck(event.target.checked)}
        aria-label={`Select conversation with ${conversation.contact.name}`}
        className="mt-2.5 size-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className="grid min-w-0 grid-cols-[30px_1fr] gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="relative mt-0.5">
          <Avatar className="size-7">
            <AvatarFallback className="text-[10px]">{conversation.contact.initials}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full border bg-background text-primary">
            <ChannelIcon channel={conversation.channels[0] ?? "web_chat"} className="size-2.5" />
          </span>
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span
              className={`truncate text-xs ${conversation.unreadCount ? "font-semibold" : "font-medium"}`}
            >
              {conversation.contact.name}
            </span>
            <time
              className="ml-auto shrink-0 text-[10px] text-muted-foreground"
              dateTime={conversation.lastActivityAt}
            >
              {timeFormatter.format(new Date(conversation.lastActivityAt))}
            </time>
            {conversation.unreadCount > 0 && (
              <span className="inline-flex min-w-4 items-center justify-center rounded bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                <span aria-hidden="true">{conversation.unreadCount}</span>
                <span className="sr-only">{conversation.unreadCount} unread messages</span>
              </span>
            )}
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {conversation.preview}
          </span>
        </span>
      </button>
      <IconButton
        label={`${starred ? "Unstar" : "Star"} ${conversation.contact.name}`}
        selected={starred}
        onClick={onStar}
      >
        {starred ? (
          <IconStarFilled aria-hidden="true" className="size-3.5" />
        ) : (
          <IconStar aria-hidden="true" className="size-3.5" />
        )}
      </IconButton>
    </li>
  );
}

function InboxPanel({
  conversations,
  selectedId,
  filter,
  query,
  starredIds,
  onFilter,
  onQuery,
  onSelect,
  onStar,
}: {
  conversations: readonly DemoConversation[];
  selectedId: string;
  filter: ConversationFilter;
  query: string;
  starredIds: ReadonlySet<string>;
  onFilter: (filter: ConversationFilter) => void;
  onQuery: (query: string) => void;
  onSelect: (conversation: DemoConversation) => void;
  onStar: (id: string) => void;
}) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const allChecked =
    conversations.length > 0 && conversations.every((item) => checkedIds.has(item.id));
  const filters: { id: ConversationFilter; label: string; Icon?: typeof IconClock }[] = [
    { id: "unread", label: "Unread" },
    { id: "all", label: "All" },
    { id: "recent", label: "Recent", Icon: IconClock },
    { id: "starred", label: "Starred", Icon: IconStar },
  ];

  return (
    <section
      className="flex w-full shrink-0 flex-col border-r bg-background md:w-[292px] xl:w-[304px]"
      aria-label="Conversation list"
    >
      <div className="border-b px-3 pt-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Team inbox</h2>
          <div className="ml-auto flex gap-0.5">
            <IconButton label="Filter inbox">
              <IconFilter aria-hidden="true" className="size-4" />
            </IconButton>
            <IconButton label="Sort inbox">
              <IconArrowsSort aria-hidden="true" className="size-4" />
            </IconButton>
          </div>
        </div>
        <label className="relative mt-2 block">
          <span className="sr-only">Search conversations</span>
          <IconSearch
            aria-hidden="true"
            className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search conversations"
            className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
        <fieldset className="mt-2 grid min-w-0 grid-cols-4 border-0 p-0" aria-label="Inbox filters">
          {filters.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => onFilter(id)}
              className="relative flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:after:absolute aria-pressed:after:inset-x-2 aria-pressed:after:bottom-0 aria-pressed:after:h-0.5 aria-pressed:after:bg-primary"
            >
              {id === "unread" ? (
                <span className="rounded bg-primary px-1 text-[9px] leading-4 text-primary-foreground">
                  {demoConversations.reduce((sum, item) => sum + item.unreadCount, 0)}
                </span>
              ) : Icon ? (
                <Icon aria-hidden="true" className="size-4" />
              ) : (
                <IconInbox aria-hidden="true" className="size-4" />
              )}
              {label}
            </button>
          ))}
        </fieldset>
      </div>
      <label className="flex min-h-10 items-center gap-2 border-b px-3 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(event) =>
            setCheckedIds(
              event.target.checked ? new Set(conversations.map((item) => item.id)) : new Set(),
            )
          }
          className="size-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        Select all
        <span className="ml-auto">{conversations.length}</span>
      </label>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length ? (
          <ul aria-label="Conversation threads">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                selected={selectedId === conversation.id}
                checked={checkedIds.has(conversation.id)}
                starred={starredIds.has(conversation.id)}
                onCheck={(checked) =>
                  setCheckedIds((current) => {
                    const next = new Set(current);
                    if (checked) next.add(conversation.id);
                    else next.delete(conversation.id);
                    return next;
                  })
                }
                onSelect={() => onSelect(conversation)}
                onStar={() => onStar(conversation.id)}
              />
            ))}
          </ul>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <IconSearch aria-hidden="true" className="mb-2 size-7 text-muted-foreground" />
            <p className="text-sm font-medium">No conversations found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try another search or inbox filter.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SystemEvent({ event }: { event: DemoTimelineEvent }) {
  const Icon =
    event.kind === "appointment"
      ? IconCalendarEvent
      : event.kind === "opportunity"
        ? IconBriefcase
        : IconUsers;
  return (
    <li className="flex items-start gap-2 py-1">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
        <Icon aria-hidden="true" className="size-3" />
      </span>
      <div className="min-w-0 text-[11px] text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">{event.label}</span> by {event.actor}
        </p>
        {event.metadata && <p>{event.metadata}</p>}
        <time dateTime={event.occurredAt}>{dateFormatter.format(new Date(event.occurredAt))}</time>
      </div>
    </li>
  );
}

function MessageEvent({ event }: { event: DemoTimelineEvent }) {
  const outbound = event.direction === "outbound";
  return (
    <li className={`flex items-start gap-2 ${outbound ? "justify-end" : "justify-start"}`}>
      {!outbound && (
        <Avatar className="mt-1 size-7">
          <AvatarFallback className="text-[10px]">
            {event.actor
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      )}
      <article
        className={`max-w-[88%] rounded-md px-3 py-2 text-xs sm:max-w-[78%] ${outbound ? "bg-primary/10" : "border bg-background"}`}
        aria-label={`${outbound ? "Outgoing" : "Incoming"} ${channelLabels[event.channel]} from ${event.actor}`}
      >
        {event.presentation === "media" && (
          <div className="mb-2 flex h-36 w-[min(22rem,70vw)] items-center justify-center rounded border bg-muted text-muted-foreground">
            <span className="flex flex-col items-center gap-1">
              <IconPaperclip aria-hidden="true" className="size-5" />
              <span>Media preview unavailable in demo</span>
            </span>
          </div>
        )}
        {event.label && <p className="mb-1 font-semibold">{event.label}</p>}
        {event.href ? (
          <a
            href={event.href}
            className="break-all text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {event.body}
            <IconExternalLink aria-hidden="true" className="ml-1 inline size-3" />
          </a>
        ) : event.body ? (
          <p className="whitespace-pre-wrap leading-5">{event.body}</p>
        ) : null}
        {event.presentation === "reaction" && (
          <p className="mt-1 text-[11px] text-muted-foreground">Reaction recorded</p>
        )}
        <footer className="mt-1 flex justify-end gap-1 text-[10px] text-muted-foreground">
          <time dateTime={event.occurredAt}>
            {timeFormatter.format(new Date(event.occurredAt))}
          </time>
          {event.status && <span>· {event.status.replace("_", " ")}</span>}
        </footer>
      </article>
    </li>
  );
}

function Timeline({ conversation }: { conversation: DemoConversation }) {
  return (
    <ol
      className="space-y-3 px-3 py-4 sm:px-5"
      aria-label={`Timeline with ${conversation.contact.name}`}
    >
      <li className="flex items-center gap-2 text-[10px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        Recent activity
      </li>
      {[...conversation.events]
        .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
        .map((event) =>
          event.kind === "message" || event.channel === "voice" ? (
            <MessageEvent key={event.id} event={event} />
          ) : (
            <SystemEvent key={event.id} event={event} />
          ),
        )}
    </ol>
  );
}

function Composer({ conversation }: { conversation: DemoConversation }) {
  const [channel, setChannel] = useState<ComposeChannel>(
    conversation.channels.find((item): item is ComposeChannel => item !== "voice") ?? "web_chat",
  );
  const [draft, setDraft] = useState("");
  const reason = getComposeDisabledReason(conversation, channel, draft);
  return (
    <form
      className="border-t bg-background p-2"
      onSubmit={(event) => event.preventDefault()}
      aria-label="Message composer"
    >
      <div className="rounded-md border bg-background focus-within:border-ring">
        <label className="sr-only" htmlFor={`message-${conversation.id}`}>
          Message {conversation.contact.name}
        </label>
        <textarea
          id={`message-${conversation.id}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message"
          aria-describedby="compose-status"
          className="block min-h-14 w-full resize-none bg-transparent px-3 py-2 text-xs outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-1 border-t px-1.5 py-1">
          <label className="sr-only" htmlFor={`channel-${conversation.id}`}>
            Compose channel
          </label>
          <select
            id={`channel-${conversation.id}`}
            value={channel}
            onChange={(event) => setChannel(event.target.value as ComposeChannel)}
            className="h-7 rounded border bg-background px-2 pr-7 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="web_chat">Web chat</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
          <IconButton label="Attach file" disabled>
            <IconPaperclip aria-hidden="true" className="size-4" />
          </IconButton>
          <Button
            type="submit"
            size="sm"
            disabled
            className="ml-auto h-7"
            aria-describedby="compose-status"
          >
            <IconSend aria-hidden="true" className="size-3.5" /> Send
          </Button>
        </div>
      </div>
      <p
        id="compose-status"
        role="status"
        className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"
      >
        <IconInfoCircle aria-hidden="true" className="size-3" />
        {reason}
      </p>
    </form>
  );
}

function DetailGroup({
  title,
  rows,
  query,
}: {
  title: string;
  rows: Readonly<Record<string, string>>;
  query: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const filtered = Object.entries(rows).filter(([label, value]) =>
    `${label} ${value}`.toLowerCase().includes(query.toLowerCase()),
  );
  if (query && filtered.length === 0) return null;
  return (
    <section className="border-b">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-10 w-full items-center px-3 text-left text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {title}
        {expanded ? (
          <IconChevronUp aria-hidden="true" className="ml-auto size-3.5" />
        ) : (
          <IconChevronDown aria-hidden="true" className="ml-auto size-3.5" />
        )}
      </button>
      {expanded && (
        <dl className="space-y-3 px-3 pb-3">
          {filtered.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-xs">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function ContactPanel({ conversation }: { conversation: DemoConversation }) {
  const [tab, setTab] = useState<"fields" | "dnd" | "actions">("fields");
  const [query, setQuery] = useState("");
  return (
    <aside
      className="flex h-full flex-col overflow-hidden bg-background"
      aria-label="Contact details"
    >
      <header className="flex min-h-10 items-center border-b px-3">
        <h2 className="text-xs font-semibold">Contact Details</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarFallback className="text-[10px]">
                {conversation.contact.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="truncate text-xs font-semibold">{conversation.contact.name}</h3>
              <p className="truncate text-[11px] text-muted-foreground">
                {conversation.contact.company}
              </p>
            </div>
            <IconButton label="Open contact profile" className="ml-auto">
              <IconExternalLink aria-hidden="true" className="size-3.5" />
            </IconButton>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Owner</p>
              <p className="mt-1 rounded border px-2 py-1 text-xs">{conversation.owner}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Followers</p>
              <p className="mt-1 rounded border px-2 py-1 text-xs">
                {conversation.followers.length || "None"}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground">
              Tags ({conversation.crm.tags.length})
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {conversation.crm.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="rounded-sm px-1.5 py-0 text-[10px] font-normal"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <fieldset
          className="grid min-w-0 grid-cols-3 border-0 border-y p-0"
          aria-label="Contact detail sections"
        >
          {(["fields", "dnd", "actions"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={tab === item}
              onClick={() => setTab(item)}
              className="min-h-9 border-r px-2 text-[11px] capitalize text-muted-foreground last:border-r-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-pressed:bg-muted aria-pressed:font-medium aria-pressed:text-foreground"
            >
              {item === "fields" ? "All fields" : item.toUpperCase()}
            </button>
          ))}
        </fieldset>
        {tab === "fields" ? (
          <>
            <label className="relative m-2 block">
              <span className="sr-only">Search contact fields</span>
              <IconSearch
                aria-hidden="true"
                className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search fields and folders"
                className="h-8 w-full rounded border bg-background pl-7 pr-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <DetailGroup title="Triggers" rows={conversation.crm.triggers} query={query} />
            <DetailGroup
              title="Contact"
              rows={{
                Email: conversation.contact.email,
                Phone: conversation.contact.phone,
                Location: conversation.contact.location,
                ...conversation.crm.fields,
              }}
              query={query}
            />
          </>
        ) : (
          <p className="p-4 text-xs text-muted-foreground">
            {tab === "dnd"
              ? "Do-not-disturb settings are unavailable in this demo."
              : "Contact actions are unavailable in this demo."}
          </p>
        )}
      </div>
    </aside>
  );
}

function UtilityRail({ onContact }: { onContact: () => void }) {
  const utilities = [
    ["Contact details", IconUser, onContact],
    ["Activity history", IconClock],
    ["Automations", IconSparkles],
    ["Tasks", IconCalendarEvent],
    ["Notes", IconNotes],
    ["Opportunities", IconCurrencyDollar],
  ] as const;
  return (
    <nav
      aria-label="Conversation utilities"
      className="hidden w-9 shrink-0 flex-col items-center border-l bg-background py-1 2xl:flex"
    >
      {utilities.map(([label, Icon, action]) => (
        <IconButton key={label} label={label} onClick={action}>
          <Icon aria-hidden="true" className="size-4" />
        </IconButton>
      ))}
    </nav>
  );
}

export function ConversationsWorkspace() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("unread");
  const [selectedId, setSelectedId] = useState(demoConversations[0]?.id ?? "");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [muted, setMuted] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(
    () => new Set(demoConversations.filter((item) => item.starred).map((item) => item.id)),
  );
  const conversations = useMemo(
    () => demoConversations.map((item) => ({ ...item, starred: starredIds.has(item.id) })),
    [starredIds],
  );
  const filtered = useMemo(
    () => filterDemoConversations(conversations, query, filter),
    [conversations, query, filter],
  );
  const selected = conversations.find((item) => item.id === selectedId) ?? conversations[0];
  if (!selected) return null;

  const toggleStar = (id: string) =>
    setStarredIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <main
      className="flex h-[calc(100svh-var(--header-height))] max-h-[calc(100svh-var(--header-height))] min-h-0 flex-none overflow-hidden bg-muted/30 md:h-[calc(100svh-var(--header-height)-1rem)] md:max-h-[calc(100svh-var(--header-height)-1rem)]"
      aria-label="Conversations workspace"
    >
      <ChannelRail />
      <div className={`${mobileDetail ? "hidden md:flex" : "flex"} min-h-0 w-full md:w-auto`}>
        <InboxPanel
          conversations={filtered}
          selectedId={selected.id}
          filter={filter}
          query={query}
          starredIds={starredIds}
          onFilter={setFilter}
          onQuery={setQuery}
          onSelect={(conversation) => {
            setSelectedId(conversation.id);
            setMobileDetail(true);
          }}
          onStar={toggleStar}
        />
      </div>
      <section
        className={`${mobileDetail ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}
        aria-label="Selected conversation"
      >
        <header className="flex min-h-12 items-center gap-2 border-b bg-background px-2.5">
          <IconButton
            label="Back to conversation list"
            onClick={() => setMobileDetail(false)}
            className="md:hidden"
          >
            <IconArrowLeft aria-hidden="true" className="size-4" />
          </IconButton>
          <Avatar className="size-7">
            <AvatarFallback className="text-[10px]">{selected.contact.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-semibold">{selected.contact.name}</h2>
            <p className="truncate text-[10px] text-muted-foreground">{selected.contact.company}</p>
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            <IconButton
              label={
                muted ? "Enable conversation notifications" : "Mute conversation notifications"
              }
              selected={muted}
              onClick={() => setMuted((value) => !value)}
            >
              {muted ? (
                <IconBellOff aria-hidden="true" className="size-4" />
              ) : (
                <IconBell aria-hidden="true" className="size-4" />
              )}
            </IconButton>
            <IconButton
              label="Call contact"
              onClick={() => setNotice("Calls are unavailable in this local demo.")}
            >
              <IconPhone aria-hidden="true" className="size-4" />
            </IconButton>
            <IconButton
              label={starredIds.has(selected.id) ? "Unstar conversation" : "Star conversation"}
              selected={starredIds.has(selected.id)}
              onClick={() => toggleStar(selected.id)}
            >
              {starredIds.has(selected.id) ? (
                <IconStarFilled aria-hidden="true" className="size-4" />
              ) : (
                <IconStar aria-hidden="true" className="size-4" />
              )}
            </IconButton>
            <IconButton
              label="Email contact"
              onClick={() => setNotice("Choose Email in the composer to preview an email reply.")}
              className="hidden sm:inline-flex"
            >
              <IconMail aria-hidden="true" className="size-4" />
            </IconButton>
            <IconButton label="Delete conversation" disabled className="hidden sm:inline-flex">
              <IconTrash aria-hidden="true" className="size-4" />
            </IconButton>
            <IconButton
              label="Open contact details"
              onClick={() => setContactOpen(true)}
              className="xl:hidden"
            >
              <IconChevronRight aria-hidden="true" className="size-4" />
            </IconButton>
          </div>
        </header>
        {notice && (
          <div
            role="status"
            className="flex min-h-8 items-center border-b bg-background px-3 text-[11px] text-muted-foreground"
          >
            <IconInfoCircle aria-hidden="true" className="mr-1.5 size-3.5" />
            {notice}
            <button
              type="button"
              onClick={() => setNotice("")}
              className="ml-auto min-h-6 px-2 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Timeline conversation={selected} />
        </div>
        <Composer key={selected.id} conversation={selected} />
      </section>
      <div className="hidden w-[288px] shrink-0 border-l xl:block">
        <ContactPanel conversation={selected} />
      </div>
      <UtilityRail onContact={() => setContactOpen(true)} />
      <Sheet open={contactOpen} onOpenChange={setContactOpen}>
        <SheetContent className="w-full p-0 sm:max-w-sm">
          <SheetTitle className="sr-only">Contact details for {selected.contact.name}</SheetTitle>
          <ContactPanel conversation={selected} />
        </SheetContent>
      </Sheet>
    </main>
  );
}
