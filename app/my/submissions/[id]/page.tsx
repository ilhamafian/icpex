import Link from "next/link";
import { notFound } from "next/navigation";

import { RegistrationForm } from "@/components/RegistrationForm";
import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { SubmissionModel } from "@/models/Submission";
import { toIdString } from "@/schemas/objectId";
import type { PaymentStatus } from "@/schemas/paymentSchema";
import { getParticipantSession } from "@/lib/participantSession";
import { formatMoney } from "@/utils/registrationFee";
import { loadRegistrationFormOptions } from "@/utils/loadRegistrationFormOptions";
import { PAYMENT_STATUS_LABELS } from "@/utils/paymentStatusLabel";
import { registrationToProjectState } from "@/utils/registrationToProjectState";

export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session, options] = await Promise.all([
    params,
    getParticipantSession(),
    loadRegistrationFormOptions(),
  ]);
  if (!session) notFound();

  const submission = await new SubmissionModel().findById(id);
  if (!submission || toIdString(submission.participant_id) !== toIdString(session._id)) {
    notFound();
  }

  const submissionId = toIdString(submission._id);
  const [registrations, payments] = await Promise.all([
    new RegistrationModel().find({ submission_id: submissionId }),
    new PaymentModel().find({ submission_id: submissionId }),
  ]);
  const registration = registrations[0];
  if (!registration) notFound();

  const payment = payments[0];
  const status: PaymentStatus = payment?.status ?? "REVIEW";
  const paid = Boolean(submission.paid_at) || status === "PAID";
  const currency = payment?.currency ?? submission.currency ?? "MYR";
  const amount = payment?.amount ?? submission.amount;

  return (
    <div className="px-4 lg:px-6">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#8a6410] uppercase">
        {submission.submission_number}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight">
        {registration.project.title}
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#5c6e82]">
        <p>
          Payment status:{" "}
          <span className="font-semibold text-[#10243c]">{PAYMENT_STATUS_LABELS[status]}</span>
        </p>
        <p>{formatMoney(amount, currency)}</p>
        {!paid && submission.payment_token ? (
          <Link
            href={`/pay/${encodeURIComponent(submission.payment_token)}`}
            className="font-semibold text-[#8a6410] hover:underline"
          >
            Open payment page
          </Link>
        ) : null}
      </div>
      <div className="mt-8">
        <RegistrationForm
          mode="edit"
          submissionId={submissionId}
          readOnly={paid}
          competitionId={toIdString(submission.competition_id)}
          educationLevels={options.educationLevels}
          documentRequirements={options.documentRequirements}
          categories={options.categories}
          initialInstitution={submission.institution}
          initialProject={registrationToProjectState(
            registration,
            options.documentRequirements
          )}
        />
      </div>
    </div>
  );
}
