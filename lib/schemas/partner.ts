import { z } from "zod";
import { PartnerStatus } from "@/lib/enums";

export const partnerSchema = z
  .object({
    code: z.string().min(2, "Code requis (min 2 caractères)").max(50),
    name: z.string().min(2, "Nom requis").max(150),
    baseUrl: z
      .union([z.string().url("URL de base invalide"), z.literal("")])
      .optional(),
    status: z.nativeEnum(PartnerStatus).optional(),
    accountCode: z.string().optional(),
    currency: z
      .string()
      .length(3, "Code ISO 3 caractères (ex: XOF, EUR)")
      .default("XOF"),
    webhookUrl: z
      .union([z.string().url("URL webhook invalide"), z.literal("")])
      .optional(),
    contactEmail: z.string().email("Email invalide").optional().or(z.literal("")),
    contactPhone: z.string().max(30).optional(),
    /** UI only — off = alertes désactivées (null côté API). */
    alertsEnabled: z.boolean().default(false),
    lowBalanceThresholdPercent: z
      .number({ invalid_type_error: "Pourcentage requis" })
      .int("Entier requis")
      .min(1, "Minimum 1 %")
      .max(100, "Maximum 100 %")
      .nullable()
      .optional(),
    lowBalanceReferenceAmount: z
      .number({ invalid_type_error: "Montant de référence requis" })
      .positive("Doit être > 0")
      .nullable()
      .optional(),
    alertEmail: z.boolean().default(false),
    alertSms: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.alertsEnabled) return;

    if (
      data.lowBalanceThresholdPercent == null ||
      Number.isNaN(data.lowBalanceThresholdPercent)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lowBalanceThresholdPercent"],
        message: "Indiquez un pourcentage entre 1 et 100",
      });
    }

    if (
      data.lowBalanceReferenceAmount == null ||
      Number.isNaN(data.lowBalanceReferenceAmount) ||
      data.lowBalanceReferenceAmount <= 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lowBalanceReferenceAmount"],
        message: "Indiquez un montant de référence > 0",
      });
    }

    if (!data.alertEmail && !data.alertSms) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alertEmail"],
        message: "Sélectionnez au moins un canal (Email et/ou SMS)",
      });
    }

    if (data.alertEmail && !data.contactEmail?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contactEmail"],
        message: "Email contact requis pour les alertes email",
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alertEmail"],
        message: "Renseignez l'email contact ci-dessus",
      });
    }

    if (data.alertSms && !data.contactPhone?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contactPhone"],
        message: "Téléphone requis pour les alertes SMS",
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alertSms"],
        message: "Renseignez le téléphone ci-dessus",
      });
    }
  });

export type PartnerFormValues = z.infer<typeof partnerSchema>;

/** Champs envoyés à l'API (create / update partiel). */
export type PartnerSubmitValues = {
  code?: string;
  name?: string;
  baseUrl?: string;
  accountCode?: string;
  currency?: string;
  webhookUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  lowBalanceThresholdPercent?: number | null;
  lowBalanceReferenceAmount?: number | null;
  alertChannels?: number | null;
};

export const balanceSchema = z.object({
  balance: z.coerce.number().finite("Doit être un nombre"),
  reason: z.string().max(255).optional(),
});

export type BalanceFormValues = z.infer<typeof balanceSchema>;
