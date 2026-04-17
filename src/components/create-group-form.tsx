"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { id?: string; error?: unknown };
      if (!res.ok) {
        setError("Could not create group");
        setLoading(false);
        return;
      }
      if (data.id) {
        router.push(`/groups/${data.id}`);
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="group-name">Group name</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Roommates, Trip, …"
          required
          maxLength={120}
        />
      </div>
      <Button type="submit" disabled={loading || !name.trim()}>
        {loading ? "Creating…" : "Create"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive sm:w-full">{error}</p>
      ) : null}
    </form>
  );
}
