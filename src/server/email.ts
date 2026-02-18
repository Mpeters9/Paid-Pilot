import { Resend } from "resend";
import { getConfig } from "@/server/config";
import { logger } from "@/server/logger";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const config = getConfig();
  if (!config.RESEND_API_KEY) return null;
  resendClient = new Resend(config.RESEND_API_KEY);
  return resendClient;
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<{ messageId: string | null }> {
  const config = getConfig();
  const client = getResendClient();

  if (!client) {
    logger.warn({ to: input.to, subject: input.subject }, "RESEND_API_KEY not set, email send skipped");
    return { messageId: null };
  }

  const result = await client.emails.send({
    from: config.EMAIL_FROM,
    to: [input.to],
    subject: input.subject,
    text: input.text,
    replyTo: input.replyTo,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { messageId: result.data?.id ?? null };
}

