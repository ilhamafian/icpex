import Link from "next/link";

import { PaymentReceiptForm } from "@/components/PaymentReceiptForm";
import { mutedTextClassName } from "@/components/registrationFormUi";
import { formatMoney } from "@/utils/registrationFee";
import { loadPaymentLink } from "@/utils/paymentLink";

type PayPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PayPage({ params }: PayPageProps) {
  const { token } = await params;
  const payment = await loadPaymentLink(token);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex w-full items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
        >
          ← Home
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          {payment ? <PaymentDetails token={token} payment={payment} /> : <Unavailable />}
        </div>
      </main>
    </div>
  );
}

function Unavailable() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Payment link unavailable</h1>
      <p className={`mt-2 ${mutedTextClassName}`}>
        This link is invalid. Use the payment link from the latest email, or
        contact the secretariat.
      </p>
    </>
  );
}

function PaymentDetails({
  token,
  payment,
}: {
  token: string;
  payment: NonNullable<Awaited<ReturnType<typeof loadPaymentLink>>>;
}) {
  const total = formatMoney(payment.total, payment.currency);
  const balance = payment.balance
    ? formatMoney(payment.balance.amount, payment.balance.currency)
    : null;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Payment for {payment.submissionNumber}
      </h1>
      <p className={`mt-2 ${mutedTextClassName}`}>
        {balance
          ? `${payment.institutionName}. Your earlier transfer was short. Transfer the remaining ${balance} and upload the new receipt.`
          : `${payment.institutionName}. Transfer ${total} and upload the receipt.`}
      </p>

      <ul className="mt-8 flex flex-col gap-3 border-t border-black/10 pt-6 dark:border-white/10">
        {payment.projects.map((project) => (
          <li key={project.registrationNumber} className="flex items-start justify-between gap-4 text-sm">
            <span>
              <span className="font-medium">{project.title}</span>
              <span className={`block ${mutedTextClassName}`}>
                {project.registrationNumber}
              </span>
            </span>
            <span className="shrink-0 tabular-nums">
              {project.amount === 0
                ? "Free"
                : formatMoney(project.amount, payment.currency)}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between border-t border-black/10 pt-3 text-sm font-medium dark:border-white/10">
          <span>Total</span>
          <span className="tabular-nums">{total}</span>
        </li>
        {balance ? (
          <li className="flex items-center justify-between text-sm font-medium text-red-600 dark:text-red-400">
            <span>Balance due</span>
            <span className="tabular-nums">{balance}</span>
          </li>
        ) : null}
      </ul>

      <PaymentAction token={token} payment={payment} />
    </>
  );
}

function PaymentAction({
  token,
  payment,
}: {
  token: string;
  payment: NonNullable<Awaited<ReturnType<typeof loadPaymentLink>>>;
}) {
  if (payment.status === "PAID") {
    return (
      <p className={`mt-8 ${mutedTextClassName}`}>
        This payment has been received. Nothing further is due.
      </p>
    );
  }

  if (payment.status === "FAILED") {
    return (
      <p className={`mt-8 ${mutedTextClassName}`}>
        This payment was not accepted. Contact the secretariat before
        transferring again.
      </p>
    );
  }

  if (payment.status === "REVIEW") {
    return (
      <p className={`mt-8 ${mutedTextClassName}`}>
        This payment link is not active yet.
      </p>
    );
  }

  if (!payment.bank) {
    return (
      <p className="mt-8 text-sm text-red-600 dark:text-red-400">
        Bank transfer details are not configured yet. Contact the secretariat
        before paying.
      </p>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-6 border-t border-black/10 pt-6 dark:border-white/10">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Bank transfer</h2>
        <dl className={`mt-3 grid gap-2 ${mutedTextClassName}`}>
          <div className="flex justify-between gap-4">
            <dt>Bank</dt>
            <dd className="text-right text-foreground">{payment.bank.bankName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Account name</dt>
            <dd className="text-right text-foreground">{payment.bank.accountName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Account number</dt>
            <dd className="text-right text-foreground">{payment.bank.accountNumber}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Reference</dt>
            <dd className="text-right text-foreground">{payment.submissionNumber}</dd>
          </div>
        </dl>
      </div>
      {payment.status === "PENDING" ? (
        <p className={mutedTextClassName}>
          A receipt is already on file. You can replace it until the
          secretariat confirms the transfer.
        </p>
      ) : null}
      <PaymentReceiptForm token={token} replacing={payment.status === "PENDING"} />
    </div>
  );
}
