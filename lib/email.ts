import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import {
  CLOSING_CEREMONY_MODE_LABELS,
  type ClosingCeremonyMode,
  type Competition,
} from "@/schemas/competitionSchema";
import {
  documentDeadlineLines,
  documentReviewPhrase,
  requirementsForLevel,
  type DocumentRequirement,
} from "@/schemas/documentRequirement";
import {
  competitionCategoryLabel,
  type EducationLevel,
} from "@/schemas/educationLevel";
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
  undergraduateStreamName: string;
  postgraduateStreamName: string;
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
    | "undergraduate_stream_name"
    | "postgraduate_stream_name"
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
    undergraduateStreamName:
      competition.undergraduate_stream_name?.trim() ||
      competitionCategoryLabel("UNDERGRADUATE"),
    postgraduateStreamName:
      competition.postgraduate_stream_name?.trim() ||
      competitionCategoryLabel("POSTGRADUATE"),
    paymentDeadline,
    judgingPeriod,
    closingCeremony: formatClosingCeremony(competition),
  };
}

/** Stream / category display name for an education level. */
export function streamNameForLevel(
  copy: CompetitionEmailCopy,
  level: EducationLevel
) {
  return level === "UNDERGRADUATE"
    ? copy.undergraduateStreamName
    : copy.postgraduateStreamName;
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
  /** Which mailbox sends this. Defaults to the undergraduate account. */
  educationLevel?: EducationLevel;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

type MailboxSettings = {
  user: string;
  pass: string;
  address: string;
  name?: string;
};

/**
 * Postgraduate mail uses the postgraduate mailbox. Mixed submissions and mail
 * that is not tied to one track (campus calls, super-admin invites) use the
 * undergraduate mailbox.
 */
export function mailboxForLevels(
  levels: Iterable<EducationLevel | null | undefined>
): EducationLevel {
  const list = [...levels].filter((level): level is EducationLevel => Boolean(level));
  if (list.length > 0 && list.every((level) => level === "POSTGRADUATE")) {
    return "POSTGRADUATE";
  }
  return "UNDERGRADUATE";
}

function mailboxSettings(level: EducationLevel): MailboxSettings {
  if (level === "POSTGRADUATE") {
    const user = requireEnv("MAIL_PG_USERNAME");
    const name = process.env.MAIL_PG_FROM_NAME?.trim();
    return {
      user,
      pass: requireEnv("MAIL_PG_PASSWORD"),
      address: process.env.MAIL_PG_FROM_ADDRESS?.trim() || user,
      name: name || undefined,
    };
  }

  const user = requireEnv("MAIL_USERNAME");
  const name = process.env.MAIL_FROM_NAME?.trim();
  return {
    user,
    pass: requireEnv("MAIL_PASSWORD"),
    address: process.env.MAIL_FROM_ADDRESS?.trim() || user,
    name: name || undefined,
  };
}

const transporters = new Map<EducationLevel, Transporter>();

function getTransporter(level: EducationLevel) {
  const existing = transporters.get(level);
  if (existing) return existing;

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
  const mailbox = mailboxSettings(level);

  const transporter = nodemailer.createTransport({
    host: requireEnv("MAIL_HOST"),
    port,
    secure: encryption === "ssl",
    requireTLS: encryption === "tls",
    auth: {
      user: mailbox.user,
      pass: mailbox.pass,
    },
  });
  transporters.set(level, transporter);
  return transporter;
}

function fromFor(level: EducationLevel) {
  const mailbox = mailboxSettings(level);
  return mailbox.name
    ? { name: mailbox.name, address: mailbox.address }
    : mailbox.address;
}

async function sendMail(message: MailMessage) {
  const level = message.educationLevel ?? "UNDERGRADUATE";
  const { educationLevel: _educationLevel, ...rest } = message;
  await getTransporter(level).sendMail({ from: fromFor(level), ...rest });
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

function judgeCategory(role: UserRole, copy: CompetitionEmailCopy) {
  const level = educationLevelForRole(role);
  if (level === "POSTGRADUATE") return copy.postgraduateStreamName;
  if (level === "UNDERGRADUATE") return copy.undergraduateStreamName;
  return competitionCategoryLabel("UNDERGRADUATE");
}

export async function sendUserInviteEmail(options: {
  to: string;
  role: UserRole;
  /** Shown for competition-scoped roles (everything except super admin). */
  competitionName?: string;
  /** Required for judge invites so dates and theme come from the competition. */
  copy?: CompetitionEmailCopy;
  /** Document names listed in the judge invite review sentence. */
  documentRequirements?: DocumentRequirement[];
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
      documentRequirements: options.documentRequirements,
    });
    return;
  }

  const roleLabel = options.competitionName
    ? `${USER_ROLE_LABELS[options.role]} for ${options.competitionName}`
    : USER_ROLE_LABELS[options.role];

  await sendMail({
    to: options.to,
    educationLevel: educationLevelForRole(options.role) ?? "UNDERGRADUATE",
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
  documentRequirements?: DocumentRequirement[];
}) {
  const { copy } = options;
  const greet = greeting(options.name?.trim() || "Judge");
  const contact = contactSentence();
  const link = uploadLink(options.inviteUrl, "Accept invitation");
  const category = judgeCategory(options.role, copy);
  const details = detailList([
    ["Category", category],
    ["Judging Period", copy.judgingPeriod],
    ["Mode", "Online"],
    ["Closing Ceremony & Result Announcement", copy.closingCeremony],
  ]);
  const opening = `On behalf of the organising committee, we are pleased to invite you to serve as a Judge for the ${themedCompetition(copy)}.`;
  const about = `${copy.name} is a virtual competition that brings together undergraduate and postgraduate participants from UniKL and other local and international institutions. It builds on the Kuala Lumpur Idea & Innovation Competition (KLIIC) and I-CPEX and now includes undergraduate innovation projects and postgraduate research communication through the Five-Minute Thesis (5MT) Competition. Your expertise and industry/academic perspectives would be valuable in evaluating the participants.`;
  const reviewLine = documentReviewPhrase(
    options.documentRequirements ?? []
  );
  const roleText = [
    "Your role as a judge:",
    reviewLine,
    "Evaluate each submission using the official judging and evaluation form, which will be provided online.",
    "Submit your scores and comments by the end of the judging period.",
  ].join("\n");
  const accept =
    "Please open the link below to accept this invitation and create your password. This link expires in 7 days. If you have a conflict of interest with any participant or institution, please let us know so that we can reassign the submission.";
  const close = `We sincerely hope you will accept this invitation and look forward to your support for ${copy.name}.\n\nThank you.`;

  await sendMail({
    to: options.to,
    educationLevel: educationLevelForRole(options.role) ?? "UNDERGRADUATE",
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

export type JudgeEvaluationReminderKind =
  | "started"
  | "due-soon"
  | "both"
  | "unscored";

/** Ask assigned judges to score. Scheduled kinds go to every assigned judge; `unscored` is the leader nudge. */
export async function sendJudgeEvaluationReminderEmail(options: {
  to: string;
  name?: string;
  copy: CompetitionEmailCopy;
  educationLevel: EducationLevel;
  kind: JudgeEvaluationReminderKind;
  /** Absolute URL of the judge's assignment list. */
  assignmentsUrl: string;
  /** Unscored assignments for this judge. Used by the leader reminder. */
  outstandingCount?: number;
}) {
  const { copy } = options;
  const greet = greeting(options.name?.trim() || "Judge");
  const contact = contactSentence();
  const link = uploadLink(options.assignmentsUrl, "Open your assignments");
  const due = copy.judgingPeriod
    ? `The judging period is ${copy.judgingPeriod}.`
    : "Please submit your scores by the published scoring due date.";
  const outstanding = options.outstandingCount ?? 0;
  const outstandingLine =
    outstanding === 1
      ? "You still have 1 assignment without a submitted score."
      : `You still have ${outstanding} assignments without a submitted score.`;

  const opening =
    options.kind === "due-soon"
      ? `This is a reminder that scores for the ${themedCompetition(copy)} are due in 3 days.`
      : options.kind === "unscored"
        ? `This is a reminder to finish scoring your assignments for the ${themedCompetition(copy)}.`
        : options.kind === "both"
          ? `Judging for the ${themedCompetition(copy)} has begun, and scores are due within the next 3 days.`
          : `Judging for the ${themedCompetition(copy)} has begun.`;

  const body = [opening, options.kind === "unscored" ? outstandingLine : "", due]
    .filter(Boolean)
    .join(" ");

  await sendMail({
    to: options.to,
    educationLevel: options.educationLevel,
    subject:
      options.kind === "due-soon" || options.kind === "both"
        ? `Reminder: scores due soon — ${copy.name}`
        : `Reminder: please evaluate your assignments — ${copy.name}`,
    html: joinHtml([
      greet.html,
      INTRO_HTML,
      `<p>${escapeHtml(body)}</p>`,
      link.html,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      signOffHtml(copy),
    ]),
    text: joinText([
      greet.text,
      INTRO_TEXT,
      body,
      link.text,
      contact,
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
  documentRequirements?: DocumentRequirement[];
}) {
  const { copy } = options;
  const greet = greeting(options.participantName);
  const contact = contactSentence();
  const details = detailList([
    ["Registration ID", options.registrationNumber],
    ["Name", options.participantName],
    ["Institution", options.institutionName],
    ["Category", streamNameForLevel(copy, options.educationLevel)],
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
  const levelRequirements = requirementsForLevel(
    options.documentRequirements ?? [],
    options.educationLevel
  );
  const documentDeadlines = copy.paymentDeadline
    ? documentDeadlineLines(levelRequirements, copy.paymentDeadline)
    : [];
  const nextSteps = [
    "Next steps and important dates:",
    ...documentDeadlines,
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
    educationLevel: options.educationLevel,
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
  educationLevel: EducationLevel;
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
    educationLevel: options.educationLevel,
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
  educationLevel: EducationLevel;
  copy: CompetitionEmailCopy;
}) {
  const { copy } = options;
  const greet = greeting(options.participantName);
  const contact = contactSentence();
  const body = `Your registration ${options.submissionNumber} has been reviewed. No payment is due.`;

  await sendMail({
    to: options.to,
    educationLevel: options.educationLevel,
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
  educationLevel: EducationLevel;
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
    educationLevel: options.educationLevel,
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
  educationLevel: EducationLevel;
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
    educationLevel: options.educationLevel,
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

export async function sendCampusInvitationEmail(options: {
  to: string;
  copy: CompetitionEmailCopy;
  /** Absolute registration / landing URL. */
  registerUrl: string;
  /** Registration window shown as "start – end". */
  registrationPeriod: string;
  /** Named competition streams shown under Who can participate. */
  participationStreams: string[];
  /** Track lists keyed by stream heading (undergraduate / postgraduate). */
  trackSections: { heading: string; tracks: string[] }[];
  /** Competition document uploads used for deadline lines. */
  documentRequirements?: DocumentRequirement[];
  poster?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  };
}) {
  const { copy } = options;
  const contact = contactSentence();
  const instructions = paymentInstructions(copy.name);
  const opening = `We are pleased to invite you to participate in the ${themedCompetition(copy)}. The competition will be held online, with the Virtual Grand Finale and Closing Ceremony on ${copy.closingCeremony || "the announced closing date"}.`;
  const about = `${copy.name} builds on KLIIC and i-CPEX. It offers a multidisciplinary platform to showcase projects, exchange research ideas, and engage with academic and industry evaluators. Please find the official poster attached to this email.`;
  const whoText =
    options.participationStreams.length > 0
      ? options.participationStreams.map((line) => `- ${line}`).join("\n")
      : "- See the registration website for eligibility";
  const whoHtml =
    options.participationStreams.length > 0
      ? `<ul>${options.participationStreams
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join("")}</ul>`
      : "<p>See the registration website for eligibility.</p>";
  const trackTextParts =
    options.trackSections.length > 0
      ? options.trackSections.map((section) => {
          const lines =
            section.tracks.length > 0
              ? section.tracks.map((name) => `- ${name}`).join("\n")
              : "- See the registration website for available tracks";
          return `${section.heading}\n${lines}`;
        })
      : ["Tracks\n- See the registration website for available tracks"];
  const trackHtmlParts =
    options.trackSections.length > 0
      ? options.trackSections.map((section) => {
          const list =
            section.tracks.length > 0
              ? `<ul>${section.tracks
                  .map((name) => `<li>${escapeHtml(name)}</li>`)
                  .join("")}</ul>`
              : "<p>See the registration website for available tracks.</p>";
          return `<p><strong>${escapeHtml(section.heading)}</strong></p>${list}`;
        })
      : [
          "<p><strong>Tracks</strong></p><p>See the registration website for available tracks.</p>",
        ];
  const documentDeadlines = copy.paymentDeadline
    ? documentDeadlineLines(
        options.documentRequirements ?? [],
        copy.paymentDeadline
      )
    : [];
  const dates = [
    `Registration & Abstract Submission: ${options.registrationPeriod}`,
    copy.paymentDeadline ? `Payment Deadline: ${copy.paymentDeadline}` : undefined,
    ...documentDeadlines,
    copy.judgingPeriod ? `Judging: ${copy.judgingPeriod}` : undefined,
    copy.closingCeremony
      ? `Closing Ceremony & Result Announcement: ${copy.closingCeremony}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n");
  const why = [
    "Present your innovation or research to a wider audience and receive feedback from academic and industry evaluators",
    "Compete for awards including Best Video, Best Abstract, Best Poster, Best Presenter and Best Paper",
    "Have your abstract published in an ISBN abstract book",
    "Submit an optional full paper for review and possible publication in a special issue of the Journal of Computing Technologies and Creative Content (JTeC), subject to peer review and editorial acceptance",
  ];
  const close =
    "We encourage you to share this invitation with your friends and colleagues and look forward to your participation.";

  // Covers both streams, so it goes out from the undergraduate mailbox.
  await sendMail({
    to: options.to,
    subject: `Call for Participation: ${copy.name} (UniKL Students and Staff)`,
    html: joinHtml([
      "<p>Dear Students and Colleagues,</p>",
      INTRO_HTML,
      `<p>${escapeHtml(opening)}</p>`,
      `<p>${escapeHtml(about)}</p>`,
      `<p>Register here: <a href="${escapeHtml(options.registerUrl)}">${escapeHtml(options.registerUrl)}</a></p>`,
      "<p><strong>Who can participate</strong></p>",
      whoHtml,
      ...trackHtmlParts,
      "<p><strong>Important dates</strong></p>",
      `<p>${escapeHtml(dates).replace(/\n/g, "<br>")}</p>`,
      "<p><strong>Registration fee</strong></p>",
      "<ul><li>UniKL MIIT: RM100.00</li><li>Other UniKL Campuses: RM100.00</li></ul>",
      "<p><strong>Payment</strong></p>",
      instructions.html,
      "<p><strong>Why participate</strong></p>",
      `<ul>${why.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      `<p>${escapeHtml(close)}</p>`,
      signOffHtml(copy),
    ]),
    text: joinText([
      "Dear Students and Colleagues,",
      INTRO_TEXT,
      opening,
      about,
      `Register here: ${options.registerUrl}`,
      `Who can participate\n${whoText}`,
      ...trackTextParts,
      `Important dates\n${dates}`,
      "Registration fee\nUniKL MIIT: RM100.00\nOther UniKL Campuses: RM100.00",
      `Payment\n${instructions.text}`,
      `Why participate\n${why.map((line) => `- ${line}`).join("\n")}`,
      contact,
      close,
      signOffText(copy),
    ]),
    attachments: options.poster
      ? [
          {
            filename: options.poster.filename,
            content: options.poster.content,
            contentType: options.poster.contentType,
          },
        ]
      : undefined,
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
  educationLevel: EducationLevel;
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
    educationLevel: options.educationLevel,
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

export async function sendLivePresentationInviteEmail(options: {
  to: string;
  participantName: string;
  registrationNumber: string;
  trackName: string;
  projectTitle: string;
  presentationOrder: number;
  sessionDate: Date;
  sessionTime: string;
  platform: string;
  meetingUrl: string;
  replyBy: Date;
  joinMinutes: number;
  copy: CompetitionEmailCopy;
}) {
  const { copy } = options;
  const greet = greeting(options.participantName);
  const contact = contactSentence();
  const secretariatEmail = optionalEnv("SECRETARIAT_EMAIL");
  const sessionDate = formatEmailDate(options.sessionDate);
  const sessionTime = formatEmailTime(options.sessionTime);
  const replyBy = formatEmailDate(options.replyBy);
  const opening = `Congratulations! We are pleased to invite you to present live at the Five-Minute Thesis (5MT) Competition as part of the ${themedCompetition(copy)}.`;
  const details = detailList([
    ["Registration ID", options.registrationNumber],
    ["Level", "Postgraduate"],
    ["Track", options.trackName],
    ["Research Title", options.projectTitle],
  ]);
  const session = detailList([
    ["Date", sessionDate],
    ["Time", sessionTime ? `${sessionTime} (Malaysia Time, GMT+8)` : ""],
    ["Platform", options.platform],
    ["Meeting Link", options.meetingUrl],
    ["Presentation order", String(options.presentationOrder)],
  ]);
  const guidelines = [
    "Your presentation must not exceed five (5) minutes.",
    "Use only the single slide you have submitted; no additional slides, videos or props are allowed.",
    "Explain your research and its significance in a way that a non-specialist audience can understand.",
    "Master's and PhD participants will be assessed separately.",
  ];
  const joinMinutes = options.joinMinutes;
  const technical = [
    `Please join the session at least ${joinMinutes} minute${joinMinutes === 1 ? "" : "s"} before your slot to allow for a technical check.`,
    "Use a stable internet connection, a working camera, and a usable microphone in a quiet location.",
    `Please rename your display name to: ${options.registrationNumber} – ${options.participantName.trim() || "Participant"}.`,
  ];
  const confirm = secretariatEmail
    ? `Please confirm your attendance by replying to this email before ${replyBy}. If you are unable to attend the live session, please inform us as soon as possible at ${secretariatEmail}.`
    : `Please confirm your attendance by replying to this email before ${replyBy}. If you are unable to attend the live session, please inform the secretariat as soon as possible.`;
  const results = copy.closingCeremony
    ? `The results will be announced at the Closing Ceremony on ${copy.closingCeremony}.`
    : "The results will be announced at the Closing Ceremony.";
  const close =
    "We look forward to your research presentation and wish you the best of luck.";
  const meetingLink = {
    text: options.meetingUrl,
    html: `<p><a href="${escapeHtml(options.meetingUrl)}">Join the live session</a></p>`,
  };
  const guidelinesText = guidelines.map((line) => `- ${line}`).join("\n");
  const technicalText = technical.map((line) => `- ${line}`).join("\n");
  const guidelinesHtml = `<ul>${guidelines
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("")}</ul>`;
  const technicalHtml = `<ul>${technical
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("")}</ul>`;

  await sendMail({
    to: options.to,
    educationLevel: "POSTGRADUATE",
    subject: `Invitation: ${copy.name} 5MT Live Presentation (Postgraduate)`,
    html: joinHtml([
      greet.html,
      INTRO_HTML,
      `<p>${escapeHtml(opening)}</p>`,
      "<p>Your presentation details:</p>",
      details.html,
      "<p>Live session details:</p>",
      session.html,
      meetingLink.html,
      "<p><strong>Presentation guidelines</strong></p>",
      guidelinesHtml,
      "<p><strong>Technical requirements</strong></p>",
      technicalHtml,
      `<p>${escapeHtml(confirm)}</p>`,
      `<p>${escapeHtml(results)}</p>`,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      `<p>${escapeHtml(close)}</p>`,
      signOffHtml(copy),
    ]),
    text: joinText([
      greet.text,
      INTRO_TEXT,
      opening,
      `Your presentation details:\n${details.text}`,
      `Live session details:\n${session.text}`,
      meetingLink.text,
      `Presentation guidelines\n${guidelinesText}`,
      `Technical requirements\n${technicalText}`,
      confirm,
      results,
      contact,
      close,
      signOffText(copy),
    ]),
  });
}

function bulletList(lines: string[]) {
  return {
    text: lines.map((line) => `- ${line}`).join("\n"),
    html: `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
  };
}

function ceremonyMinutePhrase(joinMinutes: number) {
  return `${joinMinutes} minute${joinMinutes === 1 ? "" : "s"}`;
}

/** Shared date, time, mode, and place block for both closing-ceremony letters. */
function closingCeremonyEvent(options: {
  date: Date;
  time: string;
  mode: ClosingCeremonyMode;
  platform?: string;
  meetingUrl?: string;
  venue?: string;
}) {
  const sessionTime = formatEmailTime(options.time);
  const rows: Array<[string, string]> = [
    ["Date", formatEmailDate(options.date)],
    ["Time", sessionTime ? `${sessionTime} (Malaysia Time, GMT+8)` : ""],
    ["Mode", CLOSING_CEREMONY_MODE_LABELS[options.mode]],
  ];
  if (options.mode === "ONLINE") {
    rows.push(
      ["Platform", options.platform ?? ""],
      ["Meeting Link", options.meetingUrl ?? ""]
    );
  } else {
    rows.push(["Venue", options.venue ?? ""]);
  }
  const details = detailList(rows);
  const meetingUrl = options.mode === "ONLINE" ? options.meetingUrl?.trim() : "";
  const meeting = meetingUrl
    ? {
        text: meetingUrl,
        html: `<p><a href="${escapeHtml(meetingUrl)}">Join the closing ceremony</a></p>`,
      }
    : { text: "", html: "" };
  return { details, meeting };
}

export async function sendClosingCeremonyParticipantEmail(options: {
  to: string;
  participantName: string;
  registrationNumber: string;
  educationLevel: EducationLevel;
  date: Date;
  time: string;
  mode: ClosingCeremonyMode;
  platform?: string;
  meetingUrl?: string;
  venue?: string;
  replyBy: Date;
  joinMinutes: number;
  attendanceUrl: string;
  copy: CompetitionEmailCopy;
}) {
  const { copy } = options;
  const greet = greeting(options.participantName);
  const contact = contactSentence();
  const replyBy = formatEmailDate(options.replyBy);
  const opening = `Thank you for taking part in the ${themedCompetition(copy)}. We are pleased to invite you to the Closing Ceremony and Results Announcement.`;
  const event = closingCeremonyEvent(options);
  const highlights = bulletList([
    "Opening remarks",
    "Announcement of winners for the competition awards",
    "Recognition of participating institutions and Co-Organisers",
    "Closing remarks",
  ]);
  const awards =
    "The winners of Best Video, Best Abstract, Best Poster (Single Slide), Best Presenter, and Best Paper will be announced during the ceremony. Digital certificates will be issued to participants by email after the ceremony.";
  const early =
    options.mode === "PHYSICAL"
      ? `Arrive at least ${ceremonyMinutePhrase(options.joinMinutes)} before the start time.`
      : `Join the session at least ${ceremonyMinutePhrase(options.joinMinutes)} before the start time.`;
  const displayName = `Rename your display name to: ${options.registrationNumber} – ${options.participantName.trim() || "Participant"}.`;
  const attendText = `Register your attendance at ${options.attendanceUrl} by ${replyBy}.`;
  const attendHtml = `<li>Register your attendance at <a href="${escapeHtml(options.attendanceUrl)}">${escapeHtml(options.attendanceUrl)}</a> by ${escapeHtml(replyBy)}.</li>`;
  const joinHeading = options.mode === "PHYSICAL" ? "To attend, please:" : "To join, please:";
  const stepsText = [attendText, early, displayName].map((line) => `- ${line}`).join("\n");
  const stepsHtml = `<ul>${attendHtml}<li>${escapeHtml(early)}</li><li>${escapeHtml(displayName)}</li></ul>`;
  const close =
    "We hope to see you at the ceremony and look forward to celebrating your efforts and achievements.";

  await sendMail({
    to: options.to,
    educationLevel: options.educationLevel,
    subject: `Invitation: ${copy.name} Closing Ceremony and Result Announcement`,
    html: joinHtml([
      greet.html,
      INTRO_HTML,
      `<p>${escapeHtml(opening)}</p>`,
      "<p>Event details:</p>",
      event.details.html,
      event.meeting.html,
      "<p><strong>Programme highlights</strong></p>",
      highlights.html,
      `<p>${escapeHtml(awards)}</p>`,
      `<p>${escapeHtml(joinHeading)}</p>`,
      stepsHtml,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      `<p>${escapeHtml(close)}</p>`,
      signOffHtml(copy),
    ]),
    text: joinText([
      greet.text,
      INTRO_TEXT,
      opening,
      `Event details:\n${event.details.text}`,
      event.meeting.text,
      `Programme highlights\n${highlights.text}`,
      awards,
      `${joinHeading}\n${stepsText}`,
      contact,
      close,
      signOffText(copy),
    ]),
  });
}

export async function sendClosingCeremonyJudgeEmail(options: {
  to: string;
  judgeName: string;
  educationLevel: EducationLevel;
  date: Date;
  time: string;
  mode: ClosingCeremonyMode;
  platform?: string;
  meetingUrl?: string;
  venue?: string;
  replyBy: Date;
  copy: CompetitionEmailCopy;
}) {
  const { copy } = options;
  const greet = greeting(options.judgeName);
  const contact = contactSentence();
  const replyBy = formatEmailDate(options.replyBy);
  const opening = `Thank you for your valuable contribution as a Judge for the ${themedCompetition(copy)}. On behalf of the organising committee, we are pleased to invite you to the Closing Ceremony and Result Announcement.`;
  const event = closingCeremonyEvent(options);
  const highlights = bulletList([
    "Opening remarks",
    "Announcement of winners for the competition awards",
    "Recognition of judges and participating institutions",
    "Closing remarks",
  ]);
  const confirm = `Please confirm your attendance by ${replyBy} by replying to this email. A digital certificate of appreciation will be issued to judges by email after the ceremony.`;
  const close =
    "We sincerely appreciate your support and hope you can join us to celebrate the participants' achievements.";

  await sendMail({
    to: options.to,
    educationLevel: options.educationLevel,
    subject: `Invitation: ${copy.name} Closing Ceremony and Result Announcement (Judges)`,
    html: joinHtml([
      greet.html,
      INTRO_HTML,
      `<p>${escapeHtml(opening)}</p>`,
      "<p>Event details:</p>",
      event.details.html,
      event.meeting.html,
      "<p><strong>Programme highlights</strong></p>",
      highlights.html,
      `<p>${escapeHtml(confirm)}</p>`,
      contact ? `<p>${escapeHtml(contact)}</p>` : "",
      `<p>${escapeHtml(close)}</p>`,
      signOffHtml(copy),
    ]),
    text: joinText([
      greet.text,
      INTRO_TEXT,
      opening,
      `Event details:\n${event.details.text}`,
      event.meeting.text,
      `Programme highlights\n${highlights.text}`,
      confirm,
      contact,
      close,
      signOffText(copy),
    ]),
  });
}
