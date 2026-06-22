import { UserRole } from "@/lib/enums";
import type {
  AccountingLine,
  AccountingSchema,
  Customer,
  DashboardSummary,
  LoginResponse,
  Movement,
  Transaction,
  Partner,
  PartnerAccount,
  PartnerEndpoint,
  PartnerSummary,
  PagedResult,
  Subscription,
} from "./types";

// --- Raw DTOs (contrat JSON du backend, camelCase) ---

export interface ApiPartnerDto {
  partnerId: string;
  partnerCode: string;
  name: string;
  baseUrl: string;
  accountCode?: string | null;
  status: number;
  currency: string;
  webhookUrl?: string | null;
  rateLimitPerMin: number;
  requireHmac: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ApiPartnerAccountDto {
  accountId: string;
  partnerId: string;
  partnerBankAccount: string;
  balance: number;
  currency: string;
  lastMovementAt?: string | null;
}

export interface ApiPartnerBalanceDto {
  partnerId: string;
  balance: number;
  currency: string;
  lastMovementAt?: string | null;
}

export interface ApiCustomerDto {
  customerId: string;
  externalCustomerId?: string | null;
  fullName: string;
  dateOfBirth: string;
  email?: string | null;
  status: number;
  kycStatus: number;
  createdAt: string;
}

export interface ApiSubscriptionDto {
  subscriptionId: string;
  customerId: string;
  partnerId: string;
  phoneNumber: string;
  phoneOperator: string;
  bankCode?: string;
  status: number;
  subscribedAt: string;
  expiresAt?: string | null;
}

export interface ApiAccountingSchemaDto {
  schemaId: string;
  name: string;
  partnerId?: string | null;
  transactionType: number;
  transactionSide: number;
  channel: number;
  isActive: boolean;
  priority: number;
  description?: string | null;
  lines: ApiAccountingLineDto[];
}

export interface ApiAccountingLineDto {
  lineId: string;
  lineOrder: number;
  accountCode: string;
  accountType: number;
  accountExpression?: string | null;
  side: number;
  amountFormula: string;
  label: string;
  code?: string | null;
  exploitant?: string | null;
  isFee: boolean;
  isConditional: boolean;
  condition?: string | null;
}

export interface ApiTransactionDto {
  transactionId: string;
  partnerTransactionRef: string;
  partnerId: string;
  subscriptionId?: string | null;
  customerId?: string | null;
  transactionType: number;
  amount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  status: number;
  failureReason?: string | null;
  accountingStatus: number;
  initiatedAt: string;
  completedAt?: string | null;
  externalRef?: string | null;
  bankAccount?: string | null;
  phoneNumber?: string | null;
  extraData?: string | null;
}

export interface ApiMovementDto {
  movementId: string;
  transactionId: string;
  schemaId: string;
  lineOrder: number;
  account: string;
  amount: number;
  side: number;
  label: string;
  code?: string | null;
  exploitant?: string | null;
  reference?: string | null;
  transactionDate: string;
  isFee: boolean;
}

export interface ApiPaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ApiAdminDashboardDto {
  totalPartners: number;
  activePartners: number;
  totalCustomers: number;
  totalSubscriptions: number;
  todayTransactions: number;
  todayVolume: number;
  pendingTransactions: number;
  failedTransactions24h: number;
}

export interface ApiPartnerDashboardDto {
  partnerId: string;
  partnerCode: string;
  accountBalance: number;
  todayTransactions: number;
  todayVolume: number;
  activeSubscriptions: number;
}

export interface ApiLoginDto {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  role: string | number;
}

// --- Helpers ---

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const space = trimmed.indexOf(" ");
  if (space <= 0) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1),
  };
}

function parseUserRole(role: string | number | undefined): number {
  if (typeof role === "number") return role;
  if (typeof role === "string") {
    const asNum = Number(role);
    if (!Number.isNaN(asNum)) return asNum;
    const key = role as keyof typeof UserRole;
    if (key in UserRole) return UserRole[key] as number;
  }
  return UserRole.ReadOnly;
}

const defaultApiBase =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
        process.env.API_PROXY_TARGET?.replace(/\/$/, "") ||
        "https://localhost:44302")
    : "https://localhost:44302";

// --- Mappers API → modèle front ---

export function mapPartner(dto: ApiPartnerDto): Partner {
  return {
    id: dto.partnerId,
    code: dto.partnerCode,
    name: dto.name,
    status: dto.status,
    accountCode: dto.accountCode ?? undefined,
    currency: dto.currency,
    balance: 0,
    baseUrl: dto.baseUrl,
    webhookUrl: dto.webhookUrl ?? undefined,
    rateLimitPerMin: dto.rateLimitPerMin,
    requireHmac: dto.requireHmac,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt ?? undefined,
  };
}

export function mapPartnerAccount(dto: ApiPartnerAccountDto): PartnerAccount {
  return {
    partnerId: dto.partnerId,
    accountCode: dto.partnerBankAccount,
    balance: dto.balance,
    currency: dto.currency,
    totalDebit: 0,
    totalCredit: 0,
  };
}

export function mapPartnerBalance(dto: ApiPartnerBalanceDto) {
  return { balance: dto.balance, currency: dto.currency };
}

export function mapCustomer(dto: ApiCustomerDto): Customer {
  const { firstName, lastName } = splitFullName(dto.fullName);
  return {
    id: dto.customerId,
    partnerId: "",
    externalId: dto.externalCustomerId ?? undefined,
    firstName,
    lastName,
    email: dto.email ?? undefined,
    status: dto.status,
    kycStatus: dto.kycStatus,
    dateOfBirth: dto.dateOfBirth,
    createdAt: dto.createdAt,
  };
}

export function mapSubscription(dto: ApiSubscriptionDto): Subscription {
  const d = dto as ApiSubscriptionDto & Record<string, unknown>;
  const id = String(d.subscriptionId ?? d.SubscriptionId ?? "");
  const customerId = String(d.customerId ?? d.CustomerId ?? "");
  const partnerId = String(d.partnerId ?? d.PartnerId ?? "");
  const subscribedAt = String(d.subscribedAt ?? d.SubscribedAt ?? "");
  const expiresAt = (d.expiresAt ?? d.ExpiresAt) as string | null | undefined;
  return {
    id,
    customerId,
    partnerId,
    phoneNumber: String(d.phoneNumber ?? d.PhoneNumber ?? ""),
    phoneOperator: String(d.phoneOperator ?? d.PhoneOperator ?? ""),
    bankCode: d.bankCode != null ? String(d.bankCode) : undefined,
    status: Number(d.status ?? d.Status ?? 0),
    startDate: subscribedAt,
    endDate: expiresAt ?? undefined,
    createdAt: subscribedAt,
  };
}

export function mapAccountingLine(dto: ApiAccountingLineDto, schemaId: string): AccountingLine {
  return {
    id: dto.lineId,
    schemaId,
    lineOrder: dto.lineOrder,
    accountType: dto.accountType,
    accountCode: dto.accountCode,
    accountExpression: dto.accountExpression ?? undefined,
    side: dto.side,
    amountFormula: dto.amountFormula,
    label: dto.label,
    code: dto.code ?? undefined,
    exploitant: dto.exploitant ?? undefined,
    isFee: dto.isFee,
    isConditional: dto.isConditional,
    condition: dto.condition ?? undefined,
  };
}

export function mapAccountingSchema(dto: ApiAccountingSchemaDto): AccountingSchema {
  return {
    id: dto.schemaId,
    name: dto.name,
    code: dto.name,
    transactionType: dto.transactionType,
    channel: dto.channel,
    isActive: dto.isActive,
    description: dto.description ?? undefined,
    lines: dto.lines.map((l) => mapAccountingLine(l, dto.schemaId)),
    createdAt: dto.schemaId,
    priority: dto.priority,
    transactionSide: dto.transactionSide,
    partnerId: dto.partnerId ?? undefined,
  };
}

export function mapTransaction(dto: ApiTransactionDto): Transaction {
  return {
    id: dto.transactionId,
    partnerTransactionRef: dto.partnerTransactionRef,
    partnerId: dto.partnerId,
    subscriptionId: dto.subscriptionId ?? undefined,
    customerId: dto.customerId ?? undefined,
    transactionType: dto.transactionType,
    amount: dto.amount,
    feeAmount: dto.feeAmount,
    netAmount: dto.netAmount,
    currency: dto.currency,
    status: dto.status,
    failureReason: dto.failureReason ?? undefined,
    accountingStatus: dto.accountingStatus,
    initiatedAt: dto.initiatedAt,
    completedAt: dto.completedAt ?? undefined,
    externalRef: dto.externalRef ?? undefined,
    bankAccount: dto.bankAccount ?? undefined,
    phoneNumber: dto.phoneNumber ?? undefined,
    extraData: dto.extraData ?? undefined,
  };
}

export function mapPaginatedTransactions(
  dto: ApiPaginatedResult<ApiTransactionDto>,
): PagedResult<Transaction> {
  return {
    items: (dto.items ?? []).map(mapTransaction),
    page: dto.page,
    pageSize: dto.pageSize,
    total: dto.totalCount,
  };
}

export function mapMovement(dto: ApiMovementDto): Movement {
  return {
    id: dto.movementId,
    transactionId: dto.transactionId,
    schemaId: dto.schemaId,
    lineOrder: dto.lineOrder,
    account: dto.account,
    side: dto.side,
    amount: dto.amount,
    currency: "XOF",
    label: dto.label,
    code: dto.code ?? undefined,
    exploitant: dto.exploitant ?? undefined,
    reference: dto.reference ?? undefined,
    transactionDate: dto.transactionDate,
    isFee: dto.isFee,
    status: 1,
    createdAt: dto.transactionDate,
  };
}

export function mapPaginatedMovements(
  dto: ApiPaginatedResult<ApiMovementDto>,
): PagedResult<Movement> {
  return {
    items: dto.items.map(mapMovement),
    total: dto.totalCount,
    page: dto.page,
    pageSize: dto.pageSize,
  };
}

export function mapAdminDashboard(dto: ApiAdminDashboardDto): DashboardSummary {
  const total = dto.todayTransactions || 1;
  const successRate = Math.max(0, (total - dto.failedTransactions24h) / total);
  return {
    transactionsToday: dto.todayTransactions,
    successRate,
    totalVolume: dto.todayVolume,
    currency: "XOF",
    activePartners: dto.activePartners,
    pendingTransactions: dto.pendingTransactions,
    totalPartners: dto.totalPartners,
    totalCustomers: dto.totalCustomers,
    totalSubscriptions: dto.totalSubscriptions,
    failedTransactions24h: dto.failedTransactions24h,
  };
}

export function mapPartnerDashboard(dto: ApiPartnerDashboardDto): PartnerSummary {
  return {
    partnerId: dto.partnerId,
    balance: dto.accountBalance,
    currency: "XOF",
    transactionsToday: dto.todayTransactions,
    successRate: 1,
    totalVolume: dto.todayVolume,
    activeSubscriptions: dto.activeSubscriptions,
    partnerCode: dto.partnerCode,
  };
}

export function mapLogin(dto: ApiLoginDto): LoginResponse {
  return {
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
    expiresAt: dto.expiresAt,
    role: parseUserRole(dto.role),
  };
}

// --- Mappers front → payloads API ---

export function toCreatePartnerBody(values: {
  code?: string;
  name?: string;
  baseUrl?: string;
  accountCode?: string;
  currency?: string;
}) {
  return {
    partnerCode: values.code,
    name: values.name,
    baseUrl: values.baseUrl || defaultApiBase,
    currency: values.currency ?? "XOF",
    accountCode: values.accountCode || undefined,
    rateLimitPerMin: 100,
    requireHmac: false,
  };
}

export function toUpdatePartnerBody(patch: Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.baseUrl !== undefined) body.baseUrl = patch.baseUrl;
  if (patch.accountCode !== undefined) body.accountCode = patch.accountCode;
  if (patch.currency !== undefined) body.currency = patch.currency;
  if (patch.webhookUrl !== undefined) body.webhookUrl = patch.webhookUrl;
  return body;
}

export function toCreateCustomerBody(values: {
  externalId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
  nationalId?: string;
}) {
  const first = values.firstName?.trim() ?? "";
  const last = values.lastName?.trim() ?? "";
  return {
    externalCustomerId: values.externalId?.trim() || undefined,
    fullName: `${first} ${last}`.trim(),
    dateOfBirth: values.dateOfBirth ?? "1990-01-01",
    nationalId: values.nationalId?.trim() || undefined,
    email: values.email?.trim() || undefined,
  };
}

export function toUpdateCustomerBody(patch: Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    const first = String(patch.firstName ?? "");
    const last = String(patch.lastName ?? "");
    body.fullName = `${first} ${last}`.trim();
  }
  if (patch.email !== undefined) body.email = patch.email;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.kycStatus !== undefined) body.kycStatus = patch.kycStatus;
  if (patch.dateOfBirth !== undefined) body.dateOfBirth = patch.dateOfBirth;
  return body;
}

// ------------------------------------------------------------------
// Partner endpoints
// ------------------------------------------------------------------

/**
 * Backend DTO for /api/v1/partner-endpoints. We accept multiple naming
 * conventions because the contract uses both "endpointId" and "id" in
 * different docs.
 */
export interface ApiPartnerEndpointDto {
  partnerEndpointId?: string;
  endpointId?: string;
  id?: string;

  partnerId: string;
  endpointKey: number;

  accountingSchemaId?: string | null;
  schemaId?: string | null;
  schemaName?: string | null;
  schemaCode?: string | null;
  accountingSchemaName?: string | null;
  accountingSchemaCode?: string | null;

  createdAt?: string;
  updatedAt?: string | null;
}

export function mapPartnerEndpoint(dto: ApiPartnerEndpointDto): PartnerEndpoint {
  const id = dto.partnerEndpointId ?? dto.endpointId ?? dto.id ?? "";
  const schemaId = dto.accountingSchemaId ?? dto.schemaId ?? undefined;
  return {
    id,
    partnerId: dto.partnerId,
    endpointKey: dto.endpointKey,
    schemaId: schemaId ?? undefined,
    schemaName: dto.accountingSchemaName ?? dto.schemaName ?? undefined,
    schemaCode: dto.accountingSchemaCode ?? dto.schemaCode ?? undefined,
    createdAt: dto.createdAt ?? new Date().toISOString(),
    updatedAt: dto.updatedAt ?? undefined,
  };
}

/** Payload POST /api/v1/subscriptions (aligné CreateSubscriptionDirectRequest). */
export function toCreateSubscriptionBody(values: {
  customerId: string;
  bankAccountNumber: string;
  bankCode?: string;
  phoneNumber: string;
  phoneOperator: string;
  expiresAt?: string | null;
}) {
  const expires =
    values.expiresAt === undefined || values.expiresAt === ""
      ? null
      : values.expiresAt;

  return {
    customerId: values.customerId,
    bankAccountNumber: values.bankAccountNumber,
    phoneNumber: values.phoneNumber,
    phoneOperator: values.phoneOperator,
    expiresAt: expires,
  };
}
