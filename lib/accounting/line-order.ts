import type { AccountingLine } from "@/lib/api/types";

/** Premier lineOrder libre (>= 1), en réutilisant les trous après suppression. */
export function nextFreeLineOrder(
  lines: Pick<AccountingLine, "lineOrder">[],
): number {
  const used = new Set(lines.map((l) => l.lineOrder));
  let n = 1;
  while (used.has(n)) n += 1;
  return n;
}

/** Ligne qui occupe déjà cet ordre (hors ligne en cours d'édition). */
export function findLineOrderConflict(
  lines: Pick<AccountingLine, "id" | "lineOrder" | "label">[],
  lineOrder: number,
  excludeLineId?: string | null,
): Pick<AccountingLine, "id" | "lineOrder" | "label"> | undefined {
  return lines.find(
    (l) =>
      l.lineOrder === lineOrder &&
      (!excludeLineId || l.id !== excludeLineId),
  );
}

export function lineOrderConflictMessage(
  order: number,
  conflictingLabel?: string | null,
): string {
  const label = conflictingLabel?.trim() || "sans libellé";
  return `L'ordre ${order} est déjà utilisé par la ligne « ${label} ».`;
}
