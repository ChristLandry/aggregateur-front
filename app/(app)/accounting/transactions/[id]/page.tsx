import { redirect } from "next/navigation";

export default async function AccountingTransactionDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/transactions/${id}`);
}
