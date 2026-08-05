import { resendClient } from '../config/resend.js';

// suporte@techspeaking.dev is the address every other part of the app
// already points users to (aiFallbackService's fallback replies since Dia
// 39, HelpCenterPage's mailto link since Dia 57-58) - reuse it here instead
// of inventing a second support address.
const SUPPORT_FROM = 'TechSpeak Suporte <suporte@techspeaking.dev>';

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

// Best-effort, same pattern as costTrackingService/notification code
// elsewhere in this app: a failed email must never break the admin's
// actual action (marking a ticket resolved, etc.), so callers should not
// await-and-throw on this - they log and move on.
export async function sendSupportReply({ to, subject, message, adminResponse }) {
  return resendClient.emails.send({
    from: SUPPORT_FROM,
    to,
    subject: `Re: ${subject}`,
    text:
      `${adminResponse}\n\n` +
      `---\n` +
      `Sua mensagem original:\n${message}\n\n` +
      `Precisa de mais ajuda? Responda este e-mail ou escreva para suporte@techspeaking.dev.`,
  });
}
