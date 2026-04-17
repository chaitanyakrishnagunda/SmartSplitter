"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type NetRow = { nickname: string; netBalance: number };
type Edge = { from: string; to: string; amount: number };
type BreakdownEntry = {
  billId: string;
  share: number;
  billTotal: number;
  payerNickname: string;
};

type BalancesPayload = {
  netBalances: NetRow[];
  simplifiedDebts: Edge[];
  perPersonBillBreakdown: Record<string, BreakdownEntry[]>;
};

export function GroupBalancesPanel({ groupId }: { groupId: string }) {
  const [data, setData] = useState<BalancesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/balances`);
        if (!res.ok) {
          if (!cancelled) setError("Could not load balances");
          return;
        }
        const json = (await res.json()) as BalancesPayload;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading balances…</p>;
  }

  const toggle = (key: string) =>
    setExpanded((e) => ({ ...e, [key]: !e[key] }));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Who owes whom</h3>
        {data.simplifiedDebts.length === 0 ? (
          <p className="text-sm text-muted-foreground">All settled in this group.</p>
        ) : (
          <ul className="space-y-2">
            {data.simplifiedDebts.map((e, i) => (
              <li key={`${e.from}-${e.to}-${i}`}>
                <Card>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base font-medium">
                        {e.from} → {e.to}: ${e.amount.toFixed(2)}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        type="button"
                        onClick={() =>
                          toggle(`${e.from}->${e.to}`)
                        }
                        aria-expanded={expanded[`${e.from}->${e.to}`]}
                      >
                        {expanded[`${e.from}->${e.to}`] ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="sr-only">Toggle per-bill breakdown</span>
                      </Button>
                    </div>
                  </CardHeader>
                  {expanded[`${e.from}->${e.to}`] ? (
                    <CardContent className="pt-0 text-sm text-muted-foreground space-y-2">
                      <BreakdownRows
                        debtor={e.from}
                        creditor={e.to}
                        amount={e.amount}
                        breakdown={data.perPersonBillBreakdown}
                      />
                    </CardContent>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Net balances</h3>
        <ul className="space-y-1 text-sm">
          {data.netBalances.map((n) => (
            <li key={n.nickname} className="flex justify-between gap-4">
              <span>{n.nickname}</span>
              <span>
                {n.netBalance > 0.005
                  ? `Owed $${n.netBalance.toFixed(2)}`
                  : n.netBalance < -0.005
                    ? `Owes $${Math.abs(n.netBalance).toFixed(2)}`
                    : "Even"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BreakdownRows({
  debtor,
  creditor,
  amount,
  breakdown,
}: {
  debtor: string;
  creditor: string;
  amount: number;
  breakdown: Record<string, BreakdownEntry[]>;
}) {
  const debtorBills = breakdown[debtor] ?? [];
  const relevant = debtorBills.filter((b) => b.payerNickname === creditor);
  if (relevant.length === 0) {
    return (
      <p>
        Simplified from multiple bills — your share on bills paid by {creditor}{" "}
        sums to ${amount.toFixed(2)} for {debtor}.
      </p>
    );
  }
  return (
    <ul className="list-disc pl-4 space-y-1">
      {relevant.map((b) => (
        <li key={b.billId}>
          Bill {b.billId.slice(0, 8)}… — share ${b.share.toFixed(2)} (bill total $
          {b.billTotal.toFixed(2)}, paid by {b.payerNickname})
        </li>
      ))}
    </ul>
  );
}
