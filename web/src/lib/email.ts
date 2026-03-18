import emailjs from "@emailjs/browser";

export async function sendInquiryNotification(params: {
  creatorEmail: string;
  inquirerName: string;
  inquirerEmail: string;
  message: string;
}) {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.error("EmailJS credentials are not fully configured in env.");
    return false;
  }

  try {
    emailjs.init(publicKey);

    const response = await emailjs.send(serviceId, templateId, {
      to_email: params.creatorEmail,
      reply_to: params.inquirerEmail,
      inquirer_name: params.inquirerName,
      inquirer_email: params.inquirerEmail,
      message: params.message,
    });

    return response.status === 200;
  } catch (error) {
    console.error("Failed to send inquiry notification via EmailJS:", error);
    return false;
  }
}
