import { redirect } from "next/navigation";

/** Ancien détail Customer — remplacé par Clients racines. */
export default function CustomerDetailRedirectPage() {
  redirect("/clients");
}
