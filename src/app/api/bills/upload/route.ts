import { randomUUID } from "crypto";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBillImagesBucket, getSupabaseAdmin } from "@/lib/supabase-admin";

const fieldSchema = z.object({
  groupId: z.string().min(1),
  file: z.instanceof(File),
});

async function parseMultipart(req: Request): Promise<z.infer<typeof fieldSchema>> {
  const form = await req.formData();
  const groupId = form.get("groupId");
  const file = form.get("file");
  if (typeof groupId !== "string" || !(file instanceof File)) {
    throw new Error("Invalid form");
  }
  return fieldSchema.parse({ groupId, file });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: z.infer<typeof fieldSchema>;
  try {
    data = await parseMultipart(req);
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form with groupId and file" },
      { status: 400 },
    );
  }

  const inGroup = await prisma.groupMember.findFirst({
    where: { groupId: data.groupId, userId: session.user.id },
  });
  if (!inGroup) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const type = data.file.type;
  if (type !== "image/jpeg" && type !== "image/png") {
    return NextResponse.json(
      { error: "Only JPEG or PNG images are allowed" },
      { status: 400 },
    );
  }

  const ext = type === "image/jpeg" ? "jpg" : "png";
  const path = `${data.groupId}/${session.user.id}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await data.file.arrayBuffer());

  const supabase = getSupabaseAdmin();
  const bucket = getBillImagesBucket();
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: type, upsert: false });

  if (upErr) {
    return NextResponse.json(
      { error: upErr.message ?? "Upload failed" },
      { status: 500 },
    );
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!pub?.publicUrl) {
    return NextResponse.json({ error: "Could not build public URL" }, { status: 500 });
  }

  return NextResponse.json({ imageUrl: pub.publicUrl });
}
