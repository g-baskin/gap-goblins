"use client";

import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCopy,
  IconPlugConnected,
} from "@tabler/icons-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type AvailableTenant,
  NoTenant,
  TenantPicker,
  tenantFetch,
  useLeadFinderTenant,
} from "@/components/lead-finder/shared";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { DeleteConfirmDialog } from "@/components/shadcn/ui/delete-confirm-dialog";
import { Input } from "@/components/shadcn/ui/input";
import { Label } from "@/components/shadcn/ui/label";

type Connection = {
  id: string;
  accountSid: string;
  phoneNumber: string;
  updatedAt: string;
};

type SettingsResponse = {
  connection: Connection | null;
  webhookUrl: string;
  webhookReachable: boolean;
};

export function MessagingSettings({ tenants }: { tenants: AvailableTenant[] }) {
  const { tenantId, setTenantId } = useLeadFinderTenant(tenants);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Messaging</h2>
        <p className="text-sm text-muted-foreground">
          Connect a Twilio phone number so your team can send and receive texts in{" "}
          <Link href="/admin/conversations" className="text-primary hover:underline">
            Conversations
          </Link>
          .
        </p>
      </div>
      <TenantPicker tenants={tenants} tenantId={tenantId} onChange={setTenantId} />
      {tenantId ? (
        <TwilioCard key={tenantId} tenantId={tenantId} />
      ) : (
        <NoTenant tenants={tenants} />
      )}
    </div>
  );
}

function TwilioCard({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [error, setError] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await tenantFetch<SettingsResponse>(tenantId, "/api/settings/messaging/twilio"));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load messaging settings");
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function connect(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await tenantFetch(tenantId, "/api/settings/messaging/twilio", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountSid, authToken, phoneNumber }),
      });
      setAuthToken("");
      setEditing(false);
      toast.success("Twilio connected");
      await load();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not connect Twilio");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await tenantFetch(tenantId, "/api/settings/messaging/twilio", { method: "DELETE" });
      toast.success("Twilio disconnected");
      setDisconnectOpen(false);
      await load();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  async function copyWebhook() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.webhookUrl);
      toast.success("Webhook address copied");
    } catch {
      toast.error("Copy failed. Select the address and copy it manually.");
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const connection = data.connection;
  const showForm = !connection || editing;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconPlugConnected className="size-5" /> Twilio SMS
          </CardTitle>
          <CardDescription>
            Texts are sent from your own Twilio account, billed by Twilio. Your Auth Token is
            encrypted and never shown again after saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection && !editing ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <IconCircleCheck className="size-4 text-emerald-600" />
                  Connected: {connection.phoneNumber}
                </div>
                <div className="text-xs text-muted-foreground">
                  Account {connection.accountSid.slice(0, 6)}…{connection.accountSid.slice(-4)} ·
                  updated {new Date(connection.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Change number or token
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDisconnectOpen(true)}>
                  Disconnect
                </Button>
              </div>
            </div>
          ) : null}
          {showForm ? (
            <form onSubmit={connect} className="grid gap-4 md:max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="twilio-sid">Account SID</Label>
                <Input
                  id="twilio-sid"
                  value={accountSid}
                  onChange={(event) => setAccountSid(event.target.value)}
                  placeholder="AC…"
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twilio-token">Auth Token</Label>
                <Input
                  id="twilio-token"
                  type="password"
                  value={authToken}
                  onChange={(event) => setAuthToken(event.target.value)}
                  autoComplete="new-password"
                  spellCheck={false}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twilio-number">Twilio phone number</Label>
                <Input
                  id="twilio-number"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="+1 540 555 0123"
                  inputMode="tel"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  We check with Twilio that this number is in your account and can send texts.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Checking with Twilio…" : connection ? "Save" : "Connect Twilio"}
                </Button>
                {connection ? (
                  <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receive texts and delivery updates</CardTitle>
          <CardDescription>
            In the Twilio console, open your number → Messaging configuration, set “A message comes
            in” to Webhook, HTTP POST, and paste this address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={data.webhookUrl} readOnly aria-label="Twilio webhook address" />
            <Button
              type="button"
              variant="outline"
              onClick={copyWebhook}
              aria-label="Copy webhook address"
            >
              <IconCopy className="size-4" />
            </Button>
          </div>
          {!data.webhookReachable ? (
            <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
              Twilio can only reach a public https address. Set NEXT_PUBLIC_SITE_URL to your live
              site (or a tunnel such as Cloudflare Tunnel while developing) so replies and delivery
              updates arrive.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Before you text customers</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Register your business and texting use case for A2P 10DLC in the Twilio console. US
              carriers block or filter texts from unregistered numbers. Approval can take days to
              weeks.
            </li>
            <li>
              Only text people who agreed to receive texts. The inbox will not send until consent is
              recorded for the contact, and it never sends between 8pm and 8am in their timezone.
            </li>
            <li>
              Replies of STOP, UNSUBSCRIBE, CANCEL, END or QUIT opt a contact out immediately; START
              opts them back in.
            </li>
          </ul>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        onConfirm={disconnect}
        title="Disconnect Twilio?"
        description="Texts will stop sending and arriving until you reconnect. Existing conversations are kept. The saved Auth Token is erased."
        deleteText="Disconnect"
        loading={disconnecting}
      />
    </div>
  );
}
