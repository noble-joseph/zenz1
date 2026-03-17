"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Accepts (verifies) a collaboration credit.
 * The tagged creator confirms that they participated in the project.
 */
export async function acceptCollaboration(collaborationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("collaborations")
    .update({ status: "verified" })
    .eq("id", collaborationId)
    .eq("creator_id", user.id); // RLS + explicit check: only the tagged creator can verify

  if (error) {
    console.error("acceptCollaboration error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/credits");
  return { success: true };
}

/**
 * Rejects a collaboration credit.
 * The tagged creator declines the credit.
 */
export async function rejectCollaboration(collaborationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("collaborations")
    .update({ status: "rejected" })
    .eq("id", collaborationId)
    .eq("creator_id", user.id);

  if (error) {
    console.error("rejectCollaboration error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/credits");
  return { success: true };
}
