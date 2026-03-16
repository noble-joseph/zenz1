"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { submitInquiryAction } from "@/app/actions/inquiries";

interface PublicInquiryFormProps {
  creatorId: string;
}

export function PublicInquiryForm({ creatorId }: PublicInquiryFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    const result = await submitInquiryAction({
      creator_id: creatorId,
      hirer_name: formData.name,
      hirer_email: formData.email,
      message: formData.message
    });

    if (result.success) {
      toast.success("Inquiry sent successfully!");
      setFormData({ name: "", email: "", message: "" });
    } else {
      toast.error(result.error || "Failed to send inquiry");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input 
          placeholder="Your Name" 
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40" 
          disabled={loading}
        />
        <Input 
          placeholder="Your Email" 
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40" 
          disabled={loading}
        />
      </div>
      <Textarea 
        placeholder="Tell me about your project..." 
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[120px]" 
        rows={4} 
        disabled={loading}
      />
      <Button 
        type="submit" 
        disabled={loading}
        className="w-full bg-white text-black hover:bg-zinc-200 h-11 font-bold rounded-xl"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {loading ? "Sending..." : "Send Inquiry"}
      </Button>
    </form>
  );
}
