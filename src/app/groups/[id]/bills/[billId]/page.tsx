import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { BillDetailChat } from "@/components/bill-detail-chat";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rawBillParseSchema } from "@/lib/schemas";

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string; billId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/api/auth/signin/google?callbackUrl=/dashboard");
  }

  const { id: groupId, billId } = await params;

  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id },
  });
  if (!member) {
    redirect("/dashboard");
  }

  const bill = await prisma.bill.findFirst({
    where: { id: billId, groupId },
    include: {
      paidBy: { select: { name: true, email: true } },
      splits: { orderBy: { memberNickname: "asc" } },
    },
  });

  if (!bill) {
    redirect(`/groups/${groupId}`);
  }

  const raw = rawBillParseSchema.safeParse(bill.rawItems);

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/groups/${groupId}`}>← Group</Link>
          </Button>
          <h1 className="text-lg font-semibold">Bill ${bill.totalAmount.toFixed(2)}</h1>
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              Paid by {bill.paidBy.name} ({bill.paidBy.email})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {bill.imageUrl ? (
              <p>
                <a
                  href={bill.imageUrl}
                  className="text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  View receipt image
                </a>
              </p>
            ) : null}
            <p className="text-muted-foreground">
              Created {bill.createdAt.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line items (saved)</CardTitle>
          </CardHeader>
          <CardContent>
            {raw.success ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {raw.data.items.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell>{it.name}</TableCell>
                      <TableCell className="text-right">
                        ${it.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Invalid saved items.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confirmed splits</CardTitle>
          </CardHeader>
          <CardContent>
            {bill.splits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No confirmed splits yet.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {bill.splits.map((s) => (
                  <li key={s.id} className="rounded-md border p-3">
                    <p className="font-medium">{s.memberNickname}</p>
                    <p className="text-muted-foreground">
                      Owes ${s.totalOwed.toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <BillDetailChat
          key={
            Array.isArray(bill.chatHistory)
              ? `${billId}-${bill.chatHistory.length}`
              : billId
          }
          billId={billId}
          initialHistory={bill.chatHistory}
        />
      </div>
    </div>
  );
}
