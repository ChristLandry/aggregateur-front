import type { PartnerEndpoint } from "@/lib/api/types";
import type { CreatePartnerEndpointInput } from "@/lib/api/partner-endpoints";

/** API adapter for matrix cell lifecycle (testable without React). */
export interface PartnerEndpointsMatrixApi {
  create(input: CreatePartnerEndpointInput): Promise<PartnerEndpoint>;
  attachSchema(endpointId: string, schemaId: string): Promise<PartnerEndpoint>;
  detachSchema(endpointId: string): Promise<void>;
  deleteEndpoint(endpointId: string): Promise<void>;
}

/**
 * Full matrix workflow: activate endpoint → attach schema → detach → deactivate.
 * Used by integration tests and documents the expected API sequence.
 */
export async function runMatrixCellLifecycle(
  api: PartnerEndpointsMatrixApi,
  partnerId: string,
  endpointKey: number,
  schemaId: string,
): Promise<{ endpointId: string }> {
  const created = await api.create({ partnerId, endpointKey });
  if (!created.id) {
    throw new Error("create: missing endpoint id");
  }

  const attached = await api.attachSchema(created.id, schemaId);
  if (attached.schemaId !== schemaId) {
    throw new Error("attachSchema: schemaId mismatch");
  }

  await api.detachSchema(created.id);
  await api.deleteEndpoint(created.id);

  return { endpointId: created.id };
}
