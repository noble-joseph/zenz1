"use client";

import { Share2, Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButton({ slug, label = "Share Portfolio" }: { slug: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    const url = `${window.location.origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Portfolio link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2"
      onClick={copyUrl}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {label}
    </Button>
  );
}
