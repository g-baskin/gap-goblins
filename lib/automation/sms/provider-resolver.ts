import { resolveTwilioCredentials } from "@/lib/messaging/credentials";
import { DisabledSmsProvider, TwilioSmsProvider } from "./provider";
import type { SmsProviderResolver } from "./service";

/** Builds the Twilio provider for a channel account; disabled when its credentials are unusable. */
export const resolveConfiguredSmsProvider: SmsProviderResolver = async ({ secretReference }) => {
  const credentials = resolveTwilioCredentials(secretReference);
  if (!credentials) return new DisabledSmsProvider();
  return new TwilioSmsProvider(credentials.accountSid, credentials.authToken);
};
