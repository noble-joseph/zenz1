"use client";

import { useEffect, useState } from "react";
import { 
  Mail, 
  Search, 
  Inbox, 
  Send, 
  Trash2, 
  MoreHorizontal, 
  Filter,
  User,
  Clock,
  CheckCheck,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Message {
  id: string;
  creator_id: string;
  hirer_name: string;
  hirer_email: string;
  message: string;
  status: string;
  created_at: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void loadMessages();
  }, []);

  async function loadMessages() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
      if (data && data.length > 0) setSelectedId(data[0].id);
    } catch (err) {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  const filteredMessages = messages.filter(m => 
    m.hirer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMessage = messages.find(m => m.id === selectedId);

  return (
    <div className="h-[calc(100vh-2rem)] flex overflow-hidden rounded-[2.5rem] border-2 border-muted bg-background shadow-2xl">
      {/* Sidebar: Message List */}
      <div className="w-96 border-r flex flex-col bg-muted/5">
        <div className="p-6 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tighter">Messages</h1>
            <Badge variant="secondary" className="rounded-full px-3">{messages.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-10 h-11 rounded-xl bg-background border-none shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-muted/50">
            {loading ? (
               [1, 2, 3, 4].map(i => (
                 <div key={i} className="p-6 space-y-3 animate-pulse">
                   <div className="flex justify-between items-center">
                     <div className="h-4 w-24 bg-muted rounded" />
                     <div className="h-3 w-12 bg-muted rounded" />
                   </div>
                   <div className="h-3 w-full bg-muted rounded" />
                 </div>
               ))
            ) : filteredMessages.length === 0 ? (
               <div className="p-12 text-center text-muted-foreground">
                 <Inbox className="h-10 w-10 mx-auto mb-4 opacity-20" />
                 <p className="text-sm">No messages found</p>
               </div>
            ) : (
              filteredMessages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => setSelectedId(msg.id)}
                  className={`w-full text-left p-6 transition-all hover:bg-primary/5 relative group ${
                    selectedId === msg.id ? "bg-primary/5" : ""
                  }`}
                >
                  {selectedId === msg.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm truncate pr-4">{msg.hirer_name}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {msg.message}
                  </p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content: Message Detail */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {selectedId && selectedMessage ? (
          <>
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between bg-background/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary/10">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/5 text-primary text-lg font-bold">
                    {selectedMessage.hirer_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-black text-lg leading-tight">{selectedMessage.hirer_name}</h2>
                  <p className="text-xs text-muted-foreground font-medium">{selectedMessage.hirer_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="rounded-full">
                  <Clock className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full text-destructive hover:bg-destructive/5">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Conversation Flow */}
            <ScrollArea className="flex-1 p-8">
              <div className="max-w-2xl mx-auto space-y-8">
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                  <Sparkles className="h-8 w-8 mb-4 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">Inquiry Session Started</p>
                  <p className="text-[10px] mt-1">{new Date(selectedMessage.created_at).toLocaleString()}</p>
                </div>

                <div className="flex flex-col items-start gap-3">
                  <div className="bg-muted/30 p-6 rounded-3xl rounded-tl-none max-w-lg border">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-2 font-medium">Received via Portfolio</span>
                </div>

                {/* Response Area Placeholder */}
                <div className="flex flex-col items-end gap-3 opacity-50">
                   <div className="bg-primary text-primary-foreground p-6 rounded-3xl rounded-tr-none max-w-lg">
                      <p className="text-sm italic">You can reply to this inquiry directly via email at <span className="underline">{selectedMessage.hirer_email}</span></p>
                   </div>
                   <div className="flex items-center gap-2 mr-2">
                      <span className="text-[10px] font-medium">System Note</span>
                        <CheckCheck className="h-4 w-4 text-emerald-500" />
                   </div>
                </div>
              </div>
            </ScrollArea>

            {/* Input Bar */}
            <div className="p-6 bg-muted/5 border-t">
              <div className="max-w-4xl mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-4 bg-background p-2 rounded-xl border-2 border-muted focus-within:border-primary transition-all">
                  <Input 
                    placeholder="Type a message or use slash commands..." 
                    className="flex-1 h-12 border-none ring-0 focus-visible:ring-0 bg-transparent text-sm"
                  />
                  <Button className="h-12 w-12 rounded-lg shadow-xl" size="icon">
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 mt-3 px-2">
                   <button className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                      <Filter className="h-3 w-3" /> Templates
                   </button>
                   <button className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" /> AI Assistant
                   </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             <div className="h-32 w-32 rounded-[2.5rem] bg-muted/10 flex items-center justify-center mb-8 border-4 border-dashed animate-pulse">
                <Mail className="h-16 w-16 text-muted-foreground opacity-20" />
             </div>
             <h2 className="text-3xl font-black tracking-tighter mb-4">Your Inbox</h2>
             <p className="text-muted-foreground max-w-md mx-auto mb-8">
               Select a conversation from the sidebar to view details and respond to potential collaborators.
             </p>
             <Button variant="outline" className="rounded-full px-8 h-12 font-bold" onClick={() => void loadMessages()}>
                Refresh Messages
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}
