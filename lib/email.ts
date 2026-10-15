import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

import type { UserRole } from "@/schemas/userSchema";

type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

/** DEBUG_MODE=true sends through Resend; otherwise through SMTP. */
function isDebugMode() {
  const flag = process.env.DEBUG_MODE?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

async function sendViaResend(message: MailMessage) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const { error } = await resend.emails.send({
    from: requireEnv("FROM_EMAIL"),
    ...message,
  });
  if (error) {
    throw new Error(error.message || "Failed to send email");
  }
}

let transporter: Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const driver = process.env.MAIL_DRIVER ?? "smtp";
  if (driver !== "smtp") {
    throw new Error(`Unsupported MAIL_DRIVER "${driver}" (only "smtp" is supported)`);
  }

  const port = Number(requireEnv("MAIL_PORT"));
  if (!Number.isInteger(port)) {
    throw new Error("MAIL_PORT must be a number");
  }

  // "ssl" = implicit TLS (usually 465); "tls" = STARTTLS upgrade (usually 587).
  const encryption = process.env.MAIL_ENCRYPTION?.trim().toLowerCase();

  transporter = nodemailer.createTransport({
    host: requireEnv("MAIL_HOST"),
    port,
    secure: encryption === "ssl",
    requireTLS: encryption === "tls",
    auth: {
      user: requireEnv("MAIL_USERNAME"),
      pass: requireEnv("MAIL_PASSWORD"),
    },
  });
  return transporter;
}

function getFrom() {
  const address = requireEnv("MAIL_FROM_ADDRESS");
  const name = process.env.MAIL_FROM_NAME;
  return name ? { name, address } : address;
}

async function sendMail(message: MailMessage) {
  if (isDebugMode()) {
    await sendViaResend(message);
    return;
  }

  await getTransporter().sendMail({ from: getFrom(), ...message });
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  SECRETARY: "Secretary",
  THESIS_JUDGE: "Thesis Judge",
  EBOOK_JUDGE: "E-book Judge",
  JTEC_JUDGE: "JTEC Judge",
};

export async function sendUserInviteEmail(options: {
  to: string;
  role: UserRole;
  /** Shown for competition-scoped roles (everything except ADMIN). */
  competitionName?: string;
  inviteUrl: string;
}) {
  const roleLabel = options.competitionName
    ? `${ROLE_LABELS[options.role]} for ${options.competitionName}`
    : ROLE_LABELS[options.role];

  await sendMail({
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
}
