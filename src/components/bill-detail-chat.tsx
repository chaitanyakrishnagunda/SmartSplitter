"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatSplitPreviewLines } from "@/lib/split-preview";
import { chatHistorySchema, splitLlmResponseSchema } from "@/lib/schemas";

type ChatRow = { role: "user" | "assistant" | "system"; content: string };

function displayContent(content: string): string {
  try {
    const parsed = splitLlmResponseSchema.safeParse(
      JSON.parse(content) as unknown,
    );
    if (parsed.success) {
      return formatSplitPreviewLines(parsed.data).join("\n");
    }
  } catch {
    /* not JSON */
  }
  return content;
}

export function BillDetailChat({
  billId,
  initialHistory,
}: {
  billId: string;
  initialHistory: unknown;
}) {
  const router = useRouter();
  const [history, setHistory] = useState<ChatRow[]>(() => {
    const p = chatHistorySchema.safeParse(initialHistory);
    return p.success ? p.data : [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = chatHistorySchema.safeParse(initialHistory);
    setHistory(p.success ? p.data : []);
  }, [initialHistory]);

  const lastSplit = useMemo(() => {
    const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return null;
    try {
      const parsed = splitLlmResponseSchema.safeParse(
        JSON.parse(lastAssistant.content) as unknown,
      );
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }, [history]);

  async function onSend() {
    if (!input.trim()) return;
    setError(null);
    setLoading(true);
    const message = input.trim();
    setInput("");
    try {
      const res = await fetch(`/api/bills/${billId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Failed");
        setLoading(false);
        setInput(message);
        return;
      }

      router.refresh();
    } catch {
      setError("Network error");
      setInput(message);
    }
    setLoading(false);
  }

  async function onConfirm() {
    if (!lastSplit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/bills/${billId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastSplit),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(typeof j.error === "string" ? j.error : "Confirm failed");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-64 rounded-md border p-3">
          <ul className="space-y-3 text-sm">
            {history.map((m, i) => (
              <li key={i} className="whitespace-pre-wrap">
                <span className="font-medium">{m.role}: </span>
                {m.role === "assistant"
                  ? displayContent(m.content)
                  : m.content}
              </li>
            ))}
          </ul>
        </ScrollArea>
        <p className="text-xs text-muted-foreground">
          Assistant rows that contain a split show a short note here; raw JSON is
          stored for the model.
        </p>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Refine the split…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
          />
          <Button
            type="button"
            disabled={loading || !input.trim()}
            onClick={() => void onSend()}
          >
            Send
          </Button>
        </div>
        {lastSplit ? (
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            Confirm latest split
          </Button>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
