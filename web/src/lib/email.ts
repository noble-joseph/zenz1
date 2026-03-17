import { env } from "process";

export async function sendInquiryNotification(params: {
  creatorEmail: string;
  inquirerName: string;
  inquirerEmail: string;
  message: string;
}) {
  const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
  const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.error("EmailJS credentials are not fully configured in env.");
    return false;
  }

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: params.creatorEmail,
          reply_to: params.inquirerEmail,
          inquirer_name: params.inquirerName,
          inquirer_email: params.inquirerEmail,
          message: params.message,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EmailJS responded with ${response.status}: ${errorText}`);
    }

    return true;
  } catch (error) {
    console.error("Failed to send inquiry notification via EmailJS:", error);
    return false;
  }
}
