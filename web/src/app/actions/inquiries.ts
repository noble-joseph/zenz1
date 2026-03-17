"use server";

import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendInquiryNotification } from "@/lib/email";

export async function submitInquiryAction(payload: {
  creator_id: string;
  hirer_name: string;
  hirer_email: string;
  message: string;
}) {
  const supabase = await createSupabaseServerClient();

  // 1. Save inquiry to database (RLS ensures anyone can insert)
  const { error: insertError } = await supabase
    .from("inquiries")
    .insert(payload);

  if (insertError) {
    return { error: insertError.message };
  }

  // 2. Fetch the creator's registered email using Service Role (bypassing RLS on auth schema)
  const adminClient = createSupabaseAdminClient();
  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(payload.creator_id);

  if (userError || !userData?.user?.email) {
    console.warn("Could not retrieve creator email for notification.", userError);
    // Silent fail for notification so the UI still shows success for saving to DB.
    return { success: true };
  }

  const creatorEmail = userData.user.email;

  // 3. Send the email notification
  const emailSent = await sendInquiryNotification({
    creatorEmail,
    inquirerName: payload.hirer_name,
    inquirerEmail: payload.hirer_email,
    message: payload.message,
  });

  if (!emailSent) {
    console.warn("Inquiry was saved, but email notification failed.");
  }

  return { success: true };
}
