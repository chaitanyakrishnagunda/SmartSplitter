import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

import { extractJsonObject } from "@/lib/llm/json-extract";
import {
  splitLlmResponseSchema,
  type RawBillParse,
  type SplitLlmResponse,
} from "@/lib/schemas";

function getModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const openai = createOpenAI({ apiKey });
  return openai("gpt-4o");
}

type ChatTurn = { role: "user" | "assistant" | "system"; content: string };

function buildSystemContext(
  billItems: RawBillParse,
  groupMembers: string[],
): string {
  const payload = {
    bill_items: billItems,
    group_members: groupMembers,
    instruction:
      'User will describe how to split items. Return ONLY valid JSON: { splits: [{person: string, items: [{name: string, amount: number}], subtotal: number}], paidBy: string, totalAmount: number }. Amounts must sum to bill total. Never hallucinate item names.',
  };
  return JSON.stringify(payload);
}

export async function runSplitChatTurn(params: {
  billItems: RawBillParse;
  groupMembers: string[];
  chatHistory: ChatTurn[];
}): Promise<SplitLlmResponse> {
  const model = getModel();
  const system = buildSystemContext(params.billItems, params.groupMembers);

  const messages = params.chatHistory.filter((m) => m.role !== "system");

  const runOnce = async () => {
    const { text } = await generateText({
      model,
      system,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
    const json = extractJsonObject(text);
    return splitLlmResponseSchema.parse(JSON.parse(json));
  };

  try {
    return await runOnce();
  } catch {
    return await runOnce();
  }
}
