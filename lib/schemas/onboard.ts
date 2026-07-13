import { z } from "zod";

/** Schéma d'onboarding aligné OnboardCustomerValidator (backend). */
export const onboardSchema = z.object({
  bankAccount: z
    .string()
    .min(1, "Compte bancaire requis")
    .max(50, "Maximum 50 caractères"),
  phoneNumber: z
    .string()
    .min(1, "Téléphone requis")
    .max(20, "Maximum 20 caractères"),
  bankAccountRoot: z
    .string()
    .min(1, "Racine client (bankAccountRoot) requise")
    .max(50, "Maximum 50 caractères"),
  walletTemporalyCode: z
    .string()
    .min(4, "Code OTP trop court (min. 4)")
    .max(100, "Maximum 100 caractères")
    .regex(/^[A-Za-z0-9-]+$/, "Code OTP invalide"),
  partnerId: z.string().uuid("Partenaire requis"),
});

export type OnboardFormValues = z.infer<typeof onboardSchema>;
