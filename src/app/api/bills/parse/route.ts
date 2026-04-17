import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { parseBillImage } from "@/lib/llm/parse-bill";
import { prisma } from "@/lib/prisma";
import { rawBillParseSchema } from "@/lib/schemas";

const visionSchema = z.object({
  kind: z.literal("vision"),
  imageUrl: z.string().url(),
  groupId: z.string().min(1),
});

const saveSchema = rawBillParseSchema.extend({
  kind: z.literal("save"),
  billId: z.string().min(1),
});

const bodySchema = z.discriminatedUnion("kind", [visionSchema, saveSchema]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.kind === "save") {
    const bill = await prisma.bill.findUnique({
      where: { id: parsed.data.billId },
      select: { id: true, groupId: true, paidById: true },
    });
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const canEdit = await prisma.groupMember.findFirst({
      where: { groupId: bill.groupId, userId: session.user.id },
    });

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = {
      items: parsed.data.items,
      subtotal: parsed.data.subtotal,
      tax: parsed.data.tax,
      total: parsed.data.total,
    };

    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        rawItems: raw,
        totalAmount: parsed.data.total,
      },
    });

    return NextResponse.json({
      billId: bill.id,
      rawItems: raw,
    });
  }

  const inGroup = await prisma.groupMember.findFirst({
    where: { groupId: parsed.data.groupId, userId: session.user.id },
  });
  if (!inGroup) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let rawItems: z.infer<typeof rawBillParseSchema>;
  try {
    rawItems = await parseBillImage(parsed.data.imageUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const bill = await prisma.bill.create({
    data: {
      groupId: parsed.data.groupId,
      paidById: session.user.id,
      totalAmount: rawItems.total,
      imageUrl: parsed.data.imageUrl,
      rawItems: rawItems,
      chatHistory: [],
    },
  });

  return NextResponse.json({
    billId: bill.id,
    rawItems,
  });
}
