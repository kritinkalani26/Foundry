import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = "Foundry <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, rawToken: string) {
  const link = `${APP_URL}/auth/reset-password?token=${rawToken}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your Foundry password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.2 10.8L22 12L13.2 13.2L12 22L10.8 13.2L2 12L10.8 10.8Z" fill="#EA580C"/>
          </svg>
          <span style="font-size:18px;font-weight:800;color:#111827">Foundry</span>
        </div>

        <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 10px">Reset your password</h1>
        <p style="font-size:15px;color:#6B7280;line-height:1.6;margin:0 0 28px">
          We received a request to reset the password for your Foundry account.
          Click the button below to choose a new password.
        </p>

        <a href="${link}"
           style="display:inline-block;padding:14px 28px;border-radius:12px;background:linear-gradient(135deg,#EA580C,#C2410C);color:#fff;font-weight:700;font-size:15px;text-decoration:none">
          Reset Password
        </a>

        <p style="font-size:13px;color:#9CA3AF;margin:24px 0 0;line-height:1.6">
          This link expires in <strong>1 hour</strong>. If you didn't request a password reset,
          you can safely ignore this email — your password won't change.
        </p>

        <hr style="border:none;border-top:1px solid #F3F4F6;margin:28px 0"/>
        <p style="font-size:12px;color:#9CA3AF;margin:0">
          Foundry · India's Makerspace Marketplace
        </p>
      </div>
    `,
  });
}

export async function sendEmailChangeVerification(to: string, rawToken: string) {
  const link = `${APP_URL}/auth/verify-email?token=${rawToken}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your new Foundry email address",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.2 10.8L22 12L13.2 13.2L12 22L10.8 13.2L2 12L10.8 10.8Z" fill="#EA580C"/>
          </svg>
          <span style="font-size:18px;font-weight:800;color:#111827">Foundry</span>
        </div>

        <h1 style="font-size:22px;font-weight:800;color:#111827;margin:0 0 10px">Verify your new email</h1>
        <p style="font-size:15px;color:#6B7280;line-height:1.6;margin:0 0 28px">
          Click the button below to confirm your new email address.
        </p>

        <a href="${link}"
           style="display:inline-block;padding:14px 28px;border-radius:12px;background:linear-gradient(135deg,#EA580C,#C2410C);color:#fff;font-weight:700;font-size:15px;text-decoration:none">
          Verify Email
        </a>

        <p style="font-size:13px;color:#9CA3AF;margin:24px 0 0;line-height:1.6">
          This link expires in <strong>1 hour</strong>. If you didn't request this change, contact us immediately.
        </p>

        <hr style="border:none;border-top:1px solid #F3F4F6;margin:28px 0"/>
        <p style="font-size:12px;color:#9CA3AF;margin:0">
          Foundry · India's Makerspace Marketplace
        </p>
      </div>
    `,
  });
}
