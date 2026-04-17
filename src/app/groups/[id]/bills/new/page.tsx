import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { BillWizard } from "@/components/bill-wizard";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/api/auth/signin/google?callbackUrl=/dashboard");
  }

  const { id: groupId } = await params;

  const ok = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
  });
  if (!ok) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/groups/${groupId}`}>← Group</Link>
          </Button>
          <h1 className="text-lg font-semibold">New bill</h1>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <BillWizard groupId={groupId} />
      </div>
    </div>
  );
}
