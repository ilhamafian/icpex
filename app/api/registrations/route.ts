import { PaymentModel } from "@/models/Payment";
import { RegistrationModel } from "@/models/Registration";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { requireSecretarySession } from "@/utils/portalAuth";
import { serializePayment } from "@/utils/serializePayment";
import {
  serializeRegistration,
  submissionNumbersFor,
} from "@/utils/serializeRegistration";

/** Secretary: list registrations with their payment (if any). */
export async function GET() {
  try {
    const session = await requireSecretarySession();
    if (!session) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

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

    const submissionNumbers = await submissionNumbersFor(registrations);

    return createResponse({
      registrations: registrations.map((registration) => {
        const id = toIdString(registration._id);
        return {
          registration: serializeRegistration(registration, submissionNumbers),
          payment: paymentByRegistrationId.get(id) ?? null,
        };
      }),
    });
  } catch (error) {
    return handleError(error);
  }
}