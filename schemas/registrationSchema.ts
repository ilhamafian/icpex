import { z } from "zod";
import { objectIdSchema } from "./objectId";

export const registrationSchema = z.object({
  _id: objectIdSchema.optional(),
  registration_number: z.string(),
  competition_id: objectIdSchema,
  category_id: objectIdSchema,
  participant: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    education_level: z.enum(["DIPLOMA", "UNDERGRADUATE", "GRADUATE", "PHD"]),
    institution: z.object({
      name: z.string().min(1),
      country: z.string().min(1),
    }),
    government_id: z.object({
      type: z.enum(["PASSPORT", "NATIONAL_ID", "DRIVING_LICENSE"]),
      number: z.string().min(1),
    }),
  }),
  project: z.object({
    title: z.string().min(1),
    abstract: z.string().min(1),
  }),
  team: z.object({
    lead: z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }),
    members: z.array(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })
    ),
  }),
  supervisors: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
    })
  ),
  documents: z.array(
    z.object({
      type: z.enum([
        "PROJECT_REPORT",
        "PROJECT_PRESENTATION",
        "PROJECT_DEMO",
        "PROJECT_VIDEO",
        "PROJECT_PHOTO",
        "PROJECT_OTHER",
      ]),
      file_name: z.string().min(1),
      file_url: z.string().min(1),
    })
  ),
  status: z.enum([
    "SUBMITTED",
    "REVIEWING",
    "REJECTED",
    "ACCEPTED",
    "COMPLETED",
  ]),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Registration = z.infer<typeof registrationSchema>;

export const createRegistrationSchema = registrationSchema.omit({
  _id: true,
  created_at: true,
  updated_at: true,
});

export type CreateRegistration = z.infer<typeof createRegistrationSchema>;

/** Public competition registration form (system fields set on submit). */
export const registrationFormSchema = createRegistrationSchema.omit({
  registration_number: true,
  status: true,
});

export type RegistrationForm = z.infer<typeof registrationFormSchema>;
