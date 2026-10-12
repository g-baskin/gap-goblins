import { createHash, createHmac } from "node:crypto";
import type { LookupAddress } from "node:dns";
import { promises as dns } from "node:dns";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import type { GraphExternalHandlers } from "../graph/executor";
import { PermanentNodeError, RetryableNodeError } from "../graph/executor";

const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:2::", 48],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(network, prefix, "ipv6");
}

export type ResolveHost = (hostname: string) => Promise<LookupAddress[]>;
export type OutboundResponse = { status: number; body: Buffer; durationMs: number };
export type SendRequest = (input: {
  url: URL;
  address: LookupAddress;
  headers: Record<string, string>;
  body: Buffer;
  timeoutMs: number;
}) => Promise<OutboundResponse>;

const defaultResolveHost: ResolveHost = (hostname) =>
  dns.lookup(hostname, { all: true, verbatim: true });

function addressAllowed(address: LookupAddress): boolean {
  const family = address.family === 4 ? "ipv4" : "ipv6";
  return isIP(address.address) === address.family && !blocked.check(address.address, family);
}

export async function validateOutboundWebhookUrl(
  value: string,
  resolveHost: ResolveHost = defaultResolveHost,
): Promise<{ url: URL; addresses: LookupAddress[] }> {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new PermanentNodeError("Outbound webhook requires an HTTPS URL without credentials");
  }
  if (url.port && url.port !== "443")
    throw new PermanentNodeError("Outbound webhook port is not allowed");
  const hostname = url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname;
  const literalFamily = isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily as 4 | 6 }]
    : await resolveHost(hostname);
  if (addresses.length === 0 || addresses.some((address) => !addressAllowed(address))) {
    throw new PermanentNodeError("Outbound webhook hostname resolves to a blocked address");
  }
  return { url, addresses };
}

function reviewedHeaders(input: Record<string, string>): Record<string, string> {
  const entries = Object.entries(input);
  if (entries.length > 20) throw new PermanentNodeError("Too many outbound webhook headers");
  const output: Record<string, string> = {};
  for (const [rawName, value] of entries) {
    const name = rawName.toLowerCase();
    if (!/^(content-type|user-agent|x-webhook-[a-z0-9-]+)$/.test(name)) {
      throw new PermanentNodeError(`Outbound webhook header ${rawName} is not allowed`);
    }
    if (value.length > 2000 || /[\r\n]/.test(value)) {
      throw new PermanentNodeError("Invalid outbound webhook header value");
    }
    output[name] = value;
  }
  return output;
}

const defaultSendRequest: SendRequest = ({ url, address, headers, body, timeoutMs }) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let requestFinished = false;
    const request = httpsRequest(
      url,
      {
        method: "POST",
        headers: { ...headers, "content-length": String(body.byteLength) },
        lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
        servername: url.hostname,
        timeout: timeoutMs,
        agent: false,
      },
      (response) => {
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.byteLength;
          if (size > 64 * 1024) {
            request.destroy(new Error("Outbound webhook response too large"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 502,
            body: Buffer.concat(chunks),
            durationMs: Date.now() - startedAt,
          }),
        );
      },
    );
    request.on("finish", () => {
      requestFinished = true;
    });
    request.on("timeout", () => request.destroy(new Error("Outbound webhook timed out")));
    request.on("error", (error) =>
      reject(Object.assign(error, { outcomeUnknown: requestFinished })),
    );
    request.end(body);
  });

export function classifyOutboundStatus(status: number): "success" | "retryable" | "permanent" {
  if (status >= 200 && status < 300) return "success";
  if (status === 408 || status === 429 || status >= 500) return "retryable";
  return "permanent";
}

function resolveSecret(reference: string): string {
  const match = /^env:([A-Z][A-Z0-9_]*)$/.exec(reference);
  const secret = match ? process.env[match[1] as string] : undefined;
  if (!secret || secret.length < 32)
    throw new PermanentNodeError("Webhook signing secret unavailable");
  return secret;
}

export function createOutboundWebhookHandler(dependencies?: {
  resolveHost?: ResolveHost;
  sendRequest?: SendRequest;
  secretResolver?: (reference: string) => string;
}): NonNullable<GraphExternalHandlers["outboundWebhook"]> {
  const resolveHost = dependencies?.resolveHost ?? defaultResolveHost;
  const sendRequest = dependencies?.sendRequest ?? defaultSendRequest;
  const secretResolver = dependencies?.secretResolver ?? resolveSecret;
  return async (input) => {
    const { url, addresses } = await validateOutboundWebhookUrl(input.config.url, resolveHost);
    const body = Buffer.from(JSON.stringify({ ...input.config.body, event: input.payload }));
    if (body.byteLength > 256 * 1024)
      throw new PermanentNodeError("Outbound webhook body too large");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const eventId = input.runId;
    const bodyHash = createHash("sha256").update(body).digest("hex");
    const signaturePayload = [timestamp, eventId, bodyHash, input.idempotencyKey].join(".");
    const signature = createHmac("sha256", secretResolver(input.config.secretReference))
      .update(signaturePayload)
      .digest("hex");
    const headers = {
      ...reviewedHeaders(input.config.headers),
      "content-type": "application/json",
      "user-agent": "automation-webhook/1",
      "x-webhook-timestamp": timestamp,
      "x-webhook-event-id": eventId,
      "x-webhook-body-sha256": bodyHash,
      "x-webhook-idempotency-key": input.idempotencyKey,
      "x-webhook-signature": `sha256=${signature}`,
    };
    try {
      const response = await sendRequest({
        url,
        address: addresses[0] as LookupAddress,
        headers,
        body,
        timeoutMs: input.config.timeoutMs,
      });
      const classification = classifyOutboundStatus(response.status);
      const metadata = {
        status: response.status,
        durationMs: response.durationMs,
        responseHash: createHash("sha256").update(response.body).digest("hex"),
        responseBytes: response.body.byteLength,
      };
      if (classification === "retryable")
        throw new RetryableNodeError(`Webhook returned ${response.status}`);
      if (classification === "permanent")
        throw new PermanentNodeError(`Webhook returned ${response.status}`);
      return { state: "succeeded", metadata };
    } catch (error) {
      if (error instanceof RetryableNodeError || error instanceof PermanentNodeError) throw error;
      if (
        error &&
        typeof error === "object" &&
        "outcomeUnknown" in error &&
        !error.outcomeUnknown
      ) {
        throw new RetryableNodeError("Webhook connection failed before request send");
      }
      return { state: "unknown", metadata: { error: "Provider outcome unknown" } };
    }
  };
}
