import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({
  id: z.string().min(1),
});

const addMemberSchema = z.object({
  nickname: z.string().min(1, "Nickname is required").max(80),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;
  const paramCheck = paramsSchema.safeParse({ id: groupId });
  if (!paramCheck.success) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const member = await prisma.groupMember.create({
    data: {
      groupId,
      userId: null,
      nickname: parsed.data.nickname.trim(),
    },
  });

  return NextResponse.json({
    id: member.id,
    nickname: member.nickname,
  });
}
