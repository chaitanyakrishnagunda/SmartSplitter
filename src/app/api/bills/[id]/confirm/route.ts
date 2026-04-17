import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getGroupMemberNicknames } from "@/lib/group-members";
import { prisma } from "@/lib/prisma";
import { rawBillParseSchema, splitLlmResponseSchema } from "@/lib/schemas";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: billId } = await params;
  if (!paramsSchema.safeParse({ id: billId }).success) {
    return NextResponse.json({ error: "Invalid bill id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const splitParsed = splitLlmResponseSchema.safeParse(body);
  if (!splitParsed.success) {
    return NextResponse.json(
      { error: splitParsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
  });
  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  const member = await prisma.groupMember.findFirst({
    where: { groupId: bill.groupId, userId: session.user.id },
  });
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawParsed = rawBillParseSchema.safeParse(bill.rawItems);
  if (!rawParsed.success) {
    return NextResponse.json(
      { error: "Bill has invalid rawItems" },
      { status: 400 },
    );
  }

  const nicknames = new Set(await getGroupMemberNicknames(bill.groupId));
  const { splits, paidBy, totalAmount } = splitParsed.data;

  if (!nicknames.has(paidBy)) {
    return NextResponse.json(
      { error: "paidBy must match a group member name" },
      { status: 400 },
    );
  }

  for (const s of splits) {
    if (!nicknames.has(s.person)) {
      return NextResponse.json(
        { error: `Unknown person in splits: ${s.person}` },
        { status: 400 },
      );
    }
  }

  const sumSplits = splits.reduce((acc, s) => acc + s.subtotal, 0);
  if (Math.abs(sumSplits - totalAmount) > 0.05) {
    return NextResponse.json(
      { error: "Split subtotals must sum to totalAmount" },
      { status: 400 },
    );
  }

  if (Math.abs(totalAmount - rawParsed.data.total) > 0.05) {
    return NextResponse.json(
      { error: "totalAmount must match bill total" },
      { status: 400 },
    );
  }

  const payerMember = await prisma.groupMember.findFirst({
    where: { groupId: bill.groupId, nickname: paidBy },
  });
  const paidById = payerMember?.userId ?? bill.paidById;

  await prisma.$transaction(async (tx) => {
    await tx.bill.update({
      where: { id: billId },
      data: { paidById },
    });
    await tx.split.deleteMany({ where: { billId } });
    await tx.split.createMany({
      data: splits.map((s) => ({
        billId,
        memberNickname: s.person,
        items: s.items,
        totalOwed: s.subtotal,
      })),
    });
  });

  return NextResponse.json({ ok: true });
}
