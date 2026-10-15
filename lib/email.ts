import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

import type { UserRole } from "@/schemas/userSchema";
import { formatMoney, type Currency } from "@/utils/registrationFee";

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
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
  const { attachments, ...rest } = message;
  const { error } = await resend.emails.send({
    from: requireEnv("FROM_EMAIL"),
    ...rest,
    attachments: attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
    })),
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendRegistrationSubmittedEmail(options: {
  to: string;
  submissionNumber: string;
  institutionName: string;
  projectCount: number;
  /** When false, the submission is free and no payment email will follow. */
  paymentDue: boolean;
}) {
  const projects =
    options.projectCount === 1 ? "1 project" : `${options.projectCount} projects`;
  const followUp = options.paymentDue
    ? "The secretariat will review the fee and send a separate email with payment instructions. You do not need to pay yet."
    : "No payment is due for this submission.";

  await sendMail({
    to: options.to,
    subject: "ICPEX registration submitted",
    html: `
      <p>Your registration <strong>${escapeHtml(options.submissionNumber)}</strong> for ${escapeHtml(options.institutionName)} has been submitted (${escapeHtml(projects)}).</p>
      <p>${escapeHtml(followUp)}</p>
    `,
    text: `Your registration ${options.submissionNumber} for ${options.institutionName} has been submitted (${projects}).\n\n${followUp}`,
  });
}

export async function sendPaymentRequestEmail(options: {
  to: string;
  submissionNumber: string;
  amount: number;
  currency: Currency;
  payUrl: string;
  projects: { title: string; amount: number }[];
}) {
  const total = formatMoney(options.amount, options.currency);
  const lines = options.projects
    .map(
      (project) =>
        `${project.title}: ${formatMoney(project.amount, options.currency)}`
    )
    .join("\n");
  const htmlLines = options.projects
    .map(
      (project) =>
        `<li>${escapeHtml(project.title)} — ${escapeHtml(formatMoney(project.amount, options.currency))}</li>`
    )
    .join("");

  await sendMail({
    to: options.to,
    subject: `ICPEX payment request (${options.submissionNumber})`,
    html: `
      <p>Your registration <strong>${escapeHtml(options.submissionNumber)}</strong> has been reviewed. Please pay <strong>${escapeHtml(total)}</strong> by bank transfer.</p>
      <ul>${htmlLines}</ul>
      <p>Use <strong>${escapeHtml(options.submissionNumber)}</strong> as the payment reference, then open the link below to upload your receipt.</p>
      <p><a href="${escapeHtml(options.payUrl)}">Complete payment</a></p>
    `,
    text: `Your registration ${options.submissionNumber} has been reviewed. Please pay ${total} by bank transfer.\n\n${lines}\n\nUse ${options.submissionNumber} as the payment reference, then upload your receipt:\n${options.payUrl}`,
  });
}

export async function sendNoPaymentDueEmail(options: {
  to: string;
  submissionNumber: string;
}) {
  await sendMail({
    to: options.to,
    subject: `ICPEX registration ${options.submissionNumber} — no payment due`,
    html: `
      <p>Your registration <strong>${escapeHtml(options.submissionNumber)}</strong> has been reviewed. No payment is due.</p>
    `,
    text: `Your registration ${options.submissionNumber} has been reviewed. No payment is due.`,
  });
}

export async function sendPaymentReceivedEmail(options: {
  to: string;
  submissionNumber: string;
  invoiceNumber: string;
  amount: number;
  currency: Currency;
  invoicePdf: Buffer;
  /** Extra amount the participant transferred, refunded outside the app. */
  overpaid?: { amount: number; currency: Currency };
}) {
  const total = formatMoney(options.amount, options.currency);
  const refund = options.overpaid
    ? `You transferred ${formatMoney(options.overpaid.amount, options.overpaid.currency)} more than the amount due. The secretariat will refund the difference.`
    : "";

  await sendMail({
    to: options.to,
    subject: `ICPEX payment received (${options.submissionNumber})`,
    html: `
      <p>We have received your payment of <strong>${escapeHtml(total)}</strong> for registration <strong>${escapeHtml(options.submissionNumber)}</strong>.</p>
      ${refund ? `<p>${escapeHtml(refund)}</p>` : ""}
      <p>Your invoice ${escapeHtml(options.invoiceNumber)} is attached.</p>
    `,
    text: `We have received your payment of ${total} for registration ${options.submissionNumber}.\n\n${refund ? `${refund}\n\n` : ""}Your invoice ${options.invoiceNumber} is attached.`,
    attachments: [
      {
        filename: `${options.invoiceNumber}.pdf`,
        content: options.invoicePdf,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendUnderpaidEmail(options: {
  to: string;
  submissionNumber: string;
  balance: number;
  currency: Currency;
  payUrl: string;
}) {
  const balance = formatMoney(options.balance, options.currency);

  await sendMail({
    to: options.to,
    subject: `ICPEX payment incomplete (${options.submissionNumber})`,
    html: `
      <p>We checked your transfer for registration <strong>${escapeHtml(options.submissionNumber)}</strong>. It was <strong>${escapeHtml(balance)}</strong> short of the amount due.</p>
      <p>Please transfer the balance using <strong>${escapeHtml(options.submissionNumber)}</strong> as the reference, then upload the new receipt.</p>
      <p><a href="${escapeHtml(options.payUrl)}">Pay the balance</a></p>
    `,
    text: `We checked your transfer for registration ${options.submissionNumber}. It was ${balance} short of the amount due.\n\nPlease transfer the balance using ${options.submissionNumber} as the reference, then upload the new receipt:\n${options.payUrl}`,
  });
}

export async function sendPaymentReminderEmail(options: {
  to: string;
  submissionNumber: string;
  amount: number;
  currency: Currency;
  payUrl: string;
  /** True when only an underpaid balance is outstanding. */
  isBalance: boolean;
}) {
  const due = formatMoney(options.amount, options.currency);
  const what = options.isBalance ? "the remaining balance of" : "";

  await sendMail({
    to: options.to,
    subject: `Reminder: ICPEX payment due (${options.submissionNumber})`,
    html: `
      <p>This is a reminder that ${what ? `${escapeHtml(what)} ` : ""}<strong>${escapeHtml(due)}</strong> is still due for registration <strong>${escapeHtml(options.submissionNumber)}</strong>.</p>
      <p>Transfer it using <strong>${escapeHtml(options.submissionNumber)}</strong> as the reference, then upload your receipt.</p>
      <p><a href="${escapeHtml(options.payUrl)}">Complete payment</a></p>
    `,
    text: `This is a reminder that ${what ? `${what} ` : ""}${due} is still due for registration ${options.submissionNumber}.\n\nTransfer it using ${options.submissionNumber} as the reference, then upload your receipt:\n${options.payUrl}`,
  });
}
