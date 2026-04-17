import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { getGroupMemberNicknames } from "@/lib/group-members";
import { runSplitChatTurn } from "@/lib/llm/chat-split";
import { prisma } from "@/lib/prisma";
import {
  chatHistorySchema,
  rawBillParseSchema,
  splitLlmResponseSchema,
} from "@/lib/schemas";

const paramsSchema = z.object({ id: z.string().min(1) });

const chatBodySchema = z.object({
  message: z.string().min(1).max(8000),
});

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

  const parsedBody = chatBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { group: true },
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

  const historyParse = chatHistorySchema.safeParse(bill.chatHistory);
  const history = historyParse.success ? [...historyParse.data] : [];

  const userTurn = { role: "user" as const, content: parsedBody.data.message };
  const historyForModel = [...history, userTurn];

  const groupMembers = await getGroupMemberNicknames(bill.groupId);

  let splitResult: z.infer<typeof splitLlmResponseSchema>;
  try {
    splitResult = await runSplitChatTurn({
      billItems: rawParsed.data,
      groupMembers,
      chatHistory: historyForModel,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "LLM failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const assistantContent = JSON.stringify(splitResult);

  await prisma.bill.update({
    where: { id: billId },
    data: {
      chatHistory: [
        ...history.map((m) => ({ ...m })),
        userTurn,
        { role: "assistant" as const, content: assistantContent },
      ],
    },
  });

  return NextResponse.json({ split: splitResult });
}
