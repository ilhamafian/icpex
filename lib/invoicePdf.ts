import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formatMoney, type Currency } from "@/utils/registrationFee";

export type InvoiceInput = {
  invoiceNumber: string;
  submissionNumber: string;
  issuedAt: Date;
  institution: { name: string; country: string };
  participants: string[];
  currency: Currency;
  items: { registrationNumber: string; title: string; amount: number }[];
  total: number;
  overpaid?: { amount: number; currency: Currency };
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const MUTED = rgb(0.4, 0.4, 0.4);

/** Standard PDF fonts only encode Latin-1 (WinAnsi); swap anything else for "?". */
function toWinAnsi(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = toWinAnsi(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function createInvoicePdf(invoice: InvoiceInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${invoice.invoiceNumber}`);
  pdf.setAuthor("ICPEX");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function text(
    target: PDFPage,
    value: string,
    x: number,
    size: number,
    font: PDFFont = regular,
    color = rgb(0, 0, 0)
  ) {
    target.drawText(toWinAnsi(value), { x, y, size, font, color });
  }

  function rightText(value: string, rightEdge: number, size: number, font: PDFFont = regular) {
    const safe = toWinAnsi(value);
    page.drawText(safe, {
      x: rightEdge - font.widthOfTextAtSize(safe, size),
      y,
      size,
      font,
    });
  }

  function ensureSpace(height: number) {
    if (y - height > MARGIN) return;
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  const right = PAGE_WIDTH - MARGIN;

  text(page, "ICPEX", MARGIN, 20, bold);
  rightText("INVOICE", right, 20, bold);
  y -= 22;
  text(page, "Competition secretariat", MARGIN, 10, regular, MUTED);
  rightText(invoice.invoiceNumber, right, 10);
  y -= 14;
  rightText(`Issued ${formatDate(invoice.issuedAt)}`, right, 10);
  y -= 14;
  rightText(`Reference ${invoice.submissionNumber}`, right, 10);
  y -= 36;

  text(page, "Billed to", MARGIN, 10, bold);
  y -= 16;
  for (const line of wrap(invoice.institution.name, regular, 11, 300)) {
    text(page, line, MARGIN, 11);
    y -= 14;
  }
  text(page, invoice.institution.country, MARGIN, 10, regular, MUTED);
  y -= 14;
  for (const participant of invoice.participants) {
    for (const line of wrap(participant, regular, 10, 300)) {
      text(page, line, MARGIN, 10, regular, MUTED);
      y -= 13;
    }
  }
  y -= 24;

  const amountColumn = right;
  const titleX = MARGIN + 110;
  const titleWidth = amountColumn - 110 - titleX;

  text(page, "Registration", MARGIN, 10, bold);
  text(page, "Project", titleX, 10, bold);
  rightText("Amount", amountColumn, 10, bold);
  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: right, y },
    thickness: 0.5,
    color: MUTED,
  });
  y -= 16;

  for (const item of invoice.items) {
    const lines = wrap(item.title, regular, 10, titleWidth);
    ensureSpace(lines.length * 13 + 10);
    text(page, item.registrationNumber, MARGIN, 10);
    rightText(
      item.amount === 0 ? "Free" : formatMoney(item.amount, invoice.currency),
      amountColumn,
      10
    );
    for (const line of lines) {
      text(page, line, titleX, 10);
      y -= 13;
    }
    y -= 6;
  }

  ensureSpace(80);
  page.drawLine({
    start: { x: MARGIN, y: y + 4 },
    end: { x: right, y: y + 4 },
    thickness: 0.5,
    color: MUTED,
  });
  y -= 14;
  text(page, "Total", titleX, 11, bold);
  rightText(formatMoney(invoice.total, invoice.currency), amountColumn, 11, bold);
  y -= 16;
  text(page, "Amount paid", titleX, 10);
  rightText(formatMoney(invoice.total, invoice.currency), amountColumn, 10);
  y -= 14;
  text(page, "Balance due", titleX, 10);
  rightText(formatMoney(0, invoice.currency), amountColumn, 10);
  y -= 30;

  text(page, "PAID", MARGIN, 14, bold, rgb(0.1, 0.5, 0.2));
  y -= 18;
  text(page, "Paid by bank transfer. Thank you.", MARGIN, 10, regular, MUTED);
  if (invoice.overpaid) {
    y -= 14;
    text(
      page,
      `Overpayment of ${formatMoney(invoice.overpaid.amount, invoice.overpaid.currency)} will be refunded separately.`,
      MARGIN,
      10,
      regular,
      MUTED
    );
  }

  return Buffer.from(await pdf.save());
}
