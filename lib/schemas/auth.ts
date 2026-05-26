import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Nom d'utilisateur requis"),
  password: z.string().min(1, "Mot de passe requis"),
  twoFactorCode: z.string().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
