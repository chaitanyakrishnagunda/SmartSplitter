import { create } from "zustand";

import type { RawBillParse, SplitLlmResponse } from "@/lib/schemas";

export type WizardStep = 1 | 2 | 3;

type BillWizardState = {
  step: WizardStep;
  groupId: string | null;
  billId: string | null;
  imageUrl: string | null;
  rawItems: RawBillParse | null;
  lastSplit: SplitLlmResponse | null;
  setStep: (s: WizardStep) => void;
  setGroupId: (id: string) => void;
  setBillId: (id: string | null) => void;
  setImageUrl: (url: string | null) => void;
  setRawItems: (r: RawBillParse | null) => void;
  setLastSplit: (s: SplitLlmResponse | null) => void;
  reset: () => void;
};

const initial = {
  step: 1 as WizardStep,
  groupId: null as string | null,
  billId: null as string | null,
  imageUrl: null as string | null,
  rawItems: null as RawBillParse | null,
  lastSplit: null as SplitLlmResponse | null,
};

export const useBillWizardStore = create<BillWizardState>((set) => ({
  ...initial,
  setStep: (step) => set({ step }),
  setGroupId: (groupId) => set({ groupId }),
  setBillId: (billId) => set({ billId }),
  setImageUrl: (imageUrl) => set({ imageUrl }),
  setRawItems: (rawItems) => set({ rawItems }),
  setLastSplit: (lastSplit) => set({ lastSplit }),
  reset: () => set(initial),
}));
