import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

import {
  CLOSING_CEREMONY_MODE_LABELS,
  type Competition,
} from "@/schemas/competitionSchema";
import { competitionCategoryLabel, type EducationLevel } from "@/schemas/educationLevel";
import {
  educationLevelForRole,
  USER_ROLE_LABELS,
  type UserRole,
} from "@/schemas/userRole";
import { readBankDetails } from "@/lib/bankDetails";
import { formatMoney, type Currency } from "@/utils/registrationFee";

/** Formatted competition strings used in participant and judge emails. */
export type CompetitionEmailCopy = {
  name: string;
  formalName: string;
  theme: string;
  paymentDeadline: string;
  judgingPeriod: string;
  closingCeremony: string;
};

function formatEmailDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** HH:mm → "3:00 pm". Empty when the value is missing or invalid. */
function formatEmailTime(value: string | undefined) {
  const match = value?.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

function formatClosingCeremony(
  competition: Pick<
    Competition,
    "closing_ceremony_date" | "closing_ceremony_mode" | "closing_ceremony_time"
  >
) {
  if (!competition.closing_ceremony_date || !competition.closing_ceremony_mode) {
    return "";
  }
  const date = formatEmailDate(competition.closing_ceremony_date);
  const mode = CLOSING_CEREMONY_MODE_LABELS[competition.closing_ceremony_mode];
  const time = formatEmailTime(competition.closing_ceremony_time ?? undefined);
  return `${date} (${mode}, ${time || "time to be confirmed"})`;
}

/** Build the email copy block from a competition record. */
export function competitionEmailCopy(
  competition: Pick<
    Competition,
    | "name"
    | "formal_name"
    | "theme"
    | "payment_deadline"
    | "judging_start_date"
    | "judging_due_date"
    | "closing_ceremony_date"
    | "closing_ceremony_mode"
    | "closing_ceremony_time"
  >
): CompetitionEmailCopy {
  const name = competition.name.trim();
  const formalName = competition.formal_name?.trim() || name;
  const theme = competition.theme?.trim() || "";
  const paymentDeadline = competition.payment_deadline
    ? formatEmailDate(competition.payment_deadline)
    : "";
  const judgingStart = competition.judging_start_date
    ? formatEmailDate(competition.judging_start_date)
    : "";
  const judgingEnd = competition.judging_due_date
    ? formatEmailDate(competition.judging_due_date)
    : "";
  const judgingPeriod =
    judgingStart && judgingEnd
      ? `${judgingStart} – ${judgingEnd}`
      : judgingEnd || judgingStart;
  return {
    name,
    formalName,
    theme,
    paymentDeadline,
    judgingPeriod,
    closingCeremony: formatClosingCeremony(competition),
  };
}

function themedCompetition(copy: CompetitionEmailCopy) {
  return copy.theme
    ? `${copy.formalName}, themed "${copy.theme}"`
    : copy.formalName;
}

function coOrganiserSentence(copy: CompetitionEmailCopy) {
  return `Institutions that register five (5) paid participants will receive one (1) complimentary registration for a sixth participant and will be recognised as a Co-Organiser of ${copy.name}.`;
}

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

const JUDGE_INVITE_ROLES = new Set<UserRole>([
  "POSTGRAD_JUDGE",
  "UNDERGRAD_JUDGE",
  "POSTGRAD_JUDGE_LEADER",
  "UNDERGRAD_JUDGE_LEADER",
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function optionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Drops whichever of email or phone is unset, and the whole sentence when both are. */
function contactSentence() {
  const email = optionalEnv("SECRETARIAT_EMAIL");
  const phone = optionalEnv("SECRETARIAT_PHONE");
  if (email && phone) {
    return `For any questions, please contact the secretariat at ${email} or ${phone}.`;
  }
  if (email) return `For any questions, please contact the secretariat at ${email}.`;
  if (phone) return `For any questions, please contact the secretariat at ${phone}.`;
  return "";
}

function signOffText(copy: CompetitionEmailCopy) {
  return `Warm regards,\nSecretariat, ${copy.name}\nUniKL MIIT`;
}

function signOffHtml(copy: CompetitionEmailCopy) {
  return `<p>Warm regards,<br>Secretariat, ${escapeHtml(copy.name)}<br>UniKL MIIT</p>`;
}

function greeting(name: string) {
  const safe = name.trim() || "Participant";
  return { text: `Dear ${safe},`, html: `<p>Dear ${escapeHtml(safe)},</p>` };
}

const INTRO_TEXT = "Greetings from the Research and Innovation Section, UniKL MIIT.";
const INTRO_HTML = `<p>${INTRO_TEXT}</p>`;

function joinText(parts: Array<string | undefined>) {
  return parts.filter((part) => part && part.trim()).join("\n\n");
}

function joinHtml(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join("\n");
}

function paymentInstructions(competitionName: string, reference?: string) {
  const bank = readBankDetails();
  const paymentCode = competitionName.trim();
  const paymentRemarks = `UNIKLMIIT-${paymentCode}`;
  const textLines = [
    "Option 1: JomPAY",
    "Biller Code: 67496",
    "Reference Code 1: MyKad / Passport Number",
    `Reference Code 2: ${paymentCode}`,
  ];
  if (bank) {
    textLines.push(
      "",
      "Option 2: Telegraphic Transfer",
      `Account Name: ${bank.accountName}`,
      `Bank Account Number: ${bank.accountNumber}`,
      `Bank Name: ${bank.bankName}`,
      `Payment Remarks: ${paymentRemarks}`
    );
  }
  if (reference) {
    textLines.push("", `Use ${reference} as the payment reference.`);
  }

  const transferHtml = bank
    ? `<p><strong>Option 2: Telegraphic Transfer</strong><br>
Account Name: ${escapeHtml(bank.accountName)}<br>
Bank Account Number: ${escapeHtml(bank.accountNumber)}<br>
Bank Name: ${escapeHtml(bank.bankName)}<br>
Payment Remarks: ${escapeHtml(paymentRemarks)}</p>`
    : "";
  const referenceHtml = reference
    ? `<p>Use <strong>${escapeHtml(reference)}</strong> as the payment reference.</p>`
    : "";

  return {
    text: textLines.join("\n"),
    html: `<p><strong>Option 1: JomPAY</strong><br>
Biller Code: 67496<br>
Reference Code 1: MyKad / Passport Number<br>
Reference Code 2: ${escapeHtml(paymentCode)}</p>
${transferHtml}
${referenceHtml}`,
  };
}

function uploadLink(url: string, label: string) {
  return {
    text: `${label}:\n${url}`,
    html: `<p><a href="${escapeHtml(url)}">${escapeHtml(label)}</a></p>`,
  };
}

function detailList(rows: Array<[string, string]>) {
  const filled = rows.filter(([, value]) => value.trim());
  return {
    text: filled.map(([label, value]) => `${label}: ${value}`).join("\n"),
    html: `<ul>${filled
      .map(([label, value]) => `<li>${escapeHtml(label)}: ${escapeHtml(value)}</li>`)
      .join("")}</ul>`,
  };
}

function isJudgeInviteRole(role: UserRole) {
  return JUDGE_INVITE_ROLES.has(role);
}

function judgeCategory(role: UserRole) {
  return educationLevelForRole(role) === "POSTGRADUATE"
    ? competitionCategoryLabel("POSTGRADUATE")
    : competitionCategoryLabel("UNDERGRADUATE");
}

export async function sendUserInviteEmail(options: {
  to: string;
  role: UserRole;
  /** Shown for competition-scoped roles (everything except super admin). */
  competitionName?: string;
  /** Required for judge invites so dates and theme come from the competition. */
  copy?: CompetitionEmailCopy;
  /** Absent until the person accepts the invite and sets a name. */
  name?: string;
  inviteUrl: string;
}) {
  if (isJudgeInviteRole(options.role)) {
    await sendJudgeInviteEmail({
      ...options,
      copy:
        options.copy ??
        competitionEmailCopy({ name: options.competitionName ?? "ICPEX" }),
    });
    return;
  }

  const roleLabel = options.competitionName
    ? `${USER_ROLE_LABELS[options.role]} for ${options.competitionName}`
    : USER_ROLE_LABELS[options.role];

  await sendMail({
    to: options.to,
    subject: "You're invited to ICPEX",
    html: `
      <p>You have been invited to join ICPEX as a <strong>${escapeHtml(roleLabel)}</strong>.</p>
      <p>Click the link below to verify your email and create your password. This link expires in 7 days.</p>
      <p><a href="${escapeHtml(options.inviteUrl)}">Accept invitation</a></p>
      <p>If you did not expect this invitation, you can ignore this email.</p>
    `,
    text: `You have been invited to join ICPEX as a ${roleLabel}.\n\nAccept your invitation (expires in 7 days):\n${options.inviteUrl}\n\nIf you did not expect this invitation, you can ignore this email.`,
  });
}

async function sendJudgeInviteEmail(options: {
  to: string;
  role: UserRole;
  copy: CompetitionEmailCopy;
  name?: string;
  inviteUrl: string;
}) {
  const { copy } = options;
  const greet = greeting(options.name?.trim() || "Judge");
  const contact = contactSentence();
  const link = uploadLink(options.inviteUrl, "Accept invitation");
  const category = judgeCategory(options.role);
  const details = detailList([
    ["Category", category],
    ["Judging Period", copy.judgingPeriod],
    ["Mode", "Online"],
    ["Closing Ceremony & Result Announcement", copy.closingCeremony],
  ]);
  const opening = `On behalf of the organising committee, we are pleased to invite you to serve as a Judge for the ${themedCompetition(copy)}.`;
  const about = `${copy.name} is a virtual competition that brings together undergraduate and postgraduate participants from UniKL and other local and international institutions. It builds on the Kuala Lumpur Idea & Innovation Competition (KLIIC) and I-CPEX and now includes undergraduate innovation projects and postgraduate research communication through the Five-Minute Thesis (5MT) Competition. Your expertise and industry/academic perspectives would be valuable in evaluating the participants.`;
  const roleText = [
    "Your role as a judge:",
    "Review the assigned submissions (abstract, video, 5MT slide, and full paper where available).",
    "Evaluate each submission using the official judging and evaluation form, which will be provided online.",
    "Submit your scores and comments by the end of the judging period.",
  ].join("\n");
  const accept =
    "Please open the link below to accept this invitation and create your password. This link expires in 7 days. If you have a conflict of interest with any participant or institution, please let us know so that we can reassign the submission.";
  const close = `We sincerely hope you will accept this invitation and look forward to your support for ${copy.name}.\n\nThank you.`;

  await sendMail({
    to: options.to,
    subject: `Invitation to Serve as a Judge: ${copy.name}`,
    html: joinHtml([
      greet.html,
      INTRO_HTML,
      `<p>${escapeHtml(opening)}</p>`,
      `<p>${escapeHtml(about)}</p>`,
      "<p>Judging details:</p>",
      details.html,
      `<p>${escapeHtml(roleText).replace(/\n/g, "<br>")}</p>`,
      `<p>${escapeHtml(accept)}</p>`,
      link.html,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      `<p>${escapeHtml(close).replace(/\n/g, "<br>")}</p>`,
      signOffHtml(copy),
    ]),
    text: joinText([
      greet.text,
      INTRO_TEXT,
      opening,
      about,
      `Judging details:\n${details.text}`,
      roleText,
      accept,
      link.text,
      contact,
      close,
      signOffText(copy),
    ]),
  });
}

export async function sendRegistrationSubmittedEmail(options: {
  to: string;
  participantName: string;
  registrationNumber: string;
  institutionName: string;
  educationLevel: EducationLevel;
  trackName: string;
  projectTitle: string;
  /** When false, the registration is free and no payment email will follow. */
  paymentDue: boolean;
  copy: CompetitionEmailCopy;
}) {
  const { copy } = options;
  const greet = greeting(options.participantName);
  const contact = contactSentence();
  const details = detailList([
    ["Registration ID", options.registrationNumber],
    ["Name", options.participantName],
    ["Institution", options.institutionName],
    ["Category", competitionCategoryLabel(options.educationLevel)],
    ["Track", options.trackName],
    ["Abstract Title", options.projectTitle],
  ]);
  const opening = `Thank you for your interest in the ${themedCompetition(copy)}. We are pleased to confirm that your registration and abstract submission have been received successfully.`;
  const instructions = options.paymentDue
    ? paymentInstructions(copy.name)
    : undefined;
  const paymentNote = options.paymentDue
    ? "The secretariat will send a separate email with a link to upload your receipt. You do not need to email proof of payment."
    : "No payment is due for this registration.";
  const paymentDeadlineLine = copy.paymentDeadline
    ? `Please complete your registration fee payment by ${copy.paymentDeadline}.`
    : "Please complete your registration fee payment by the published deadline.";
  const paymentText = options.paymentDue
    ? [
        paymentDeadlineLine,
        "UniKL MIIT / Other UniKL Campuses: RM100.00",
        "IPTA/IPTS: RM150.00",
        "International Participant: USD50.00",
        instructions?.text,
        paymentNote,
      ].join("\n")
    : paymentNote;
  const paymentHtml = options.paymentDue
    ? `<p>${escapeHtml(paymentDeadlineLine)}</p>
<ul>
<li>UniKL MIIT / Other UniKL Campuses: RM100.00</li>
<li>IPTA/IPTS: RM150.00</li>
<li>International Participant: USD50.00</li>
</ul>
${instructions?.html ?? ""}
<p>${escapeHtml(paymentNote)}</p>`
    : `<p>${escapeHtml(paymentNote)}</p>`;
  const nextSteps = [
    "Next steps and important dates:",
    copy.paymentDeadline
      ? `Video Submission Deadline: ${copy.paymentDeadline}`
      : undefined,
    copy.paymentDeadline
      ? `Full Paper Submission Deadline (optional): ${copy.paymentDeadline}`
      : undefined,
    copy.judgingPeriod ? `Judging Period: ${copy.judgingPeriod}` : undefined,
    copy.closingCeremony
      ? `Closing Ceremony & Result Announcement: ${copy.closingCeremony}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n");
  const publication =
    "All submitted abstracts will be compiled in an ISBN abstract book. Participants may also submit a full paper to be considered for publication in a special issue of the Journal of Computing Technologies and Creative Content (JTeC), subject to peer review and editorial acceptance.";
  const close = "We look forward to your participation and wish you all the best.";
  const coOrganiser = coOrganiserSentence(copy);

  await sendMail({
    to: options.to,
    subject: `${copy.name}: Registration and Abstract Submission Successful`,
    html: joinHtml([
      greet.html,
      INTRO_HTML,
      `<p>${escapeHtml(opening)}</p>`,
      "<p>Your submission details:</p>",
      details.html,
      "<p><strong>Payment</strong></p>",
      paymentHtml,
      nextSteps
        ? `<p>${escapeHtml(nextSteps).replace(/\n/g, "<br>")}</p>`
        : "",
      `<p>${escapeHtml(publication)}</p>`,
      `<p>${escapeHtml(coOrganiser)}</p>`,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      `<p>${escapeHtml(close)}</p>`,
      signOffHtml(copy),
    ]),
    text: joinText([
      greet.text,
      INTRO_TEXT,
      opening,
      `Your submission details:\n${details.text}`,
      `Payment\n${paymentText}`,
      nextSteps,
      publication,
      coOrganiser,
      contact,
      close,
      signOffText(copy),
    ]),
  });
}

type PaymentLetter = {
  participantName: string;
  institutionName: string;
  categoryLabel: string;
  registrationNumber: string;
};

export async function sendPaymentRequestEmail(options: {
  to: string;
  submissionNumber: string;
  amount: number;
  currency: Currency;
  payUrl: string;
  projects: { title: string; amount: number }[];
  letter: PaymentLetter;
  copy: CompetitionEmailCopy;
}) {
  const { copy } = options;
  const greet = greeting(options.letter.participantName);
  const contact = contactSentence();
  const total = formatMoney(options.amount, options.currency);
  const instructions = paymentInstructions(copy.name, options.submissionNumber);
  const link = uploadLink(options.payUrl, "Upload your receipt");
  const details = detailList([
    ["Registration ID", options.letter.registrationNumber],
    ["Name", options.letter.participantName],
    ["Institution", options.letter.institutionName],
    ["Category", options.letter.categoryLabel],
    ["Amount due", total],
    ["Payment deadline", copy.paymentDeadline],
  ]);
  const projectText = options.projects
    .map((project) => `${project.title}: ${formatMoney(project.amount, options.currency)}`)
    .join("\n");
  const projectHtml = options.projects
    .map(
      (project) =>
        `<li>${escapeHtml(project.title)} — ${escapeHtml(formatMoney(project.amount, options.currency))}</li>`
    )
    .join("");
  const payBy = copy.paymentDeadline
    ? `Please pay ${total} by ${copy.paymentDeadline}.`
    : `Please pay ${total}.`;
  const opening = `Thank you for registering for the ${themedCompetition(copy)}. Your registration ${options.submissionNumber} has been reviewed. ${payBy}`;
  const judging =
    "Please note that submissions without confirmed payment will not proceed to the judging stage.";
  const close = `We appreciate your prompt attention and look forward to welcoming you to ${copy.name}.`;
  const coOrganiser = coOrganiserSentence(copy);

  await sendMail({
    to: options.to,
    subject: `${copy.name}: Registration Fee Payment (${options.submissionNumber})`,
    html: joinHtml([
      greet.html,
      INTRO_HTML,
      `<p>${escapeHtml(opening)}</p>`,
      "<p>Your registration details:</p>",
      details.html,
      `<ul>${projectHtml}</ul>`,
      instructions.html,
      "<p>Once payment is made, open the link below to upload your receipt.</p>",
      link.html,
      `<p>${escapeHtml(judging)}</p>`,
      `<p>${escapeHtml(coOrganiser)}</p>`,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      `<p>${escapeHtml(close)}</p>`,
      signOffHtml(copy),
    ]),
    text: joinText([
      greet.text,
      INTRO_TEXT,
      opening,
      `Your registration details:\n${details.text}`,
      projectText,
      instructions.text,
      "Once payment is made, open the link below to upload your receipt.",
      link.text,
      judging,
      coOrganiser,
      contact,
      close,
      signOffText(copy),
    ]),
  });
}

export async function sendNoPaymentDueEmail(options: {
  to: string;
  submissionNumber: string;
  participantName: string;
  copy: CompetitionEmailCopy;
}) {
  const { copy } = options;
  const greet = greeting(options.participantName);
  const contact = contactSentence();
  const body = `Your registration ${options.submissionNumber} has been reviewed. No payment is due.`;

  await sendMail({
    to: options.to,
    subject: `${copy.name}: No Payment Due (${options.submissionNumber})`,
    html: joinHtml([
      greet.html,
      INTRO_HTML,
      `<p>${escapeHtml(body)}</p>`,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      signOffHtml(copy),
    ]),
    text: joinText([greet.text, INTRO_TEXT, body, contact, signOffText(copy)]),
  });
}

export async function sendPaymentReceivedEmail(options: {
  to: string;
  submissionNumber: string;
  participantName: string;
  invoiceNumber: string;
  amount: number;
  currency: Currency;
  invoicePdf: Buffer;
  copy: CompetitionEmailCopy;
  /** Extra amount the participant transferred, refunded outside the app. */
  overpaid?: { amount: number; currency: Currency };
}) {
  const { copy } = options;
  const greet = greeting(options.participantName);
  const contact = contactSentence();
  const total = formatMoney(options.amount, options.currency);
  const body = `We have received your payment of ${total} for registration ${options.submissionNumber}.`;
  const refund = options.overpaid
    ? `You transferred ${formatMoney(options.overpaid.amount, options.overpaid.currency)} more than the amount due. The secretariat will refund the difference.`
    : "";
  const invoice = `Your invoice ${options.invoiceNumber} is attached.`;

  await sendMail({
    to: options.to,
    subject: `${copy.name}: Payment Received (${options.submissionNumber})`,
    html: joinHtml([
      greet.html,
      INTRO_HTML,
      `<p>${escapeHtml(body)}</p>`,
      refund ? `<p>${escapeHtml(refund)}</p>` : "",
      `<p>${escapeHtml(invoice)}</p>`,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      signOffHtml(copy),
    ]),
    text: joinText([
      greet.text,
      INTRO_TEXT,
      body,
      refund,
      invoice,
      contact,
      signOffText(copy),
    ]),
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
  participantName: string;
  balance: number;
  currency: Currency;
  payUrl: string;
  copy: CompetitionEmailCopy;
}) {
  const { copy } = options;
  const greet = greeting(options.participantName);
  const contact = contactSentence();
  const balance = formatMoney(options.balance, options.currency);
  const instructions = paymentInstructions(copy.name, options.submissionNumber);
  const link = uploadLink(options.payUrl, "Pay the balance");
  const byDeadline = copy.paymentDeadline
    ? ` by ${copy.paymentDeadline}`
    : "";
  const body = `We checked your transfer for registration ${options.submissionNumber}. It was ${balance} short of the amount due. Please transfer the remaining balance of ${balance}${byDeadline}, using ${options.submissionNumber} as the payment reference, then upload the new receipt.`;

  await sendMail({
    to: options.to,
    subject: `${copy.name}: Registration Fee Balance Due (${options.submissionNumber})`,
    html: joinHtml([
      greet.html,
      INTRO_HTML,
      `<p>${escapeHtml(body)}</p>`,
      instructions.html,
      link.html,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      signOffHtml(copy),
    ]),
    text: joinText([
      greet.text,
      INTRO_TEXT,
      body,
      instructions.text,
      link.text,
      contact,
      signOffText(copy),
    ]),
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
  letter: PaymentLetter;
  copy: CompetitionEmailCopy;
}) {
  const { copy } = options;
  const greet = greeting(options.letter.participantName);
  const contact = contactSentence();
  const due = formatMoney(options.amount, options.currency);
  const instructions = paymentInstructions(copy.name, options.submissionNumber);
  const link = uploadLink(options.payUrl, "Upload your receipt");
  const details = detailList([
    ["Registration ID", options.letter.registrationNumber],
    ["Name", options.letter.participantName],
    ["Institution", options.letter.institutionName],
    ["Category", options.letter.categoryLabel],
    ["Payment deadline", copy.paymentDeadline],
  ]);
  const opening = options.isBalance
    ? `Thank you for registering for the ${themedCompetition(copy)}. This is a friendly reminder that the remaining balance of ${due} is still due for registration ${options.submissionNumber}.`
    : `Thank you for registering for the ${themedCompetition(copy)}. This is a friendly reminder that our records show your registration fee of ${due} has not yet been received.`;
  const alreadyPaid = options.isBalance
    ? "If you have already transferred the remaining balance, upload the new receipt using the link below. If we already have it, please disregard this reminder."
    : "If you have already made the payment, upload your receipt using the link below. If we already have it, please disregard this reminder.";
  const judging =
    "Please note that submissions without confirmed payment will not proceed to the judging/evaluation stage.";
  const close = `We appreciate your prompt attention and look forward to welcoming you to ${copy.name}.`;
  const coOrganiser = coOrganiserSentence(copy);
  const subject = copy.paymentDeadline
    ? `Reminder: ${copy.name} Registration Fee Payment (Deadline ${copy.paymentDeadline})`
    : `Reminder: ${copy.name} Registration Fee Payment`;

  await sendMail({
    to: options.to,
    subject,
    html: joinHtml([
      greet.html,
      INTRO_HTML,
      `<p>${escapeHtml(opening)}</p>`,
      "<p>Your registration details:</p>",
      details.html,
      instructions.html,
      `<p>${escapeHtml(alreadyPaid)}</p>`,
      link.html,
      `<p>${escapeHtml(judging)}</p>`,
      `<p>${escapeHtml(coOrganiser)}</p>`,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      `<p>${escapeHtml(close)}</p>`,
      signOffHtml(copy),
    ]),
    text: joinText([
      greet.text,
      INTRO_TEXT,
      opening,
      `Your registration details:\n${details.text}`,
      instructions.text,
      alreadyPaid,
      link.text,
      judging,
      coOrganiser,
      contact,
      close,
      signOffText(copy),
    ]),
  });
}
