import { NextResponse } from "next/server";
import { z } from "zod";

import {
  computeNetBalances,
  sharesByPerson,
  simplifyDebts,
  type BillForBalance,
} from "@/lib/balances";
import { resolveUserToGroupNickname } from "@/lib/group-members";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: groupId } = await params;
  const paramCheck = paramsSchema.safeParse({ id: groupId });
  if (!paramCheck.success) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  const bills = await prisma.bill.findMany({
    where: { groupId },
    include: {
      paidBy: { select: { id: true, name: true } },
      splits: {
        select: { memberNickname: true, totalOwed: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const billPayloads: BillForBalance[] = await Promise.all(
    bills.map(async (b) => {
      const payerNickname = await resolveUserToGroupNickname(
        groupId,
        b.paidBy.id,
        b.paidBy.name,
      );
      return {
        id: b.id,
        totalAmount: b.totalAmount,
        paidByUserId: b.paidBy.id,
        payerNickname,
        splits: b.splits.map((s) => ({
          memberNickname: s.memberNickname,
          totalOwed: s.totalOwed,
        })),
      };
    }),
  );

  const netMap = computeNetBalances(billPayloads);
  const memberRows = await prisma.groupMember.findMany({
    where: { groupId },
    select: { nickname: true },
  });
  const uniqueNicknames = [...new Set(memberRows.map((m) => m.nickname))];
  for (const nickname of uniqueNicknames) {
    if (!netMap.has(nickname)) netMap.set(nickname, 0);
  }
  const netBalances = Array.from(netMap.entries())
    .map(([nickname, net]) => ({
      nickname,
      netBalance: Math.round(net * 100) / 100,
    }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname));

  const simplified = simplifyDebts(netMap).map((e) => ({
    from: e.from,
    to: e.to,
    amount: e.amount,
  }));

  const shareMap = sharesByPerson(billPayloads);
  const perPersonBills = Object.fromEntries(
    Array.from(shareMap.entries()).map(([nickname, rows]) => [
      nickname,
      rows.map((r) => ({
        billId: r.billId,
        share: r.totalOwed,
        billTotal: r.billTotal,
        payerNickname: r.payerNickname,
      })),
    ]),
  );

  return NextResponse.json({
    netBalances,
    simplifiedDebts: simplified,
    perPersonBillBreakdown: perPersonBills,
  });
}
