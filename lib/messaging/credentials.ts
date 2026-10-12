/**
 * Twilio credentials for a channel account, referenced by `channel_accounts.secret_reference`.
 *
 * Two forms are accepted:
 * - `env:NAME`: an environment variable holding `{"accountSid": "...", "authToken": "..."}`
 *   (the original automation setup, kept working).
 * - `enc:v1:<iv>:<tag>:<ciphertext>`: the same JSON, AES-256-GCM encrypted with
 *   INTEGRATION_ENCRYPTION_KEY. Used when a workspace connects Twilio in Settings.
 *
 * The plaintext token never leaves the server and is never returned by an API.
 */
import { z } from "zod";
import { decryptCredential, encryptCredential } from "@/lib/encryption";

const credentialsSchema = z.object({
  accountSid: z.string().regex(/^AC[0-9a-fA-F]{32}$/),
  authToken: z.string().min(16).max(128),
});

export type TwilioCredentials = z.infer<typeof credentialsSchema>;

const ENC_PREFIX = "enc:v1:";

export function encryptTwilioCredentials(credentials: TwilioCredentials): string {
  const parsed = credentialsSchema.parse(credentials);
  const sealed = encryptCredential(JSON.stringify(parsed));
  return `${ENC_PREFIX}${sealed.iv}:${sealed.tag}:${sealed.encryptedValue}`;
}

/** The credentials behind a secret reference, or null when missing, unreadable or malformed. */
export function resolveTwilioCredentials(
  secretReference: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): TwilioCredentials | null {
  if (!secretReference) return null;
  let raw: string | undefined;
  const envMatch = /^env:([A-Z][A-Z0-9_]*)$/.exec(secretReference);
  if (envMatch?.[1]) {
    raw = env[envMatch[1]];
  } else if (secretReference.startsWith(ENC_PREFIX)) {
    const [iv, tag, value] = secretReference.slice(ENC_PREFIX.length).split(":");
    if (!iv || !tag || !value) return null;
    try {
      raw = decryptCredential(value, iv, tag);
    } catch {
      return null;
    }
  }
  if (!raw) return null;
  try {
    const parsed = credentialsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
