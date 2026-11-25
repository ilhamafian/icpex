"use server";

import { MongoServerError } from "mongodb";
import { redirect } from "next/navigation";

import { getAppOrigin } from "@/lib/appOrigin";
import {
  sendParticipantPasswordResetEmail,
  sendParticipantVerificationEmail,
} from "@/lib/email";
import { safeParticipantNext } from "@/lib/participantNext";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  createParticipantSession,
  deleteParticipantSession,
  getParticipantSession,
} from "@/lib/participantSession";
import {
  createPasswordResetToken,
  createVerificationToken,
  hashParticipantToken,
} from "@/lib/participantToken";
import { ParticipantModel } from "@/models/Participant";
import { toIdString } from "@/schemas/objectId";
import {
  participantEmailSchema,
  participantLoginSchema,
  participantResetSchema,
  participantSchema,
  participantSignupSchema,
} from "@/schemas/participantSchema";
import { resetPasswordSchema } from "@/schemas/auth";

export type ParticipantSignupState = {
  error?: string;
  success?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    confirm_password?: string[];
  };
};

export type ParticipantLoginState = {
  error?: string;
  unverifiedEmail?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

export type ParticipantMessageState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

async function verificationUrl(token: string) {
  const origin = await getAppOrigin();
  return `${origin}/verify-email?token=${encodeURIComponent(token)}`;
}

async function issueVerification(participant: {
  id: string;
  email: string;
  name: string;
}) {
  const issued = createVerificationToken();
  await new ParticipantModel().setVerificationToken(participant.id, {
    verification_token_hash: issued.tokenHash,
    verification_expires_at: issued.expiresAt,
  });
  await sendParticipantVerificationEmail({
    to: participant.email,
    name: participant.name,
    verifyUrl: await verificationUrl(issued.token),
  });
}

export async function participantSignup(
  _prev: ParticipantSignupState,
  formData: FormData
): Promise<ParticipantSignupState> {
  const parsed = participantSignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const email = parsed.data.email.toLowerCase();
  const model = new ParticipantModel();
  const existing = await model.findByEmail(email);

  try {
    if (existing?.email_verified) {
      return { error: "An account with this email already exists. Sign in instead." };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const participant = existing
      ? existing
      : await model.create(
          participantSchema.parse({
            name: parsed.data.name,
            email,
            password_hash: passwordHash,
            email_verified: false,
          })
        );

    if (existing) {
      await model.setPassword(toIdString(existing._id), passwordHash);
      await model.updateName(toIdString(existing._id), parsed.data.name);
    }

    await issueVerification({
      id: toIdString(participant._id),
      email,
      name: parsed.data.name,
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return { error: "An account with this email already exists. Sign in instead." };
    }
    console.error("Participant signup failed:", error);
    return {
      error: "We could not send the verification email. Check the address and try again.",
    };
  }

  return {
    success: "Check your email for a verification link. You can sign in after verifying.",
  };
}

export async function participantLogin(
  _prev: ParticipantLoginState,
  formData: FormData
): Promise<ParticipantLoginState> {
  const parsed = participantLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const email = parsed.data.email.toLowerCase();
  const participant = await new ParticipantModel().findByEmail(email);
  if (!participant) {
    return { error: "Invalid email or password." };
  }

  const passwordOk = await verifyPassword(parsed.data.password, participant.password_hash);
  if (!passwordOk) {
    return { error: "Invalid email or password." };
  }

  if (!participant.email_verified) {
    return {
      error: "Verify your email before signing in.",
      unverifiedEmail: email,
    };
  }

  await createParticipantSession(toIdString(participant._id));
  redirect(safeParticipantNext(parsed.data.next));
}

export async function resendParticipantVerification(
  _prev: ParticipantMessageState,
  formData: FormData
): Promise<ParticipantMessageState> {
  const parsed = participantEmailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Enter the email you used to register." };
  }

  const participant = await new ParticipantModel().findByEmail(
    parsed.data.email.toLowerCase()
  );
  if (!participant || participant.email_verified) {
    return { success: "If the account still needs verification, we sent another email." };
  }

  try {
    await issueVerification({
      id: toIdString(participant._id),
      email: participant.email,
      name: participant.name,
    });
  } catch (error) {
    console.error("Verification resend failed:", error);
    return { error: "The verification email could not be sent. Try again shortly." };
  }

  return { success: "Verification email sent." };
}

export async function requestParticipantPasswordReset(
  _prev: ParticipantMessageState,
  formData: FormData
): Promise<ParticipantMessageState> {
  const parsed = participantEmailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const success = {
    success: "If an account exists for that email, we sent a reset link.",
  };
  const participant = await new ParticipantModel().findByEmail(
    parsed.data.email.toLowerCase()
  );
  if (!participant || !participant.email_verified) return success;

  try {
    const issued = createPasswordResetToken();
    await new ParticipantModel().setResetToken(toIdString(participant._id), {
      reset_token_hash: issued.tokenHash,
      reset_expires_at: issued.expiresAt,
    });
    const origin = await getAppOrigin();
    await sendParticipantPasswordResetEmail({
      to: participant.email,
      name: participant.name,
      resetUrl: `${origin}/reset-password?token=${encodeURIComponent(issued.token)}`,
    });
  } catch (error) {
    console.error("Password reset email failed:", error);
    return { error: "The reset email could not be sent. Try again shortly." };
  }

  return success;
}

export async function resetParticipantPassword(
  _prev: ParticipantMessageState,
  formData: FormData
): Promise<ParticipantMessageState> {
  const parsed = participantResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const participant = await new ParticipantModel().findByResetTokenHash(
    hashParticipantToken(parsed.data.token)
  );
  if (
    !participant ||
    !participant.reset_expires_at ||
    participant.reset_expires_at.getTime() < Date.now()
  ) {
    return { error: "This reset link is invalid or has expired." };
  }

  await new ParticipantModel().setPassword(
    toIdString(participant._id),
    await hashPassword(parsed.data.password)
  );
  redirect("/login?reset=1");
}

export async function verifyParticipantEmail(token: string): Promise<boolean> {
  if (!token) return false;
  const participant = await new ParticipantModel().findByVerificationTokenHash(
    hashParticipantToken(token)
  );
  if (
    !participant ||
    !participant.verification_expires_at ||
    participant.verification_expires_at.getTime() < Date.now()
  ) {
    return false;
  }
  await new ParticipantModel().markEmailVerified(toIdString(participant._id));
  return true;
}

export async function participantLogout() {
  await deleteParticipantSession();
  redirect("/login");
}

export async function changeParticipantPassword(
  _prev: ParticipantMessageState,
  formData: FormData
): Promise<ParticipantMessageState> {
  const session = await getParticipantSession();
  if (!session) redirect("/login");

  const parsed = resetPasswordSchema.safeParse({
    current_password: formData.get("current_password"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const passwordOk = await verifyPassword(
    parsed.data.current_password,
    session.password_hash
  );
  if (!passwordOk) {
    return { error: "Current password is incorrect." };
  }

  await new ParticipantModel().setPassword(
    toIdString(session._id),
    await hashPassword(parsed.data.password)
  );
  return { success: "Password updated." };
}
