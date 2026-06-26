import { isEmailEnabled, getResendApiKey, getResendFromAddress, isResendConfigured } from "@/lib/email/resend-config";
import { Resend } from "resend";
import { isWhatsAppEnabled } from "@/lib/whatsapp/whatsapp-config";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/send-whatsapp-text";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp/phone";

const COMPANY_NAME = "Maurya-Homes";

function buildCredentialsEmail(params: {
  tenantName: string;
  loginId: string;
  password: string;
}) {
  const subject = `${COMPANY_NAME} — Your tenant portal login`;
  const text = [
    `Dear ${params.tenantName},`,
    "",
    "Your tenant portal account has been created.",
    "",
    `Login ID (email): ${params.loginId}`,
    `Temporary password: ${params.password}`,
    "",
    "Sign in and you will be asked to set a new password on first login.",
    "",
    COMPANY_NAME,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;max-width:560px">
      <p style="color:#059669;font-size:12px;letter-spacing:0.08em;text-transform:uppercase">${COMPANY_NAME}</p>
      <h1 style="font-size:22px">Tenant portal login</h1>
      <p>Dear ${params.tenantName},</p>
      <p>Your tenant portal account has been created. Use the credentials below to sign in.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#64748b">Login ID</td><td style="padding:8px 0;font-weight:600">${params.loginId}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Temporary password</td><td style="padding:8px 0;font-weight:600">${params.password}</td></tr>
      </table>
      <p>You must change your password after the first login.</p>
      <p style="color:#64748b;font-size:13px">${COMPANY_NAME}</p>
    </div>`;

  return { subject, html, text };
}

function buildCredentialsWhatsAppMessage(params: {
  tenantName: string;
  loginId: string;
  password: string;
}) {
  return [
    `Dear ${params.tenantName},`,
    "",
    `Your ${COMPANY_NAME} tenant portal account is ready.`,
    "",
    `Login ID: ${params.loginId}`,
    `Temporary password: ${params.password}`,
    "",
    "Please sign in and change your password on first login.",
  ].join("\n");
}

export async function sendTenantCredentialsNotifications(params: {
  tenantName: string;
  email: string;
  phone?: string | null;
  loginId: string;
  password: string;
}) {
  if ((await isEmailEnabled()) && isResendConfigured()) {
    const { subject, html, text } = buildCredentialsEmail({
      tenantName: params.tenantName,
      loginId: params.loginId,
      password: params.password,
    });
    const resend = new Resend(getResendApiKey());
    const { error } = await resend.emails.send({
      from: getResendFromAddress(),
      to: params.email,
      subject,
      html,
      text,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  if (params.phone && (await isWhatsAppEnabled())) {
    const whatsappNumber = normalizeWhatsAppNumber(params.phone);
    if (whatsappNumber) {
      await sendWhatsAppTextMessage({
        whatsappNumber,
        message: buildCredentialsWhatsAppMessage({
          tenantName: params.tenantName,
          loginId: params.loginId,
          password: params.password,
        }),
      });
    }
  }
}
