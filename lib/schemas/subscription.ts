import { z } from "zod";

export const subscriptionSchema = z.object({
  customerId: z.string().uuid("Client requis"),
  bankAccountNumber: z.string().min(1, "Compte bancaire requis"),
  bankCode: z.string().min(1, "Code banque requis"),
  phoneNumber: z.string().min(1, "Téléphone requis"),
  phoneOperator: z.string().min(1, "Opérateur requis"),
  expiresAt: z.string().optional().nullable(),
});

export type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;
