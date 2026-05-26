import { redirect } from "next/navigation";

/** Ancienne route — redirige vers Transactions. */
export default function MovementsRedirectPage() {
  redirect("/accounting/transactions");
}
