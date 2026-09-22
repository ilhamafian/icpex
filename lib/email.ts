import "server-only";

import { Resend } from "resend";

import type { UserRole } from "@/schemas/userSchema";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return new Resend(apiKey);
}

function getFromEmail() {
  const from = process.env.FROM_EMAIL;
  if (!from) {
    throw new Error("Missing FROM_EMAIL");
  }
  return from;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  SECRETARY: "Secretary",
  THESIS_JUDGE: "Thesis Judge",
  EBOOK_JUDGE: "E-book Judge",
};

export async function sendUserInviteEmail(options: {
  to: string;
  role: UserRole;
  inviteUrl: string;
}) {
  const resend = getResendClient();
  const roleLabel = ROLE_LABELS[options.role];

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: options.to,
    subject: "You're invited to ICPEX",
    html: `
      <p>You have been invited to join ICPEX as a <strong>${roleLabel}</strong>.</p>
      <p>Click the link below to verify your email and create your password. This link expires in 7 days.</p>
      <p><a href="${options.inviteUrl}">Accept invitation</a></p>
      <p>If you did not expect this invitation, you can ignore this email.</p>
    `,
    text: `You have been invited to join ICPEX as a ${roleLabel}.\n\nAccept your invitation (expires in 7 days):\n${options.inviteUrl}\n\nIf you did not expect this invitation, you can ignore this email.`,
  });

  if (error) {
    throw new Error(error.message || "Failed to send invite email");
  }
}
