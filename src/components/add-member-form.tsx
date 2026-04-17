"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddMemberForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      if (!res.ok) {
        setError("Could not add member");
        setLoading(false);
        return;
      }
      setNickname("");
      router.refresh();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="member-nick">Display name</Label>
        <Input
          id="member-nick"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Alice"
          required
          maxLength={80}
        />
      </div>
      <Button type="submit" disabled={loading || !nickname.trim()}>
        {loading ? "Adding…" : "Add member"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive sm:w-full">{error}</p>
      ) : null}
    </form>
  );
}
