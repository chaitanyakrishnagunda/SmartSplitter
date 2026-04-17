import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      members: {
        create: {
          userId: session.user.id,
          nickname: session.user.name,
        },
      },
    },
  });

  return NextResponse.json({ id: group.id, name: group.name });
}
