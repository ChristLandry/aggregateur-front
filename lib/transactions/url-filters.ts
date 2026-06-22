import type { TransactionSearchFilters } from "@/lib/api/transactions";

export function filtersFromSearchParams(
  sp: URLSearchParams,
): TransactionSearchFilters {
  const status = sp.get("status");
  const type = sp.get("type");
  const page = sp.get("page");
  const pageSize = sp.get("pageSize");
  return {
    fromDate: sp.get("fromDate") || undefined,
    toDate: sp.get("toDate") || undefined,
    partnerId: sp.get("partnerId") || undefined,
    status: status !== null && status !== "" ? Number(status) : undefined,
    bankAccount: sp.get("bankAccount") || undefined,
    phoneNumber: sp.get("phoneNumber") || undefined,
    partnerTransactionRef: sp.get("partnerTransactionRef") || undefined,
    type: type !== null && type !== "" ? Number(type) : undefined,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 50,
  };
}

export function searchParamsFromFilters(
  filters: TransactionSearchFilters,
): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.fromDate) sp.set("fromDate", filters.fromDate);
  if (filters.toDate) sp.set("toDate", filters.toDate);
  if (filters.partnerId) sp.set("partnerId", filters.partnerId);
  if (filters.status !== undefined) sp.set("status", String(filters.status));
  if (filters.bankAccount) sp.set("bankAccount", filters.bankAccount);
  if (filters.phoneNumber) sp.set("phoneNumber", filters.phoneNumber);
  if (filters.partnerTransactionRef) {
    sp.set("partnerTransactionRef", filters.partnerTransactionRef);
  }
  if (filters.type !== undefined) sp.set("type", String(filters.type));
  if (filters.page && filters.page > 1) sp.set("page", String(filters.page));
  if (filters.pageSize && filters.pageSize !== 50) {
    sp.set("pageSize", String(filters.pageSize));
  }
  return sp;
}
