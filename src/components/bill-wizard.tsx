"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatSplitPreviewLines } from "@/lib/split-preview";
import type { RawBillParse, SplitLlmResponse } from "@/lib/schemas";
import { useBillWizardStore } from "@/stores/bill-wizard-store";

export function BillWizard({ groupId }: { groupId: string }) {
  const router = useRouter();
  const {
    step,
    billId,
    imageUrl,
    rawItems,
    lastSplit,
    setStep,
    setGroupId,
    setBillId,
    setImageUrl,
    setRawItems,
    setLastSplit,
  } = useBillWizardStore();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    setGroupId(groupId);
  }, [groupId, setGroupId]);

  async function onUploadAndParse() {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.set("groupId", groupId);
      fd.set("file", file);
      const up = await fetch("/api/bills/upload", { method: "POST", body: fd });
      if (!up.ok) {
        const j = (await up.json()) as { error?: string };
        setError(j.error ?? "Upload failed");
        setLoading(false);
        return;
      }
      const { imageUrl: url } = (await up.json()) as { imageUrl: string };
      setImageUrl(url);

      const pr = await fetch("/api/bills/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "vision",
          imageUrl: url,
          groupId,
        }),
      });
      if (!pr.ok) {
        const j = (await pr.json()) as { error?: string };
        setError(j.error ?? "Parse failed");
        setLoading(false);
        return;
      }
      const data = (await pr.json()) as {
        billId: string;
        rawItems: RawBillParse;
      };
      setBillId(data.billId);
      setRawItems(data.rawItems);
      setStep(2);
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function onSaveItemsContinue() {
    if (!billId || !rawItems) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bills/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "save",
          billId,
          ...rawItems,
        }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Save failed");
        setLoading(false);
        return;
      }
      setStep(3);
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function onSendChat() {
    if (!billId || !chatInput.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/bills/${billId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput.trim() }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Chat failed");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { split: SplitLlmResponse };
      setLastSplit(data.split);
      setChatInput("");
      router.refresh();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  async function onConfirm() {
    if (!billId || !lastSplit) return;
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
      router.push(`/groups/${groupId}/bills/${billId}`);
      router.refresh();
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  function updateItem(idx: number, field: "name" | "amount", value: string) {
    if (!rawItems) return;
    const items = [...rawItems.items];
    const row = { ...items[idx] };
    if (field === "name") row.name = value;
    else row.amount = parseFloat(value) || 0;
    items[idx] = row;
    setRawItems({ ...rawItems, items });
  }

  function updateTotals(field: "subtotal" | "tax" | "total", value: string) {
    if (!rawItems) return;
    const n = parseFloat(value) || 0;
    setRawItems({ ...rawItems, [field]: n });
  }

  return (
    <div className="space-y-6">
      <Tabs value={String(step)} onValueChange={(v) => setStep(Number(v) as 1 | 2 | 3)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="1">1. Upload</TabsTrigger>
          <TabsTrigger value="2" disabled={!billId}>
            2. Review items
          </TabsTrigger>
          <TabsTrigger value="3" disabled={!billId}>
            3. Split chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="1">
          <Card>
            <CardHeader>
              <CardTitle>Upload bill photo</CardTitle>
              <CardDescription>JPEG or PNG. We extract line items with GPT-4o.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {imageUrl ? (
                <p className="text-xs text-muted-foreground break-all">{imageUrl}</p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={!file || loading}
                  onClick={() => void onUploadAndParse()}
                >
                  {loading ? "Working…" : "Upload & parse"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/groups/${groupId}`}>Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="2">
          <Card>
            <CardHeader>
              <CardTitle>Review line items</CardTitle>
              <CardDescription>Fix any OCR mistakes before splitting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawItems?.items.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={row.name}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="text-right"
                          type="number"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) => updateItem(idx, "amount", e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-sm font-medium mb-1">Subtotal</p>
                  <Input
                    type="number"
                    step="0.01"
                    value={rawItems?.subtotal ?? ""}
                    onChange={(e) => updateTotals("subtotal", e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Tax</p>
                  <Input
                    type="number"
                    step="0.01"
                    value={rawItems?.tax ?? ""}
                    onChange={(e) => updateTotals("tax", e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Total</p>
                  <Input
                    type="number"
                    step="0.01"
                    value={rawItems?.total ?? ""}
                    onChange={(e) => updateTotals("total", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={!rawItems || loading}
                  onClick={() => void onSaveItemsContinue()}
                >
                  {loading ? "Saving…" : "Continue to split"}
                </Button>
                <Button variant="outline" type="button" onClick={() => setStep(1)}>
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="3">
          <Card>
            <CardHeader>
              <CardTitle>Describe your split</CardTitle>
              <CardDescription>
                Example: “Split tomatoes between Alice and Bob. Total paid by
                Alice.”
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-48 rounded-md border p-3">
                {lastSplit ? (
                  <ul className="text-sm space-y-2">
                    {formatSplitPreviewLines(lastSplit).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Send a message to get a proposed split.
                  </p>
                )}
              </ScrollArea>
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type how to split…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void onSendChat();
                    }
                  }}
                />
                <Button
                  type="button"
                  disabled={loading || !chatInput.trim()}
                  onClick={() => void onSendChat()}
                >
                  Send
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!lastSplit || loading}
                  onClick={() => void onConfirm()}
                >
                  Confirm split
                </Button>
                <Button variant="outline" type="button" onClick={() => setStep(2)}>
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
