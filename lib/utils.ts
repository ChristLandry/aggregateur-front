import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | string,
  currency: string = "XOF",
  locale: string = "fr-FR",
): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toLocaleString(locale)} ${currency}`;
  }
}

export function formatNumber(value: number, locale: string = "fr-FR"): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(value: string | Date, pattern = "dd/MM/yyyy HH:mm"): string {
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return format(d, pattern);
  } catch {
    return String(value);
  }
}

export function formatDateShort(value: string | Date): string {
  return formatDate(value, "dd/MM/yyyy");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Returns a truncated ID like "a1b2c3d4…" — safe against null/undefined.
 * Use this anywhere we display a partial UUID.
 */
export function shortId(id: string | null | undefined, length = 8): string {
  if (!id) return "—";
  if (id.length <= length) return id;
  return `${id.slice(0, length)}…`;
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}

/**
 * Returns only the fields that were marked dirty by react-hook-form.
 * Used to build PATCH payloads that omit untouched fields.
 */
export function dirtyValues<T extends Record<string, unknown>>(
  dirtyFields: Partial<Record<keyof T, boolean | object>>,
  values: T,
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(dirtyFields) as (keyof T)[]) {
    if (dirtyFields[key]) {
      out[key] = values[key];
    }
  }
  return out;
}
