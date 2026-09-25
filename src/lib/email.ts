import "server-only";
import { Resend } from "resend";

// Envoi d'e-mails via Resend (https://resend.com). Facultatif : sans clé,
// le tableau de bord propose d'ouvrir votre messagerie à la place.

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  if (!isEmailConfigured()) return { ok: false as const, error: "L’envoi d’e-mails n’est pas configuré (RESEND_API_KEY)." };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo || undefined,
    attachments: options.attachments,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Gabarit HTML minimal et lisible pour les e-mails transactionnels. */
export function emailLayout({ title, body, cta, footer }: { title: string; body: string; cta?: { label: string; url: string }; footer?: string }) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f4f0;font-family:Arial,Helvetica,sans-serif;color:#202320">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e4e5df">
<tr><td style="padding:28px 32px 8px"><div style="font-size:20px;font-weight:800;letter-spacing:-0.5px">${escapeHtml(title)}</div></td></tr>
<tr><td style="padding:8px 32px 8px;font-size:15px;line-height:1.6">${body}</td></tr>
${cta ? `<tr><td style="padding:16px 32px 8px"><a href="${cta.url}" style="display:inline-block;background:#cc4119;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${escapeHtml(cta.label)}</a></td></tr>` : ""}
<tr><td style="padding:20px 32px 28px;font-size:12px;color:#6b6e67">${footer ?? ""}</td></tr>
</table></td></tr></table></body></html>`;
}
