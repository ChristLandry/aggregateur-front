import { z } from "zod";
import { PartnerStatus } from "@/lib/enums";

export const partnerSchema = z.object({
  code: z.string().min(2, "Code requis (min 2 caractères)").max(50),
  name: z.string().min(2, "Nom requis").max(150),
  baseUrl: z.union([z.string().url("URL de base invalide"), z.literal("")]).optional(),
  status: z.nativeEnum(PartnerStatus).optional(),
  accountCode: z.string().optional(),
  currency: z.string().length(3, "Code ISO 3 caractères (ex: XOF, EUR)").default("XOF"),
  contactEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

export type PartnerFormValues = z.infer<typeof partnerSchema>;

export const balanceSchema = z.object({
  balance: z.coerce.number().finite("Doit être un nombre"),
  reason: z.string().max(255).optional(),
});

export type BalanceFormValues = z.infer<typeof balanceSchema>;
