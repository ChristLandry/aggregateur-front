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
  contactEmail?: string | null;
  contactPhone?: string | null;
  lowBalanceThresholdPercent?: number | null;
  lowBalanceReferenceAmount?: number | null;
  alertChannels?: number | null;
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

export function mapPartner(dto: ApiPartnerDto, balanceOverride?: number): Partner {
  const d = dto as ApiPartnerDto & Record<string, unknown>;
  return {
    id: String(d.partnerId ?? d.PartnerId ?? ""),
    code: String(d.partnerCode ?? d.PartnerCode ?? ""),
    name: String(d.name ?? d.Name ?? ""),
    status: Number(d.status ?? d.Status ?? 0),
    accountCode: (d.accountCode ?? d.AccountCode) as string | undefined,
    currency: String(d.currency ?? d.Currency ?? "XOF"),
    balance:
      balanceOverride ??
      Number(d.balance ?? d.Balance ?? 0),
    baseUrl: String(d.baseUrl ?? d.BaseUrl ?? ""),
    webhookUrl: (d.webhookUrl ?? d.WebhookUrl) as string | undefined,
    contactEmail:
      ((d.contactEmail ?? d.ContactEmail) as string | null | undefined) ??
      undefined,
    contactPhone:
      ((d.contactPhone ?? d.ContactPhone) as string | null | undefined) ??
      undefined,
    lowBalanceThresholdPercent: (() => {
      const v = d.lowBalanceThresholdPercent ?? d.LowBalanceThresholdPercent;
      return v == null ? null : Number(v);
    })(),
    lowBalanceReferenceAmount: (() => {
      const v = d.lowBalanceReferenceAmount ?? d.LowBalanceReferenceAmount;
      return v == null ? null : Number(v);
    })(),
    alertChannels: (() => {
      const v = d.alertChannels ?? d.AlertChannels;
      return v == null ? null : Number(v);
    })(),
    createdAt: String(d.createdAt ?? d.CreatedAt ?? ""),
    updatedAt: (d.updatedAt ?? d.UpdatedAt) as string | undefined,
  };
}

export function mapPartnerAccount(dto: ApiPartnerAccountDto): PartnerAccount {
  const d = dto as ApiPartnerAccountDto & Record<string, unknown>;
  return {
    partnerId: String(d.partnerId ?? d.PartnerId ?? ""),
    accountCode: String(
      d.partnerBankAccount ?? d.PartnerBankAccount ?? d.accountCode ?? "",
    ),
    balance: Number(d.balance ?? d.Balance ?? 0),
    currency: String(d.currency ?? d.Currency ?? "XOF"),
    totalDebit: 0,
    totalCredit: 0,
  };
}

export function mapPartnerBalance(dto: ApiPartnerBalanceDto) {
  const d = dto as ApiPartnerBalanceDto & Record<string, unknown>;
  return {
    balance: Number(d.balance ?? d.Balance ?? 0),
    currency: String(d.currency ?? d.Currency ?? "XOF"),
  };
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
  const d = dto as ApiAccountingLineDto & Record<string, unknown>;
  return {
    id: String(d.lineId ?? d.LineId ?? ""),
    schemaId,
    lineOrder: Number(d.lineOrder ?? d.LineOrder ?? 0),
    accountType: Number(d.accountType ?? d.AccountType ?? 0),
    accountCode: String(d.accountCode ?? d.AccountCode ?? ""),
    accountExpression:
      ((d.accountExpression ?? d.AccountExpression) as string | null | undefined) ??
      undefined,
    side: Number(d.side ?? d.Side ?? 0),
    amountFormula: String(d.amountFormula ?? d.AmountFormula ?? ""),
    label: String(d.label ?? d.Label ?? ""),
    code: ((d.code ?? d.Code) as string | null | undefined) ?? undefined,
    exploitant:
      ((d.exploitant ?? d.Exploitant) as string | null | undefined) ?? undefined,
    isFee: Boolean(d.isFee ?? d.IsFee ?? false),
    isConditional: Boolean(d.isConditional ?? d.IsConditional ?? false),
    condition:
      ((d.condition ?? d.Condition) as string | null | undefined) ?? undefined,
  };
}

export function mapAccountingSchema(dto: ApiAccountingSchemaDto): AccountingSchema {
  const d = dto as ApiAccountingSchemaDto & Record<string, unknown>;
  const schemaId = String(d.schemaId ?? d.SchemaId ?? "");
  const linesRaw = (d.lines ?? d.Lines ?? []) as ApiAccountingLineDto[];
  return {
    id: schemaId,
    name: String(d.name ?? d.Name ?? ""),
    code: String(d.name ?? d.Name ?? ""),
    transactionType: Number(d.transactionType ?? d.TransactionType ?? 0),
    channel: Number(d.channel ?? d.Channel ?? 0),
    isActive: Boolean(d.isActive ?? d.IsActive ?? true),
    description:
      ((d.description ?? d.Description) as string | null | undefined) ?? undefined,
    lines: (Array.isArray(linesRaw) ? linesRaw : []).map((l) =>
      mapAccountingLine(l, schemaId),
    ),
    createdAt: schemaId,
    priority: Number(d.priority ?? d.Priority ?? 0),
    transactionSide: Number(d.transactionSide ?? d.TransactionSide ?? 0),
    partnerId:
      ((d.partnerId ?? d.PartnerId) as string | null | undefined) ?? undefined,
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
  webhookUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  lowBalanceThresholdPercent?: number | null;
  lowBalanceReferenceAmount?: number | null;
  alertChannels?: number | null;
}) {
  const account = values.accountCode?.trim() || null;
  return {
    partnerCode: values.code,
    name: values.name,
    baseUrl: values.baseUrl?.trim() || defaultApiBase,
    currency: (values.currency ?? "XOF").toUpperCase(),
    partnerBankAccount: account,
    accountCode: account,
    webhookUrl: values.webhookUrl?.trim() || null,
    ipWhitelist: null,
    contactEmail: values.contactEmail?.trim() || null,
    contactPhone: values.contactPhone?.trim() || null,
    lowBalanceThresholdPercent: values.lowBalanceThresholdPercent ?? null,
    lowBalanceReferenceAmount: values.lowBalanceReferenceAmount ?? null,
    alertChannels: values.alertChannels ?? null,
  };
}

/**
 * Payload PUT /api/v1/partners/{id} (UpdatePartnerRequest — champs partiels).
 */
export function toUpdatePartnerBody(patch: Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.baseUrl !== undefined) {
    const url =
      typeof patch.baseUrl === "string" ? patch.baseUrl.trim() : patch.baseUrl;
    body.baseUrl = url || null;
  }
  if (patch.accountCode !== undefined) {
    const code =
      typeof patch.accountCode === "string"
        ? patch.accountCode.trim()
        : patch.accountCode;
    body.accountCode = code || null;
    body.partnerBankAccount = code || null;
  }
  if (patch.webhookUrl !== undefined) {
    const url =
      typeof patch.webhookUrl === "string"
        ? patch.webhookUrl.trim()
        : patch.webhookUrl;
    body.webhookUrl = url || null;
  }
  if (patch.currency !== undefined) {
    body.currency =
      typeof patch.currency === "string"
        ? patch.currency.trim().toUpperCase()
        : patch.currency;
  }
  if (patch.contactEmail !== undefined) {
    const email =
      typeof patch.contactEmail === "string"
        ? patch.contactEmail.trim()
        : patch.contactEmail;
    body.contactEmail = email || null;
  }
  if (patch.contactPhone !== undefined) {
    const phone =
      typeof patch.contactPhone === "string"
        ? patch.contactPhone.trim()
        : patch.contactPhone;
    body.contactPhone = phone || null;
  }
  if (patch.lowBalanceThresholdPercent !== undefined) {
    body.lowBalanceThresholdPercent = patch.lowBalanceThresholdPercent;
  }
  if (patch.lowBalanceReferenceAmount !== undefined) {
    body.lowBalanceReferenceAmount = patch.lowBalanceReferenceAmount;
  }
  if (patch.alertChannels !== undefined) {
    body.alertChannels = patch.alertChannels;
  }
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
  if (!dto) {
    throw new Error("Réponse partner-endpoint invalide (DTO manquant).");
  }
  const d = dto as ApiPartnerEndpointDto & Record<string, unknown>;
  const id = String(
    d.partnerEndpointId ?? d.PartnerEndpointId ?? d.endpointId ?? d.id ?? "",
  );
  const schemaId = (d.accountingSchemaId ??
    d.AccountingSchemaId ??
    d.schemaId ??
    d.SchemaId) as string | null | undefined;
  return {
    id,
    partnerId: String(d.partnerId ?? d.PartnerId ?? ""),
    endpointKey: Number(d.endpointKey ?? d.EndpointKey ?? 0),
    schemaId: schemaId ?? undefined,
    schemaName:
      ((d.accountingSchemaName ??
        d.AccountingSchemaName ??
        d.schemaName ??
        d.SchemaName) as string | null | undefined) ?? undefined,
    schemaCode:
      ((d.accountingSchemaCode ??
        d.AccountingSchemaCode ??
        d.schemaCode ??
        d.SchemaCode) as string | null | undefined) ?? undefined,
    createdAt: String(
      d.createdAt ?? d.CreatedAt ?? new Date().toISOString(),
    ),
    updatedAt:
      ((d.updatedAt ?? d.UpdatedAt) as string | null | undefined) ?? undefined,
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

/** Payload POST /api/v1/accounting/schemas (CreateAccountingSchemaRequest). */
export function toCreateAccountingSchemaBody(values: {
  name?: string;
  partnerId?: string | null;
  transactionType?: number;
  transactionSide?: number;
  channel?: number;
  priority?: number;
  description?: string | null;
  lines?: Array<{
    lineOrder: number;
    accountCode?: string;
    accountType: number;
    accountExpression?: string;
    side: number;
    amountFormula: string;
    label?: string;
    code?: string;
    exploitant?: string;
    isFee?: boolean;
    isConditional?: boolean;
    condition?: string;
  }>;
}) {
  const txType = values.transactionType ?? 0;
  const sideFromType =
    txType === 1 || txType === 3 ? 1 : 0; // Credit types → Credit, sinon Debit

  const mappedLines = (values.lines ?? []).map((l) => ({
    lineOrder: l.lineOrder,
    accountCode: l.accountCode ?? "",
    accountType: l.accountType,
    accountExpression: l.accountExpression ?? null,
    side: l.side,
    amountFormula: l.amountFormula,
    label: l.label ?? "",
    code: l.code ?? null,
    exploitant: l.exploitant ?? null,
    isFee: l.isFee ?? false,
    isConditional: l.isConditional ?? false,
    condition: l.condition ?? null,
  }));

  // Ligne initiale minimale : le détail du schéma permet de la modifier / en ajouter.
  // Évite l'échec si le back exige encore Lines.NotEmpty.
  const lines =
    mappedLines.length > 0
      ? mappedLines
      : [
          {
            lineOrder: 1,
            accountCode: "000000",
            accountType: 0,
            accountExpression: null,
            side: sideFromType,
            amountFormula: "AMOUNT",
            label: "À configurer",
            code: null,
            exploitant: null,
            isFee: false,
            isConditional: false,
            condition: null,
          },
        ];

  return {
    name: values.name?.trim() ?? "",
    partnerId: values.partnerId || null,
    transactionType: txType,
    transactionSide: values.transactionSide ?? sideFromType,
    channel: values.channel ?? 0,
    priority: values.priority ?? 0,
    description: values.description?.trim() || null,
    lines,
  };
}

/** Payload POST/PUT ligne de schéma comptable. */
export function toSchemaLineBody(values: {
  lineOrder?: number;
  accountCode?: string;
  accountType?: number;
  accountExpression?: string;
  side?: number;
  amountFormula?: string;
  label?: string;
  code?: string;
  exploitant?: string;
  isFee?: boolean;
  isConditional?: boolean;
  condition?: string;
}) {
  return {
    lineOrder: values.lineOrder ?? 1,
    accountCode: values.accountCode?.trim() ?? "",
    accountType: values.accountType ?? 0,
    accountExpression: values.accountExpression?.trim() || null,
    side: values.side ?? 0,
    amountFormula: values.amountFormula?.trim() ?? "AMOUNT",
    label: values.label?.trim() || "Ligne",
    code: values.code?.trim() || null,
    exploitant: values.exploitant?.trim() || null,
    isFee: values.isFee ?? false,
    isConditional: values.isConditional ?? false,
    condition: values.condition?.trim() || null,
  };
}

