"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Sends a connection request to another creator.
 */
export async function sendConnectionRequest(receiverId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Prevent self-connection (redundant due to DB constraint but good practice)
  if (user.id === receiverId) {
    return { success: false, error: "Cannot connect with yourself" };
  }

  const { error } = await supabase
    .from("connections")
    .upsert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: "pending"
    });

  if (error) {
    console.error("sendConnectionRequest error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/[slug]", "layout");
  return { success: true };
}

/**
 * Accepts a connection request.
 */
export async function acceptConnectionRequest(senderId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("connections")
    .update({ status: "accepted" })
    .eq("sender_id", senderId)
    .eq("receiver_id", user.id);

  if (error) {
    console.error("acceptConnectionRequest error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/[slug]", "layout");
  return { success: true };
}

/**
 * Sends a direct message to a creator.
 */
export async function sendMessage(receiverId: string, content: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("messages")
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content
    });

  if (error) {
    console.error("sendMessage error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Checks if two users are connected.
 */
export async function getConnectionStatus(userIdA: string, userIdB: string) {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from("connections")
      .select("status, sender_id")
      .or(`and(sender_id.eq.${userIdA},receiver_id.eq.${userIdB}),and(sender_id.eq.${userIdB},receiver_id.eq.${userIdA})`)
      .single();

    if (error && error.code !== 'PGRST116') {
        return { status: null, error: error.message };
    }

    return { 
        status: data?.status || null, 
        isSender: data?.sender_id === userIdA 
    };
}
