// Email simulation — replace with Resend or SendGrid in production.
// import { Resend } from "resend";
// const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendPasswordResetEmail(to: string, rawToken: string) {
  const link = `${APP_URL}/auth/reset-password?token=${rawToken}`;
  // Production: replace with resend.emails.send({ from, to, subject, html })
  console.log(`[EMAIL] Password reset link for ${to}:`);
  console.log(`[EMAIL] ${link}`);
}

export async function sendEmailChangeVerification(to: string, rawToken: string) {
  const link = `${APP_URL}/auth/verify-email?token=${rawToken}`;
  console.log(`[EMAIL] Email change verification for ${to}:`);
  console.log(`[EMAIL] ${link}`);
}
