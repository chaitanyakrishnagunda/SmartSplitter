import type { SplitLlmResponse } from "@/lib/schemas";

export function formatSplitPreviewLines(split: SplitLlmResponse): string[] {
  const lines: string[] = [];
  for (const s of split.splits) {
    const itemStr = s.items
      .map((i) => `${i.name} $${i.amount.toFixed(2)}`)
      .join(", ");
    lines.push(`${s.person} gets: ${itemStr}. Subtotal: $${s.subtotal.toFixed(2)}`);
  }
  const payer = split.paidBy;
  lines.push(`Total paid by ${payer}: $${split.totalAmount.toFixed(2)}`);
  for (const s of split.splits) {
    if (s.person === payer) {
      const othersOwe = split.splits
        .filter((x) => x.person !== payer)
        .reduce((a, x) => a + x.subtotal, 0);
      lines.push(
        `${payer} is owed $${othersOwe.toFixed(2)} (they paid the bill).`,
      );
    } else {
      lines.push(`${s.person} owes ${payer} $${s.subtotal.toFixed(2)}`);
    }
  }
  return lines;
}
