import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getBillImagesBucket(): string {
  const bucket = process.env.SUPABASE_BILL_IMAGES_BUCKET;
  if (!bucket) {
    throw new Error("Missing SUPABASE_BILL_IMAGES_BUCKET");
  }
  return bucket;
}
