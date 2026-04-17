import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

import { extractJsonObject } from "@/lib/llm/json-extract";
import { rawBillParseSchema, type RawBillParse } from "@/lib/schemas";

const PARSE_SYSTEM =
  "Extract all line items from this bill. Return ONLY valid JSON: { items: [{name: string, amount: number}], subtotal: number, tax: number, total: number }. No explanation.";

function getModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const openai = createOpenAI({ apiKey });
  return openai("gpt-4o");
}

export async function parseBillImage(imageUrl: string): Promise<RawBillParse> {
  const model = getModel();

  const runOnce = async () => {
    const { text } = await generateText({
      model,
      system: PARSE_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Parse this bill image." },
            { type: "image", image: imageUrl },
          ],
        },
      ],
    });
    const json = extractJsonObject(text);
    return rawBillParseSchema.parse(JSON.parse(json));
  };

  try {
    return await runOnce();
  } catch {
    return await runOnce();
  }
}
