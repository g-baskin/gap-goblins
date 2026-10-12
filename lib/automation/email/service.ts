import { and, eq } from "drizzle-orm";
import DOMPurify from "isomorphic-dompurify";
import type { Resend } from "resend";
import { automationEnrollments, automationFlows, contacts } from "@/lib/db/schema";
import { db } from "@/lib/db/worker";
import type { GraphExternalHandlers } from "../graph/executor";
import { buildAutomationUnsubscribeUrl } from "../sender";

export function createEmailExternalHandler(
  getResend: () => Resend,
): NonNullable<GraphExternalHandlers["email"]> {
  return async (input) => {
    const [row] = await db
      .select({
        enrollment: automationEnrollments,
        flow: automationFlows,
        contact: contacts,
      })
      .from(automationEnrollments)
      .innerJoin(
        automationFlows,
        and(
          eq(automationFlows.id, automationEnrollments.flowId),
          eq(automationFlows.tenantId, input.tenantId),
        ),
      )
      .leftJoin(
        contacts,
        and(
          eq(contacts.id, automationEnrollments.contactId),
          eq(contacts.tenantId, input.tenantId),
        ),
      )
      .where(
        and(
          eq(automationEnrollments.id, input.enrollmentId),
          eq(automationEnrollments.tenantId, input.tenantId),
        ),
      )
      .limit(1);
    if (!row) throw new Error("Tenant enrollment and flow were not found");

    const fromEmail =
      row.flow.fromEmail ?? process.env.NEWSLETTER_FROM_EMAIL ?? process.env.DEFAULT_FROM_EMAIL;
    if (!fromEmail) throw new Error("An automation sender email is not configured");
    const fromName = row.flow.fromName || "__YOUR_BRAND__";
    const replyTo = row.flow.replyTo || fromEmail;
    const unsubscribeUrl = buildAutomationUnsubscribeUrl(row.enrollment);
    const tokens: Record<string, string> = {
      first_name: escapeHtml(row.contact?.firstName ?? ""),
      last_name: escapeHtml(row.contact?.lastName ?? ""),
      company: escapeHtml(row.contact?.company ?? ""),
      email: escapeHtml(row.enrollment.email),
      unsubscribe_url: unsubscribeUrl,
    };
    const subject = substitute(input.config.subject, tokens);
    const rawHtml = input.config.bodyHtml ?? `<p>${escapeHtml(input.config.bodyText ?? "")}</p>`;
    const html = DOMPurify.sanitize(substitute(rawHtml, tokens));
    const text = substitute(input.config.bodyText ?? stripHtml(rawHtml), tokens);
    const response = await getResend().emails.send(
      {
        from: `${fromName} <${fromEmail}>`,
        to: input.to,
        replyTo,
        subject,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (response.error) throw new Error(response.error.message);
    return { state: "succeeded", providerReference: response.data?.id };
  };
}

function substitute(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => tokens[key] ?? match);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
