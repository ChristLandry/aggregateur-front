import { redirect } from "next/navigation";

/** Ancien écran Customers — remplacé par Clients racines. */
export default function CustomersRedirectPage() {
  redirect("/clients");
}
