"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client";
import type { Customer } from "./types";
import { CustomerStatus, KycStatus } from "@/lib/enums";

export const clientsKeys = {
  all: ["clients"] as const,
  list: (take?: number) => [...clientsKeys.all, "list", take ?? 500] as const,
  detail: (id: string) => [...clientsKeys.all, "detail", id] as const,
};

export interface ClientSummary {
  id: string;
  bankAccountRoot: string;
  fullName: string;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  customersCount: number;
  createdAt: string;
}

export interface ClientCustomer {
  id: string;
  fullName: string;
  nationalId?: string | null;
  email?: string | null;
  status: number;
  kycStatus: number;
  createdAt: string;
}

export interface ClientDetail extends Omit<ClientSummary, "customersCount"> {
  customers: ClientCustomer[];
}

type ApiClientDto = {
  clientId?: string;
  ClientId?: string;
  bankAccountRoot?: string;
  BankAccountRoot?: string;
  fullName?: string;
  FullName?: string;
  dateOfBirth?: string | null;
  DateOfBirth?: string | null;
  nationalId?: string | null;
  NationalId?: string | null;
  phoneNumber?: string | null;
  PhoneNumber?: string | null;
  email?: string | null;
  Email?: string | null;
  customersCount?: number;
  CustomersCount?: number;
  createdAt?: string;
  CreatedAt?: string;
  customers?: ApiClientCustomerDto[];
  Customers?: ApiClientCustomerDto[];
};

type ApiClientCustomerDto = {
  customerId?: string;
  CustomerId?: string;
  fullName?: string;
  FullName?: string;
  nationalId?: string | null;
  NationalId?: string | null;
  email?: string | null;
  Email?: string | null;
  status?: number;
  Status?: number;
  kycStatus?: number;
  KycStatus?: number;
  createdAt?: string;
  CreatedAt?: string;
};

function mapClientSummary(dto: ApiClientDto): ClientSummary {
  return {
    id: String(dto.clientId ?? dto.ClientId ?? ""),
    bankAccountRoot: String(dto.bankAccountRoot ?? dto.BankAccountRoot ?? ""),
    fullName: String(dto.fullName ?? dto.FullName ?? ""),
    dateOfBirth: dto.dateOfBirth ?? dto.DateOfBirth,
    nationalId: dto.nationalId ?? dto.NationalId,
    phoneNumber: dto.phoneNumber ?? dto.PhoneNumber,
    email: dto.email ?? dto.Email,
    customersCount: Number(dto.customersCount ?? dto.CustomersCount ?? 0),
    createdAt: String(dto.createdAt ?? dto.CreatedAt ?? ""),
  };
}

function mapClientCustomer(dto: ApiClientCustomerDto): ClientCustomer {
  return {
    id: String(dto.customerId ?? dto.CustomerId ?? ""),
    fullName: String(dto.fullName ?? dto.FullName ?? ""),
    nationalId: dto.nationalId ?? dto.NationalId,
    email: dto.email ?? dto.Email,
    status: Number(dto.status ?? dto.Status ?? CustomerStatus.Active),
    kycStatus: Number(dto.kycStatus ?? dto.KycStatus ?? KycStatus.NotVerified),
    createdAt: String(dto.createdAt ?? dto.CreatedAt ?? ""),
  };
}

function mapClientDetail(dto: ApiClientDto): ClientDetail {
  const base = mapClientSummary(dto);
  const rows = dto.customers ?? dto.Customers ?? [];
  return {
    id: base.id,
    bankAccountRoot: base.bankAccountRoot,
    fullName: base.fullName,
    dateOfBirth: base.dateOfBirth,
    nationalId: base.nationalId,
    phoneNumber: base.phoneNumber,
    email: base.email,
    createdAt: base.createdAt,
    customers: rows.map(mapClientCustomer),
  };
}

/** GET /api/v1/clients */
export function useClients(take = 500) {
  return useQuery({
    queryKey: clientsKeys.list(take),
    queryFn: async () => {
      const rows = await apiGet<ApiClientDto[]>(`/api/v1/clients?take=${take}`);
      return (Array.isArray(rows) ? rows : []).map(mapClientSummary);
    },
    meta: { errorFallback: "Impossible de charger les clients" },
  });
}

/** GET /api/v1/clients/:id */
export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: clientsKeys.detail(id ?? ""),
    queryFn: async () => {
      const dto = await apiGet<ApiClientDto>(`/api/v1/clients/${id}`);
      return mapClientDetail(dto);
    },
    enabled: !!id,
    meta: { errorFallback: "Impossible de charger le client" },
  });
}

/** Utilitaire d'affichage — Customer legacy depuis un ClientCustomer. */
export function clientCustomerAsCustomer(c: ClientCustomer): Partial<Customer> {
  const parts = c.fullName.trim().split(/\s+/);
  return {
    id: c.id,
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || "",
    email: c.email ?? undefined,
    status: c.status,
    kycStatus: c.kycStatus,
    createdAt: c.createdAt,
  };
}
