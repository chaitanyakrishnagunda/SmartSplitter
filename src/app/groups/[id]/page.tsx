import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AddMemberForm } from "@/components/add-member-form";
import { GroupBalancesPanel } from "@/components/group-balances-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/api/auth/signin/google?callbackUrl=/dashboard");
  }

  const { id: groupId } = await params;

  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: { orderBy: { nickname: "asc" } },
      bills: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          totalAmount: true,
          createdAt: true,
          _count: { select: { splits: true } },
        },
      },
    },
  });

  if (!group) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-4">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">← Dashboard</Link>
            </Button>
            <h1 className="text-xl font-semibold mt-1">{group.name}</h1>
          </div>
          <Button asChild>
            <Link href={`/groups/${groupId}/bills/new`}>New bill</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              People in this group. Display-only members do not need an account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="flex flex-wrap gap-2">
              {group.members.map((m) => (
                <li
                  key={m.id}
                  className="rounded-full bg-secondary px-3 py-1 text-sm"
                >
                  {m.nickname}
                  {m.userId ? " (linked)" : ""}
                </li>
              ))}
            </ul>
            <AddMemberForm groupId={groupId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balances</CardTitle>
            <CardDescription>
              Simplified debts across all bills with confirmed splits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GroupBalancesPanel groupId={groupId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bills</CardTitle>
            <CardDescription>Recent bills in this group.</CardDescription>
          </CardHeader>
          <CardContent>
            {group.bills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bills yet.</p>
            ) : (
              <ul className="space-y-2">
                {group.bills.map((b) => (
                  <li key={b.id}>
                    <Button variant="outline" className="w-full justify-between" asChild>
                      <Link href={`/groups/${groupId}/bills/${b.id}`}>
                        <span>
                          ${b.totalAmount.toFixed(2)}
                          {b._count.splits > 0
                            ? ` · ${b._count.splits} splits`
                            : " · draft"}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {b.createdAt.toLocaleDateString()}
                        </span>
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
