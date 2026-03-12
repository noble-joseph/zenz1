import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseEnvSafe } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const pub = getPublicSupabaseEnvSafe();
  if (!pub) {
    return null;
  }
  return createBrowserClient(pub.url, pub.anonKey);
}

