// Shared API types matching the backend contract.

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LoginRequest {
  username: string;
  password: string;
  twoFactorCode?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  role: number; // UserRole
  userId?: string;
  username?: string;
  partnerId?: string;
}

export interface Partner {
  id: string;
  code: string;
  name: string;
  status: number; // PartnerStatus
  accountCode?: string;
  currency: string;
  balance: number;
  baseUrl?: string;
  webhookUrl?: string;
  rateLimitPerMin?: number;
  requireHmac?: boolean;
  apiKey?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PartnerAccount {
  partnerId: string;
  accountCode: string;
  balance: number;
  currency: string;
  totalDebit: number;
  totalCredit: number;
  movementsCount?: number;
}

export interface Customer {
  id: string;
  partnerId: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  email?: string;
  bankAccount?: string;
  status: number; // CustomerStatus
  kycStatus: number; // KycStatus
  createdAt: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  partnerId: string;
  phoneNumber?: string;
  phoneOperator?: string;
  bankCode?: string;
  planCode?: string;
  status: number; // SubscriptionStatus
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AccountingLine {
  id: string;
  schemaId: string;
  lineOrder: number;
  accountType: number; // AccountType
  accountCode?: string;
  accountExpression?: string;
  side: number; // LedgerSide
  amountFormula: string;
  label?: string;
  code?: string;
  exploitant?: string;
  isFee: boolean;
  isConditional: boolean;
  condition?: string;
}

export interface AccountingSchema {
  id: string;
  name: string;
  code: string;
  transactionType: number; // TransactionType
  transactionSide?: number;
  channel: number; // Channel
  isActive: boolean;
  priority?: number;
  partnerId?: string;
  description?: string;
  lines: AccountingLine[];
  createdAt: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  partnerTransactionRef: string;
  partnerId: string;
  subscriptionId?: string;
  customerId?: string;
  transactionType: number;
  amount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  status: number;
  failureReason?: string;
  accountingStatus: number;
  initiatedAt: string;
  completedAt?: string;
  externalRef?: string;
  bankAccount?: string;
  phoneNumber?: string;
}

export interface TransactionQuery {
  partnerId?: string;
  account?: string;
  phoneNumber?: string;
  number?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface Movement {
  id: string;
  transactionId: string;
  partnerId?: string;
  account: string;
  side: number; // LedgerSide
  amount: number;
  currency: string;
  label?: string;
  code?: string;
  exploitant?: string;
  status: number; // AccountingStatus
  createdAt: string;
  appliedAt?: string;
}

export interface MovementQuery {
  fromDate?: string;
  toDate?: string;
  account?: string;
  transactionId?: string;
  page?: number;
  pageSize?: number;
}

export interface DashboardSummary {
  transactionsToday: number;
  transactionsTodayDelta?: number;
  successRate: number; // 0..1
  successRateDelta?: number;
  totalVolume: number;
  currency: string;
  activePartners: number;
  pendingTransactions: number;
  totalPartners?: number;
  totalCustomers?: number;
  totalSubscriptions?: number;
  failedTransactions24h?: number;
  topPartners?: { partnerId: string; name: string; volume: number; transactions: number }[];
  recentFailures?: { id: string; partnerName?: string; reason: string; createdAt: string }[];
  sparkline?: number[];
}

export interface PartnerSummary {
  partnerId: string;
  balance: number;
  currency: string;
  transactionsToday: number;
  successRate: number;
  totalVolume: number;
  activeSubscriptions?: number;
  partnerCode?: string;
}

export interface PartnerEndpoint {
  id: string;
  partnerId: string;
  /** FinancialEndpointKey (0..3) */
  endpointKey: number;
  /** Attached accounting schema, if any. */
  schemaId?: string;
  schemaName?: string;
  schemaCode?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExportRequest {
  reportType:
    | "transactions"
    | "subscriptions"
    | "failure-analysis"
    | "accounting"
    | "partner-account-statement";
  format: "csv" | "xlsx";
  partnerId?: string;
  fromDate?: string;
  toDate?: string;
}
