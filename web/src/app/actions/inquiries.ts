"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export async function submitInquiryAction(payload: {
  creator_id: string;
  hirer_name: string;
  hirer_email: string;
  message: string;
}) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { error: "Supabase client not initialized" };

  const { error } = await supabase
    .from("inquiries")
    .insert(payload);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
