"use client";

import { Badge } from "@/components/ui/badge";
import {
  type StatusVariant,
  PartnerStatus,
  PartnerStatusLabel,
  partnerStatusVariant,
  CustomerStatus,
  CustomerStatusLabel,
  customerStatusVariant,
  SubscriptionStatus,
  SubscriptionStatusLabel,
  subscriptionStatusVariant,
  TransactionStatus,
  TransactionStatusLabel,
  transactionStatusVariant,
  AccountingStatus,
  AccountingStatusLabel,
  accountingStatusVariant,
  KycStatus,
  KycStatusLabel,
} from "@/lib/enums";

const variantToBadge: Record<StatusVariant, "success" | "warning" | "danger" | "info" | "muted"> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  muted: "muted",
};

export function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
  return (
    <Badge variant={variantToBadge[partnerStatusVariant(status)]}>
      {PartnerStatusLabel[status]}
    </Badge>
  );
}

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <Badge variant={variantToBadge[customerStatusVariant(status)]}>
      {CustomerStatusLabel[status]}
    </Badge>
  );
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <Badge variant={variantToBadge[subscriptionStatusVariant(status)]}>
      {SubscriptionStatusLabel[status]}
    </Badge>
  );
}

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <Badge variant={variantToBadge[transactionStatusVariant(status)]}>
      {TransactionStatusLabel[status]}
    </Badge>
  );
}

export function AccountingStatusBadge({ status }: { status: AccountingStatus }) {
  return (
    <Badge variant={variantToBadge[accountingStatusVariant(status)]}>
      {AccountingStatusLabel[status]}
    </Badge>
  );
}

export function KycStatusBadge({ status }: { status: KycStatus }) {
  const variant: StatusVariant =
    status === KycStatus.Verified
      ? "success"
      : status === KycStatus.Rejected
        ? "danger"
        : status === KycStatus.InProgress
          ? "info"
          : "muted";
  return <Badge variant={variantToBadge[variant]}>{KycStatusLabel[status]}</Badge>;
}
