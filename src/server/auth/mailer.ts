/**
 * Account emails (confirm address, reset password, notices) sent through the site's own mailbox over SMTP (Zoho Mail).
 * Runs only on the VM; the Worker forwards auth requests there and never sends mail.
 *
 *   SMTP_HOST=smtp.zoho.com  SMTP_PORT=465  SMTP_USER=<mailbox>  SMTP_PASSWORD=<app password>  MAIL_FROM="AI Job Search Agent <noreply@agilepartners-ai.com>"
 *
 * Without these, sign-up and "forgot password" answer honestly that email is not set up, instead of pretending to send.
 */
import { isWorkers } from '../runtime';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

type Transport = (m: MailMessage) => Promise<void>;
let override: Transport | null = null;

/** Test seam. */
export function __setTransport(t: Transport | null): void {
  override = t;
}

export function mailConfigured(env: Record<string, string | undefined> = process.env): boolean {
  if (override) return true;
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.MAIL_FROM);
}

export async function sendMail(m: MailMessage): Promise<void> {
  if (override) return override(m);
  if (isWorkers()) throw new Error('Mail is sent from the VM, not from a Worker.');
  if (!mailConfigured()) throw new Error('SMTP is not configured.');
  const nodemailer = await import('nodemailer');
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, to: m.to, subject: m.subject, text: m.text, html: m.html });
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout(title: string, body: string, button?: { label: string; url: string }, footer = ''): { html: string; text: string } {
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
<h2 style="margin:0 0 16px;color:#1d4ed8">${esc(title)}</h2>
${body}
${button ? `<p style="margin:28px 0"><a href="${esc(button.url)}" style="background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">${esc(button.label)}</a></p><p style="font-size:13px;color:#6b7280;word-break:break-all">If the button does not work, copy this link into your browser:<br>${esc(button.url)}</p>` : ''}
${footer ? `<p style="font-size:13px;color:#6b7280;margin-top:24px">${esc(footer)}</p>` : ''}
<p style="font-size:12px;color:#9ca3af;margin-top:28px">AI Job Search Agent · agilepartners-ai.com</p></div>`;
  const plain = (s: string) => s.replace(/<\/p>/g, '\n\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
  const text = `${title}\n\n${plain(body)}${button ? `\n\n${button.label}: ${button.url}` : ''}${footer ? `\n\n${footer}` : ''}\n`;
  return { html, text };
}

export function confirmEmail(to: string, name: string, url: string): MailMessage {
  const { html, text } = layout(
    'Confirm your email',
    `<p>Hi ${esc(name || 'there')},</p><p>Press the button to finish creating your account. The link works once and expires in 24 hours.</p>`,
    { label: 'Confirm email and sign in', url },
    'If you did not sign up, ignore this email. No account is created until the link is used.',
  );
  return { to, subject: 'Confirm your email for AI Job Search Agent', text, html };
}

export function alreadyRegisteredEmail(to: string, signInUrl: string, resetUrl: string): MailMessage {
  const { html, text } = layout(
    'You already have an account',
    `<p>Someone, probably you, tried to sign up with this address, but it already has an account.</p><p>You can sign in, or choose a new password here: ${esc(resetUrl)}</p>`,
    { label: 'Sign in', url: signInUrl },
    'If this was not you, you can ignore this email. Your account is unchanged.',
  );
  return { to, subject: 'You already have an AI Job Search Agent account', text, html };
}

export function resetEmail(to: string, url: string): MailMessage {
  const { html, text } = layout(
    'Choose a new password',
    '<p>We got a request to set a password for your account. The link works once and expires in 1 hour.</p>',
    { label: 'Choose a new password', url },
    'If you did not ask for this, ignore this email. Your password stays as it is.',
  );
  return { to, subject: 'Reset your AI Job Search Agent password', text, html };
}

export function passwordChangedEmail(to: string, when: string): MailMessage {
  const { html, text } = layout(
    'Your password was changed',
    `<p>The password for your account was changed on ${esc(when)}. You were signed out on your other devices.</p><p>If this was not you, reset your password now and reply to this email.</p>`,
  );
  return { to, subject: 'Your AI Job Search Agent password was changed', text, html };
}
