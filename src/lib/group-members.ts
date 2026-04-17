import { prisma } from "@/lib/prisma";

export async function getGroupMemberNicknames(groupId: string): Promise<string[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { nickname: true },
    orderBy: { nickname: "asc" },
  });
  return members.map((m) => m.nickname);
}

export async function resolveUserToGroupNickname(
  groupId: string,
  userId: string,
  userName: string,
): Promise<string> {
  const linked = await prisma.groupMember.findFirst({
    where: { groupId, userId },
    select: { nickname: true },
  });
  if (linked) return linked.nickname;
  return userName;
}
