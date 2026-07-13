// Domain enums mirroring the backend contract.

export enum TransactionType {
  BankDebit = 0,
  BankCredit = 1,
  WalletDebit = 2,
  WalletCredit = 3,
  WalletCancel = 4,
}

export enum TransactionSide {
  Debit = 0,
  Credit = 1,
}

export enum Channel {
  Bank = 0,
  Wallet = 1,
}

export enum TransactionStatus {
  Pending = 0,
  Success = 1,
  Failed = 2,
  Cancelled = 3,
  Reversed = 4,
}

export enum AccountingStatus {
  Pending = 0,
  Applied = 1,
  Error = 2,
}

export enum CustomerStatus {
  Inactive = 0,
  Active = 1,
  Blocked = 2,
}

export enum KycStatus {
  NotVerified = 0,
  InProgress = 1,
  Verified = 2,
  Rejected = 3,
}

export enum PartnerStatus {
  Inactive = 0,
  Active = 1,
  Suspended = 2,
}

/** Flags canaux d'alerte solde bas (Email=1, Sms=2, Email+Sms=3). */
export enum AlertChannels {
  None = 0,
  Email = 1,
  Sms = 2,
  EmailAndSms = 3,
}

export enum SubscriptionStatus {
  Inactive = 0,
  Active = 1,
  Suspended = 2,
}

export enum LedgerSide {
  Debit = 0,
  Credit = 1,
}

export enum AccountType {
  Fixed = 0,
  Dynamic = 1,
}

export enum UserRole {
  SuperAdmin = 0,
  Admin = 1,
  Finance = 2,
  Partner = 3,
  ReadOnly = 4,
}

export enum FinancialEndpointKey {
  BankDebit = 0,
  BankCredit = 1,
  WalletDebit = 2,
  WalletCredit = 3,
}

export const FinancialEndpointKeyLabel: Record<FinancialEndpointKey, string> = {
  [FinancialEndpointKey.BankDebit]: "BankDebit",
  [FinancialEndpointKey.BankCredit]: "BankCredit",
  [FinancialEndpointKey.WalletDebit]: "WalletDebit",
  [FinancialEndpointKey.WalletCredit]: "WalletCredit",
};

export const FINANCIAL_ENDPOINT_KEYS: FinancialEndpointKey[] = [
  FinancialEndpointKey.BankDebit,
  FinancialEndpointKey.BankCredit,
  FinancialEndpointKey.WalletDebit,
  FinancialEndpointKey.WalletCredit,
];

// Human-readable labels (FR).
export const TransactionTypeLabel: Record<TransactionType, string> = {
  [TransactionType.BankDebit]: "Débit bancaire",
  [TransactionType.BankCredit]: "Crédit bancaire",
  [TransactionType.WalletDebit]: "Débit wallet",
  [TransactionType.WalletCredit]: "Crédit wallet",
  [TransactionType.WalletCancel]: "Annulation wallet",
};

export const TransactionStatusLabel: Record<TransactionStatus, string> = {
  [TransactionStatus.Pending]: "En attente",
  [TransactionStatus.Success]: "Succès",
  [TransactionStatus.Failed]: "Échec",
  [TransactionStatus.Cancelled]: "Annulé",
  [TransactionStatus.Reversed]: "Contre-passé",
};

export const PartnerStatusLabel: Record<PartnerStatus, string> = {
  [PartnerStatus.Inactive]: "Inactif",
  [PartnerStatus.Active]: "Actif",
  [PartnerStatus.Suspended]: "Suspendu",
};

export const AlertChannelsLabel: Record<AlertChannels, string> = {
  [AlertChannels.None]: "Aucun",
  [AlertChannels.Email]: "Email",
  [AlertChannels.Sms]: "SMS",
  [AlertChannels.EmailAndSms]: "Email + SMS",
};

export function encodeAlertChannels(email: boolean, sms: boolean): AlertChannels {
  return ((email ? AlertChannels.Email : 0) |
    (sms ? AlertChannels.Sms : 0)) as AlertChannels;
}

export function decodeAlertChannels(flags: number | null | undefined): {
  email: boolean;
  sms: boolean;
} {
  const n = flags ?? AlertChannels.None;
  return {
    email: (n & AlertChannels.Email) !== 0,
    sms: (n & AlertChannels.Sms) !== 0,
  };
}

export function alertChannelsLabel(flags: number | null | undefined): string {
  const n = (flags ?? AlertChannels.None) as AlertChannels;
  return AlertChannelsLabel[n] ?? String(flags);
}

export const CustomerStatusLabel: Record<CustomerStatus, string> = {
  [CustomerStatus.Inactive]: "Inactif",
  [CustomerStatus.Active]: "Actif",
  [CustomerStatus.Blocked]: "Bloqué",
};

export const SubscriptionStatusLabel: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.Inactive]: "Inactive",
  [SubscriptionStatus.Active]: "Active",
  [SubscriptionStatus.Suspended]: "Suspendue",
};

export const KycStatusLabel: Record<KycStatus, string> = {
  [KycStatus.NotVerified]: "Non vérifié",
  [KycStatus.InProgress]: "En cours",
  [KycStatus.Verified]: "Vérifié",
  [KycStatus.Rejected]: "Rejeté",
};

export const AccountingStatusLabel: Record<AccountingStatus, string> = {
  [AccountingStatus.Pending]: "En attente",
  [AccountingStatus.Applied]: "Appliqué",
  [AccountingStatus.Error]: "Erreur",
};

export const UserRoleLabel: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: "SuperAdmin",
  [UserRole.Admin]: "Admin",
  [UserRole.Finance]: "Finance",
  [UserRole.Partner]: "Partenaire",
  [UserRole.ReadOnly]: "Lecture seule",
};

// Maps a status enum to a Badge variant key.
export type StatusVariant = "success" | "warning" | "danger" | "info" | "muted";

export function partnerStatusVariant(s: PartnerStatus): StatusVariant {
  switch (s) {
    case PartnerStatus.Active:
      return "success";
    case PartnerStatus.Suspended:
      return "danger";
    default:
      return "muted";
  }
}

export function customerStatusVariant(s: CustomerStatus): StatusVariant {
  switch (s) {
    case CustomerStatus.Active:
      return "success";
    case CustomerStatus.Blocked:
      return "danger";
    default:
      return "muted";
  }
}

export function subscriptionStatusVariant(s: SubscriptionStatus): StatusVariant {
  switch (s) {
    case SubscriptionStatus.Active:
      return "success";
    case SubscriptionStatus.Suspended:
      return "danger";
    default:
      return "muted";
  }
}

export function transactionStatusVariant(s: TransactionStatus): StatusVariant {
  switch (s) {
    case TransactionStatus.Success:
      return "success";
    case TransactionStatus.Failed:
      return "danger";
    case TransactionStatus.Cancelled:
    case TransactionStatus.Reversed:
      return "warning";
    case TransactionStatus.Pending:
      return "info";
    default:
      return "muted";
  }
}

export function accountingStatusVariant(s: AccountingStatus): StatusVariant {
  switch (s) {
    case AccountingStatus.Applied:
      return "success";
    case AccountingStatus.Error:
      return "danger";
    default:
      return "info";
  }
}
