import type { Default } from "next-auth";

declare module "next-auth" {
  interface Session extends Default.Session {
    user: Default.Session["user"] & {
      id: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}
