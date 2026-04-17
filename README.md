# SplitSmart

AI-powered bill splitting for groups.  
SplitSmart lets you upload receipt images, extract line items with AI, discuss split logic in natural language, confirm final splits, and view simplified balances.

## Features

- Google sign-in with `next-auth`
- Create groups and add members (including display-only members without accounts)
- Upload bill images (JPEG/PNG) to Supabase Storage
- AI receipt parsing using OpenAI vision model
- Chat-based split negotiation (natural language -> structured split JSON)
- Confirmed splits persisted per bill
- Group-level balance calculations with simplified debt recommendations

## Tech Stack

- **Frontend / App:** Next.js 14 (App Router), React 18, TypeScript
- **Auth:** NextAuth (Google Provider, JWT sessions)
- **Database:** PostgreSQL + Prisma
- **Storage:** Supabase Storage
- **AI:** Vercel AI SDK + OpenAI (`gpt-4o`)
- **UI:** Tailwind CSS + Radix UI + shadcn-style components
- **Validation / State:** Zod, Zustand

## Project Structure

```text
src/
  app/
    page.tsx                          # Landing + Google sign-in
    dashboard/page.tsx                # Group overview
    groups/[id]/page.tsx              # Group details, members, balances, bills
    groups/[id]/bills/new/page.tsx    # Bill creation wizard
    groups/[id]/bills/[billId]/page.tsx # Bill detail + chat + confirmed splits
    api/
      auth/[...nextauth]/route.ts
      groups/route.ts
      groups/[id]/members/route.ts
      groups/[id]/balances/route.ts
      bills/upload/route.ts
      bills/parse/route.ts
      bills/[id]/chat/route.ts
      bills/[id]/confirm/route.ts
  components/
  lib/
prisma/
  schema.prisma
