import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            SplitSmart
          </CardTitle>
          <CardDescription>
            Upload bills, split with natural language, and settle up fairly.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/api/auth/signin/google?callbackUrl=/dashboard">
              Continue with Google
            </Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Sign in with your Google account to create groups and share bills.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
