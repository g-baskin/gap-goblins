import { z } from "zod";
import { DisabledSmsProvider, TwilioSmsProvider } from "./provider";
import type { SmsProviderResolver } from "./service";

const credentialsSchema = z
  .object({ accountSid: z.string().min(1), authToken: z.string().min(1) })
  .strict();

export const resolveConfiguredSmsProvider: SmsProviderResolver = async ({ secretReference }) => {
  const match = /^env:([A-Z][A-Z0-9_]*)$/.exec(secretReference);
  if (!match) return new DisabledSmsProvider();
  const value = process.env[match[1] as string];
  if (!value) return new DisabledSmsProvider();
  const credentials = credentialsSchema.parse(JSON.parse(value));
  return new TwilioSmsProvider(credentials.accountSid, credentials.authToken);
};
