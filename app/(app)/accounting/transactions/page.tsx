import { redirect } from "next/navigation";

export default function AccountingTransactionsRedirect() {
  redirect("/transactions");
}
