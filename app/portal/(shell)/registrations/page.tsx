import { PaymentVerificationManager } from "@/components/PaymentVerificationManager";
import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { toIdString } from "@/schemas/objectId";
import { requirePortalSection } from "@/utils/requirePortalAccess";
import { serializePayment } from "@/utils/serializePayment";
import { serializeRegistration } from "@/utils/serializeRegistration";

async function loadRows() {
  try {
    const [registrations, payments] = await Promise.all([
      new RegistrationModel().find({}, { sort: { created_at: -1 } }),
      new PaymentModel().find({}, { sort: { created_at: -1 } }),
    ]);

    const paymentByRegistrationId = new Map(
      payments.map((payment) => [
        toIdString(payment.registration_id),
        serializePayment(payment),
      ])
    );

    return registrations.map((registration) => {
      const id = toIdString(registration._id);
      return {
        registration: serializeRegistration(registration),
        payment: paymentByRegistrationId.get(id) ?? null,
      };
    });
  } catch {
    return [];
  }
}

export default async function RegistrationsPage() {
  await requirePortalSection("registrations");
  const rows = await loadRows();

  return <PaymentVerificationManager initialRows={rows} />;
}
