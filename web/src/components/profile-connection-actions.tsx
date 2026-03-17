"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, MessageSquare, Clock, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { sendConnectionRequest } from "@/app/actions/connections";
import type { ConnectionStatus } from "@/lib/types/database";

interface ProfileConnectionActionsProps {
  targetId: string;
  initialStatus: ConnectionStatus | null;
  isSender: boolean;
}

export function ProfileConnectionActions({ 
  targetId, 
  initialStatus, 
  isSender: initialIsSender 
}: ProfileConnectionActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus | null>(initialStatus);
  const [isPending, setIsPending] = useState(false);

  const handleConnect = async () => {
    setIsPending(true);
    const result = await sendConnectionRequest(targetId);
    if (result.success) {
      setStatus('pending');
      toast.success("Connection request sent!");
    } else {
      toast.error(result.error || "Failed to send request");
    }
    setIsPending(false);
  };

  return (
    <div className="flex gap-2">
      {status === 'accepted' ? (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 py-1.5 px-3 gap-1.5">
          <ShieldCheck className="h-4 w-4" /> Connected
        </Badge>
      ) : status === 'pending' ? (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 py-1.5 px-3 gap-1.5">
          <Clock className="h-4 w-4" /> {initialIsSender ? 'Request Sent' : 'Request Received'}
        </Badge>
      ) : (
        <Button 
          size="sm" 
          onClick={handleConnect}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 h-9 rounded-xl gap-2 shadow-sm"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Connect
        </Button>
      )}
      <Button 
        size="sm" 
        variant="outline" 
        className="h-9 rounded-xl gap-2 border-zinc-200"
        onClick={() => router.push(`/dashboard/messages?to=${targetId}`)}
      >
        <MessageSquare className="h-4 w-4" /> Message
      </Button>
    </div>
  );
}
