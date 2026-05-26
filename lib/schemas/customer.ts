import { z } from "zod";
import { CustomerStatus, KycStatus } from "@/lib/enums";

export const customerSchema = z.object({
  externalId: z.string().optional(),
  firstName: z.string().min(1, "Prénom requis").max(120),
  lastName: z.string().min(1, "Nom requis").max(120),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format AAAA-MM-JJ"),
  nationalId: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  status: z.nativeEnum(CustomerStatus).optional(),
  kycStatus: z.nativeEnum(KycStatus).optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
