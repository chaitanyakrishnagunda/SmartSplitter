export type SimplifiedEdge = {
  from: string;
  to: string;
  amount: number;
};

export type BillForBalance = {
  id: string;
  totalAmount: number;
  paidByUserId: string;
  payerNickname: string;
  splits: { memberNickname: string; totalOwed: number }[];
};

export type BillShareRow = {
  billId: string;
  totalOwed: number;
  billTotal: number;
  payerNickname: string;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Net: positive means the person is owed money overall; negative means they owe.
 */
export function computeNetBalances(bills: BillForBalance[]): Map<string, number> {
  const net = new Map<string, number>();

  const add = (person: string, delta: number) => {
    net.set(person, (net.get(person) ?? 0) + delta);
  };

  for (const bill of bills) {
    const payer = bill.payerNickname;
    for (const s of bill.splits) {
      if (s.memberNickname === payer) continue;
      add(s.memberNickname, -s.totalOwed);
      add(payer, s.totalOwed);
    }
  }

  return net;
}

/** Greedy simplified debts: largest debtor pays largest creditor until settled. */
export function simplifyDebts(net: Map<string, number>): SimplifiedEdge[] {
  const edges: SimplifiedEdge[] = [];
  const balances = Array.from(net.entries()).map(([person, v]) => ({
    person,
    balance: roundMoney(v),
  }));

  const creditors = balances
    .filter((b) => b.balance > 0.001)
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < -0.001)
    .sort((a, b) => a.balance - b.balance);

  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const pay = roundMoney(Math.min(c.balance, -d.balance));
    if (pay <= 0.001) break;
    edges.push({ from: d.person, to: c.person, amount: pay });
    c.balance = roundMoney(c.balance - pay);
    d.balance = roundMoney(d.balance + pay);
    if (c.balance <= 0.001) ci += 1;
    if (d.balance >= -0.001) di += 1;
  }
  return edges;
}

/** Per-person list of bill shares (for expandable UI). */
export function sharesByPerson(bills: BillForBalance[]): Map<string, BillShareRow[]> {
  const map = new Map<string, BillShareRow[]>();

  const push = (nickname: string, row: BillShareRow) => {
    const list = map.get(nickname) ?? [];
    list.push(row);
    map.set(nickname, list);
  };

  for (const bill of bills) {
    for (const s of bill.splits) {
      push(s.memberNickname, {
        billId: bill.id,
        totalOwed: s.totalOwed,
        billTotal: bill.totalAmount,
        payerNickname: bill.payerNickname,
      });
    }
  }

  return map;
}
