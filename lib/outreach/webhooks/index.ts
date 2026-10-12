/**
 * Webhooks module
 */

export { handleEmailBounced } from "./events/bounced";
export { handleEmailClicked } from "./events/clicked";
export { handleEmailDelivered } from "./events/delivered";
export { handleEmailOpened } from "./events/opened";
export { handleEmailReceived } from "./events/received";
// Re-export individual event handlers for advanced usage
export { handleEmailSent } from "./events/sent";
export * from "./resend-handler";
export * from "./types";
