import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { CreateGroupForm } from "@/components/create-group-form";
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

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/api/auth/signin/google?callbackUrl=/dashboard");
  }

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {session.user.email}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/api/auth/signout?callbackUrl=/">Sign out</Link>
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>New group</CardTitle>
            <CardDescription>Create a group to start splitting bills.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateGroupForm />
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-medium mb-3">Your groups</h2>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No groups yet. Create one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {groups.map((g) => (
                <li key={g.id}>
                  <Button variant="secondary" className="w-full justify-start" asChild>
                    <Link href={`/groups/${g.id}`}>{g.name}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
