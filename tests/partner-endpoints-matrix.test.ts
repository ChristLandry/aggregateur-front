import { describe, expect, it, vi } from "vitest";
import { cellKey, indexEndpointsByCell } from "@/lib/api/partner-endpoints";
import {
  runMatrixCellLifecycle,
  type PartnerEndpointsMatrixApi,
} from "@/lib/partner-endpoints/matrix-lifecycle";
import { FinancialEndpointKey } from "@/lib/enums";
import type { PartnerEndpoint } from "@/lib/api/types";

const PARTNER_X = "11111111-1111-1111-1111-111111111111";
const SCHEMA_Y = "22222222-2222-2222-2222-222222222222";

function makeEndpoint(
  partial: Partial<PartnerEndpoint> & Pick<PartnerEndpoint, "id" | "partnerId" | "endpointKey">,
): PartnerEndpoint {
  return {
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("indexEndpointsByCell", () => {
  it("indexes endpoints by partnerId and endpointKey", () => {
    const map = indexEndpointsByCell([
      makeEndpoint({
        id: "ep-1",
        partnerId: PARTNER_X,
        endpointKey: FinancialEndpointKey.BankDebit,
      }),
      makeEndpoint({
        id: "ep-2",
        partnerId: PARTNER_X,
        endpointKey: FinancialEndpointKey.WalletCredit,
        schemaId: SCHEMA_Y,
      }),
    ]);

    expect(map.get(cellKey(PARTNER_X, FinancialEndpointKey.BankDebit))?.id).toBe("ep-1");
    expect(map.get(cellKey(PARTNER_X, FinancialEndpointKey.WalletCredit))?.schemaId).toBe(
      SCHEMA_Y,
    );
    expect(map.get(cellKey(PARTNER_X, FinancialEndpointKey.BankCredit))).toBeUndefined();
  });
});

describe("runMatrixCellLifecycle (integration)", () => {
  it("partenaire X: active BankDebit, attache schéma Y, détache, puis désactive", async () => {
    let stored: PartnerEndpoint | null = null;

    const api: PartnerEndpointsMatrixApi = {
      create: vi.fn(async ({ partnerId, endpointKey }) => {
        stored = makeEndpoint({
          id: "ep-bank-debit",
          partnerId,
          endpointKey,
        });
        return stored;
      }),
      attachSchema: vi.fn(async (endpointId, schemaId) => {
        if (!stored || stored.id !== endpointId) {
          throw new Error("endpoint not found");
        }
        stored = { ...stored, schemaId, schemaName: "Schema Y", schemaCode: "SCH_Y" };
        return stored;
      }),
      detachSchema: vi.fn(async (endpointId) => {
        if (!stored || stored.id !== endpointId) {
          throw new Error("endpoint not found");
        }
        const { schemaId: _s, schemaName: _n, schemaCode: _c, ...rest } = stored;
        stored = rest;
      }),
      deleteEndpoint: vi.fn(async (endpointId) => {
        if (!stored || stored.id !== endpointId) {
          throw new Error("endpoint not found");
        }
        stored = null;
      }),
    };

    const { endpointId } = await runMatrixCellLifecycle(
      api,
      PARTNER_X,
      FinancialEndpointKey.BankDebit,
      SCHEMA_Y,
    );

    expect(endpointId).toBe("ep-bank-debit");
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create).toHaveBeenCalledWith({
      partnerId: PARTNER_X,
      endpointKey: FinancialEndpointKey.BankDebit,
    });
    expect(api.attachSchema).toHaveBeenCalledWith("ep-bank-debit", SCHEMA_Y);
    expect(api.detachSchema).toHaveBeenCalledWith("ep-bank-debit");
    expect(api.deleteEndpoint).toHaveBeenCalledWith("ep-bank-debit");
    expect(stored).toBeNull();
  });
});
