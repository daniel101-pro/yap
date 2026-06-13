import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { ensureEnvLoaded, getResendApiKey, isSmtpConfigured } from '@/lib/env';

function verificationHtml(code: string) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
      <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">Verify your email</h1>
      <p style="color: #666; margin-bottom: 24px;">Enter this code in YAP to sign in. It expires in 10 minutes.</p>
      <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #00796B; margin: 0;">${code}</p>
      <p style="color: #999; font-size: 13px; margin-top: 32px;">If you didn't request this, ignore this email.</p>
    </div>
  `;
}

function getEmailFrom() {
  return process.env.EMAIL_FROM?.replace(/^"|"$/g, '') ?? 'YAP <noreply@yap.college>';
}

export function getResendClient() {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

async function sendViaSmtp(email: string, code: string) {
  ensureEnvLoaded();

  if (!isSmtpConfigured()) {
    throw new Error('SMTP is not configured.');
  }

  const host = process.env.SMTP_HOST!.trim();
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASS!.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const from =
    process.env.SMTP_FROM?.trim() ??
    process.env.EMAIL_FROM?.replace(/^"|"$/g, '') ??
    user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: `${code} — your YAP verification code`,
    html: verificationHtml(code),
  });
}

async function sendViaResend(email: string, code: string) {
  const resend = getResendClient();
  const from = getEmailFrom();

  if (!resend) {
    throw new Error(
      'Resend not configured. Set AUTH_RESEND_KEY and EMAIL_FROM (e.g. noreply@yap.college) in .env.',
    );
  }

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: `${code} — your YAP verification code`,
    html: verificationHtml(code),
  });

  if (error) {
    if (error.message.toLowerCase().includes('api key')) {
      throw new Error('Invalid Resend API key. Create a new key at resend.com/api-keys and update .env.');
    }

    throw new Error(error.message);
  }
}

export async function sendVerificationEmail(email: string, code: string) {
  ensureEnvLoaded();

  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (provider === 'smtp') {
    await sendViaSmtp(email, code);
    return;
  }

  if (getResendApiKey()) {
    await sendViaResend(email, code);
    return;
  }

  if (isSmtpConfigured()) {
    await sendViaSmtp(email, code);
    return;
  }

  throw new Error(
    'Email not configured. Set AUTH_RESEND_KEY + EMAIL_FROM, or SMTP_HOST/SMTP_USER/SMTP_PASS in .env.',
  );
}
