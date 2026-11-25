import Link from "next/link";

import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import { toIdString } from "@/schemas/objectId";
import type { PaymentStatus } from "@/schemas/paymentSchema";
import { getParticipantSession } from "@/lib/participantSession";
import { formatMoney } from "@/utils/registrationFee";
import { PAYMENT_STATUS_LABELS } from "@/utils/paymentStatusLabel";

export default async function MySubmissionsPage() {
  const session = await getParticipantSession();
  const participantId = session ? toIdString(session._id) : "";
  const submissions = participantId
    ? await new SubmissionModel().find(
        { participant_id: participantId },
        { sort: { created_at: -1 } }
      )
    : [];
  const ids = submissions.map((submission) => toIdString(submission._id));
  const [registrations, payments] = await Promise.all([
    ids.length
      ? new RegistrationModel().find({ submission_id: { $in: ids } })
      : Promise.resolve([]),
    ids.length
      ? new PaymentModel().find({ submission_id: { $in: ids } })
      : Promise.resolve([]),
  ]);

  const registrationBySubmission = new Map(
    registrations.map((registration) => [toIdString(registration.submission_id), registration])
  );
  const paymentBySubmission = new Map(
    payments.map((payment) => [toIdString(payment.submission_id), payment])
  );

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">My submissions</h2>
          <p className="mt-1 text-sm text-[#5c6e82]">
            View each entry, its payment status, and edit it until it is paid.
          </p>
        </div>
        <Link
          href="/my/register"
          className="inline-flex h-10 items-center rounded-full bg-[#d6a11e] px-4 text-sm font-bold text-[#1a1408]"
        >
          New registration
        </Link>
      </div>

      {submissions.length === 0 ? (
        <p className="rounded-2xl border border-[#d5e1ec] bg-white px-5 py-8 text-sm text-[#5c6e82]">
          You have not submitted an entry yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {submissions.map((submission) => {
            const id = toIdString(submission._id);
            const registration = registrationBySubmission.get(id);
            const payment = paymentBySubmission.get(id);
            const status: PaymentStatus = payment?.status ?? "REVIEW";
            const paid = Boolean(submission.paid_at) || status === "PAID";
            const currency = payment?.currency ?? submission.currency ?? "MYR";
            const amount = payment?.amount ?? submission.amount;

            return (
              <li key={id} className="rounded-2xl border border-[#d5e1ec] bg-white px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.14em] text-[#8a6410] uppercase">
                      {submission.submission_number}
                    </p>
                    <p className="mt-1 font-semibold">
                      {registration?.project.title ?? "Project"}
                    </p>
                    <p className="mt-1 text-sm text-[#5c6e82]">
                      {submission.institution.name}
                      {registration ? ` · ${registration.registration_number}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{PAYMENT_STATUS_LABELS[status]}</p>
                    <p className="mt-1 text-sm text-[#5c6e82]">
                      {formatMoney(amount, currency)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                  <Link href={`/my/submissions/${id}`} className="text-[#8a6410] hover:underline">
                    {paid ? "View submission" : "View and edit"}
                  </Link>
                  {!paid && submission.payment_token ? (
                    <Link
                      href={`/pay/${encodeURIComponent(submission.payment_token)}`}
                      className="text-[#10243c] hover:underline"
                    >
                      Payment page
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
