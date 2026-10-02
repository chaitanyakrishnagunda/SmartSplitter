# SplitSmart — AI-Powered Bill Splitting

SplitSmart lets groups upload a receipt, extract line items with AI, discuss splits in natural language, and get simplified balances. Built to make group expenses painless.


## What it does

- Upload receipt images (JPEG/PNG)
- AI receipt parsing with OpenAI vision — line items, prices, tax, total
- Chat-based split negotiation: natural language → structured split JSON
- Group balances with simplified debt settlement
- Google sign-in, groups, members

## AI details

- **Receipt parsing:** Vision model extracts structured items from receipt image. Prompt enforces JSON schema with fallback for low-confidence items.
- **Split chat:** User message like "Alice paid, Bob owes half of pizza" → LLM returns validated split JSON via Zod. Handles ambiguous requests by asking clarifying questions.
- **Reliability:** Structured outputs + validation to reduce hallucinations in amounts.

## Tech stack

- Next.js 14 (App Router), React 18, TypeScript
- Vercel AI SDK + OpenAI gpt-4o
- NextAuth (Google), Prisma + PostgreSQL
- Supabase Storage for receipt images
- Tailwind + shadcn/ui, Zod, Zustand

## How to run

1. Clone and install:
```
git clone https://github.com/chaitanyakrishnagunda/SmartSplitter.git
cd SmartSplitter
npm install
```

2. Set env (see `.env.example`):
```
DATABASE_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

3. Run:
```
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000

## Project structure

```
src/
  app/ — pages + API routes
    groups/[id]/ — group details, balances
    groups/[id]/bills/ — bill wizard, chat, confirm
    api/bills/parse — AI receipt parsing
    api/bills/[id]/chat — split negotiation
  components/ — UI
  lib/ — AI prompts, utils
prisma/ — schema
```

## Author

Chaitanya Krishna Gunda — MS Data Science, Stevens Institute of Technology. Focused on GenAI / LLM apps.
