import { z } from "zod";

export const cuidSchema = z.string().min(1);

export const billLineItemSchema = z.object({
  name: z.string(),
  amount: z.number(),
});

export const rawBillParseSchema = z.object({
  items: z.array(billLineItemSchema),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
});

export const chatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const chatHistorySchema = z.array(chatHistoryMessageSchema);

export const splitResultItemSchema = z.object({
  name: z.string(),
  amount: z.number(),
});

export const splitResultPersonSchema = z.object({
  person: z.string(),
  items: z.array(splitResultItemSchema),
  subtotal: z.number(),
});

export const splitLlmResponseSchema = z.object({
  splits: z.array(splitResultPersonSchema),
  paidBy: z.string(),
  totalAmount: z.number(),
});

export type RawBillParse = z.infer<typeof rawBillParseSchema>;
export type SplitLlmResponse = z.infer<typeof splitLlmResponseSchema>;
