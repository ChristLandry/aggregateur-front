import { toast } from "sonner";
import { formatApiErrorForToast } from "./client";

export function notifySuccess(message: string): void {
  toast.success(message);
}

export function notifyError(error: unknown, fallback: string): void {
  toast.error(formatApiErrorForToast(error, fallback));
}
