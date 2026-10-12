"use client";

import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
  IconChecks,
  IconMessage,
  IconPlus,
  IconSearch,
  IconSend,
  IconShieldCheck,
  IconStar,
  IconStarFilled,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type AvailableTenant,
  NoTenant,
  TenantPicker,
  tenantFetch,
  useLeadFinderTenant,
} from "@/components/lead-finder/shared";
import { Avatar, AvatarFallback } from "@/components/shadcn/ui/avatar";
import { Badge } from "@/components/shadcn/ui/badge";
import { Button } from "@/components/shadcn/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/ui/dialog";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/ui/select";
import { Textarea } from "@/components/shadcn/ui/textarea";
import type { InboxFilter, InboxThreadDetail, InboxThreadSummary } from "@/lib/messaging/inbox";
import { cn } from "@/lib/utils";

const POLL_MS = 5000;
const SMS_MAX = 1600;
const FILTERS: { value: InboxFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "recent", label: "Recent" },
  { value: "starred", label: "Starred" },
];
const CONSENT_SOURCES = [
  "Contact texted us first",
  "Web form opt-in",
  "Signed paper form",
  "Verbal consent on a call",
  "Existing customer who gave their number for texts",
] as const;
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

type ListResponse = {
  threads: InboxThreadSummary[];
  unreadTotal: number;
  sms: { connected: boolean; phoneNumber?: string };
};

function initials(name: string): string {
  // Phone-only contacts get "#" rather than the first digits of their number.
  const parts = name
    .replace(/[^A-Za-z ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters =
    parts.length > 1
      ? `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`
      : (parts[0] ?? "").slice(0, 2);
  return letters.toUpperCase() || "#";
}

/** "+15405550111" → "(540) 555-0111"; other numbers are shown as stored. */
function displayPhone(value: string | null): string | null {
  const match = value?.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : value;
}

/** The contact's name, or their formatted number when they have no name yet. */
function displayName(thread: Pick<InboxThreadSummary, "contactName" | "phone">): string {
  return thread.contactName === thread.phone
    ? (displayPhone(thread.phone) ?? thread.contactName)
    : thread.contactName;
}

function timeLabel(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function smsSegments(text: string): number {
  if (!text) return 0;
  // GSM-7 fits 160 characters per text (153 when split); anything else is UCS-2 (70 / 67).
  const gsm = /^[\n\r -~£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¡ÄÖÑÜ§¿äöñüà€^{}\\[~\]|]*$/.test(text);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
}

export function ConversationsWorkspace({ tenants }: { tenants: AvailableTenant[] }) {
  const { tenantId, setTenantId } = useLeadFinderTenant(tenants);
  return (
    <div className="flex h-[calc(100svh-var(--header-height,3.5rem))] min-h-[560px] flex-col">
      {tenants.length > 1 ? (
        <div className="border-b px-4 py-2">
          <TenantPicker tenants={tenants} tenantId={tenantId} onChange={setTenantId} />
        </div>
      ) : null}
      {tenantId ? (
        <Inbox key={tenantId} tenantId={tenantId} />
      ) : (
        <div className="p-6">
          <NoTenant tenants={tenants} />
        </div>
      )}
    </div>
  );
}

function Inbox({ tenantId }: { tenantId: string }) {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [list, setList] = useState<ListResponse | null>(null);
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const loadList = useCallback(async () => {
    try {
      const params = new URLSearchParams({ filter });
      if (debounced) params.set("q", debounced);
      const data = await tenantFetch<ListResponse>(tenantId, `/api/conversations?${params}`);
      setList(data);
      setListError("");
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Could not load conversations");
    }
  }, [tenantId, filter, debounced]);

  useEffect(() => {
    void loadList();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void loadList();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loadList]);

  const threads = list?.threads ?? [];
  const connected = list?.sms.connected ?? true;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!connected ? (
        <div className="flex flex-wrap items-center gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <IconAlertTriangle className="size-4 shrink-0" />
          Text messaging is not connected yet.
          <Link href="/admin/settings/messaging" className="font-medium underline">
            Connect a Twilio number
          </Link>
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 md:grid-cols-[320px_1fr]">
        <aside
          className={cn("flex min-h-0 flex-col border-r", selectedId ? "hidden md:flex" : "flex")}
          aria-label="Conversations"
        >
          <div className="space-y-3 border-b p-3">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-semibold">
                Conversations
                {list?.unreadTotal ? (
                  <Badge className="ml-2 align-middle" variant="secondary">
                    {list.unreadTotal} unread
                  </Badge>
                ) : null}
              </h1>
              <Button size="sm" onClick={() => setStartOpen(true)} aria-label="New text message">
                <IconPlus className="size-4" /> New
              </Button>
            </div>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, number or message"
                className="pl-8"
                aria-label="Search conversations"
              />
            </div>
            <div className="flex gap-1" role="tablist" aria-label="Filter conversations">
              {FILTERS.map((item) => (
                <Button
                  key={item.value}
                  role="tab"
                  aria-selected={filter === item.value}
                  variant={filter === item.value ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {listError ? <p className="p-4 text-sm text-destructive">{listError}</p> : null}
            {!list && !listError ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : null}
            {list && threads.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {debounced || filter !== "all"
                  ? "No conversations match."
                  : "No conversations yet. Incoming texts appear here, or click New to text someone."}
              </div>
            ) : null}
            <ul>
              {threads.map((thread) => (
                <li key={thread.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(thread.id)}
                    className={cn(
                      "flex w-full gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60",
                      selectedId === thread.id && "bg-muted",
                    )}
                    aria-current={selectedId === thread.id ? "true" : undefined}
                  >
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs">
                        {initials(thread.contactName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            thread.unreadCount > 0 ? "font-semibold" : "font-medium",
                          )}
                        >
                          {displayName(thread)}
                        </span>
                        {thread.starred ? (
                          <>
                            <IconStarFilled
                              className="size-3.5 shrink-0 text-amber-500"
                              aria-hidden="true"
                            />
                            <span className="sr-only">Starred</span>
                          </>
                        ) : null}
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {timeLabel(thread.lastEventAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs text-muted-foreground">
                          {thread.preview ?? "No messages yet"}
                        </span>
                        {thread.unreadCount > 0 ? (
                          <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                            {thread.unreadCount}
                            <span className="sr-only"> unread</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <section className={cn("min-h-0 flex-col", selectedId ? "flex" : "hidden md:flex")}>
          {selectedId ? (
            <ThreadPanel
              key={selectedId}
              tenantId={tenantId}
              threadId={selectedId}
              smsConnected={connected}
              onBack={() => setSelectedId(null)}
              onChanged={loadList}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <IconMessage className="size-8" />
              Select a conversation to read and reply.
            </div>
          )}
        </section>
      </div>
      <StartConversationDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        tenantId={tenantId}
        onStarted={async (threadId) => {
          setStartOpen(false);
          setSelectedId(threadId);
          await loadList();
        }}
      />
    </div>
  );
}

function ThreadPanel({
  tenantId,
  threadId,
  smsConnected,
  onBack,
  onChanged,
}: {
  tenantId: string;
  threadId: string;
  smsConnected: boolean;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [thread, setThread] = useState<InboxThreadDetail | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  // One key per draft: a retry or double-click resends the same message, never a second one.
  const sendKey = useRef<string>(crypto.randomUUID());

  const load = useCallback(async () => {
    try {
      const data = await tenantFetch<{ thread: InboxThreadDetail }>(
        tenantId,
        `/api/conversations/${threadId}`,
      );
      setThread(data.thread);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load this conversation");
    }
  }, [tenantId, threadId]);

  // Opening a conversation marks it read.
  useEffect(() => {
    void tenantFetch(tenantId, `/api/conversations/${threadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ read: true }),
    })
      .then(onChanged)
      .catch(() => undefined);
  }, [tenantId, threadId, onChanged]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const count = thread?.messages.length ?? 0;
    if (count !== lastCount.current) {
      lastCount.current = count;
      bottomRef.current?.scrollIntoView({ block: "end" });
      // New messages arrived while open: keep it marked read.
      if (thread && thread.unreadCount > 0) {
        void tenantFetch(tenantId, `/api/conversations/${threadId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ read: true }),
        }).catch(() => undefined);
      }
    }
  }, [thread, tenantId, threadId]);

  async function toggleStar() {
    if (!thread) return;
    try {
      await tenantFetch(tenantId, `/api/conversations/${threadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starred: !thread.starred }),
      });
      setThread({ ...thread, starred: !thread.starred });
      await onChanged();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update");
    }
  }

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await tenantFetch(tenantId, `/api/conversations/${threadId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, idempotencyKey: sendKey.current }),
      });
      setDraft("");
      sendKey.current = crypto.randomUUID();
      await Promise.all([load(), onChanged()]);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Message not sent");
    } finally {
      setSending(false);
    }
  }

  async function optOut() {
    try {
      await tenantFetch(tenantId, `/api/conversations/${threadId}/consent`, { method: "DELETE" });
      toast.success("Marked as opted out. No more texts will be sent to this contact.");
      await load();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not update consent");
    }
  }

  if (error && !thread) {
    return <p className="p-6 text-sm text-destructive">{error}</p>;
  }
  if (!thread) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;

  const consent = thread.consent;
  const blockedReason = !smsConnected
    ? "Connect a Twilio number in Settings → Messaging to send texts."
    : !thread.phone
      ? "This contact has no phone number."
      : consent.optedOut
        ? "This contact opted out of texts (STOP). They can text START to opt back in."
        : !consent.consent
          ? "Record this contact's consent to receive texts before sending."
          : null;
  const segments = smsSegments(draft);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <IconArrowLeft className="size-4" />
        </Button>
        <Avatar className="size-9">
          <AvatarFallback className="text-xs">{initials(thread.contactName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{displayName(thread)}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {thread.phone && thread.contactName !== thread.phone ? (
              <span>{displayPhone(thread.phone)}</span>
            ) : null}
            <ConsentBadge thread={thread} />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleStar}
          aria-label={thread.starred ? "Unstar conversation" : "Star conversation"}
          aria-pressed={thread.starred}
        >
          {thread.starred ? (
            <IconStarFilled className="size-4 text-amber-500" />
          ) : (
            <IconStar className="size-4" />
          )}
        </Button>
      </header>

      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-muted/30 px-4 py-4"
        aria-live="polite"
      >
        {thread.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet.</p>
        ) : null}
        {thread.messages.map((message) => {
          const outbound = message.direction === "outbound";
          return (
            <div
              key={message.id}
              className={cn("flex", outbound ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  outbound
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border bg-background",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.body ?? "(no text)"}</p>
                <div
                  className={cn(
                    "mt-1 flex items-center justify-end gap-1 text-[11px]",
                    outbound ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  <span>{timeLabel(message.occurredAt)}</span>
                  {outbound ? <DeliveryMark status={message.status} error={message.error} /> : null}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="space-y-2 border-t p-3">
        {blockedReason ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <IconShieldCheck className="size-4 shrink-0" />
            <span className="flex-1">{blockedReason}</span>
            {smsConnected && thread.phone && !consent.optedOut && !consent.consent ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConsentOpen(true)}
              >
                Record consent
              </Button>
            ) : null}
            {!smsConnected ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/settings/messaging">Connect Twilio</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        <Label htmlFor="sms-draft" className="sr-only">
          Text message
        </Label>
        <Textarea
          id="sms-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, SMS_MAX))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder={blockedReason ? "Texting is unavailable" : "Type a text message…"}
          disabled={Boolean(blockedReason) || sending}
          rows={3}
          className="resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {draft.length}/{SMS_MAX} · {segments} text{segments === 1 ? "" : "s"} · Enter to send,
            Shift+Enter for a new line
          </span>
          <div className="flex gap-2">
            {consent.consent && !consent.optedOut ? (
              <Button type="button" variant="ghost" size="sm" onClick={optOut}>
                Mark opted out
              </Button>
            ) : null}
            <Button
              type="submit"
              size="sm"
              disabled={!draft.trim() || Boolean(blockedReason) || sending}
            >
              <IconSend className="size-4" />
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </form>

      <ConsentDialog
        open={consentOpen}
        onOpenChange={setConsentOpen}
        tenantId={tenantId}
        threadId={threadId}
        onSaved={async () => {
          setConsentOpen(false);
          await load();
        }}
      />
    </div>
  );
}

function ConsentBadge({ thread }: { thread: InboxThreadDetail }) {
  if (thread.consent.optedOut) {
    return (
      <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300">
        Opted out
      </Badge>
    );
  }
  if (thread.consent.consent) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-300 text-emerald-700 dark:text-emerald-300"
        title={thread.consent.source ?? undefined}
      >
        Can text
      </Badge>
    );
  }
  return <Badge variant="outline">No consent recorded</Badge>;
}

function DeliveryMark({ status, error }: { status: string; error: string | null }) {
  if (status === "failed") {
    return (
      <span
        className="flex items-center gap-0.5 font-medium text-red-200"
        title={error ?? undefined}
      >
        <IconX className="size-3" /> Failed
      </span>
    );
  }
  if (status === "delivered" || status === "read") {
    return (
      <span className="flex items-center gap-0.5" title="Delivered">
        <IconChecks className="size-3" /> Delivered
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5" title="Sent">
      <IconCheck className="size-3" /> Sent
    </span>
  );
}

function ConsentDialog({
  open,
  onOpenChange,
  tenantId,
  threadId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  threadId: string;
  onSaved: () => Promise<void>;
}) {
  const [source, setSource] = useState<string>("");
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  );
  const [saving, setSaving] = useState(false);
  const zones = useMemo(
    () => (TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES]),
    [timezone],
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!source) return;
    setSaving(true);
    try {
      await tenantFetch(tenantId, `/api/conversations/${threadId}/consent`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, timezone }),
      });
      toast.success("Consent recorded");
      await onSaved();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not record consent");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle>Record texting consent</DialogTitle>
            <DialogDescription>
              Only text people who agreed to receive texts from you. US law (the TCPA) allows
              damages per unwanted text. Record how they agreed; it is kept with the contact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="consent-source">How did they agree?</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="consent-source" className="w-full">
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {CONSENT_SOURCES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="consent-timezone">Contact's timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="consent-timezone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone} value={zone}>
                      {zone.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Texts are not sent between 8pm and 8am in this timezone.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!source || saving}>
              {saving ? "Saving…" : "Record consent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StartConversationDialog({
  open,
  onOpenChange,
  tenantId,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onStarted: (threadId: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function start(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await tenantFetch<{ threadId: string }>(tenantId, "/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, name: name || undefined }),
      });
      setPhone("");
      setName("");
      await onStarted(data.threadId);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not start a conversation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={start}>
          <DialogHeader>
            <DialogTitle>New text conversation</DialogTitle>
            <DialogDescription>
              Opens a conversation. You'll record the contact's consent before the first text.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-phone">Mobile number</Label>
              <Input
                id="start-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(540) 555-0123"
                inputMode="tel"
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-name">Name (optional)</Label>
              <Input
                id="start-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!phone.trim() || saving}>
              {saving ? "Opening…" : "Open conversation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
