import { toast } from "sonner";
import { formatApiErrorForToast } from "./client";
import { isKnownPartnerApiError, isSilentPartnerApiError } from "./api-errors";

export function notifySuccess(message: string): void {
  toast.success(message);
}

export function notifyError(error: unknown, fallback: string): void {
  if (isSilentPartnerApiError(error)) return;
  if (isKnownPartnerApiError(error)) return;
  toast.error(formatApiErrorForToast(error, fallback));
}
