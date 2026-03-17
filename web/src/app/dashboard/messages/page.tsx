"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Mail, 
  Search, 
  Inbox, 
  Send, 
  Trash2, 
  MoreHorizontal,
  User,
  Clock,
  CheckCheck,
  Sparkles,
  ArrowLeft,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendMessage } from "@/app/actions/connections";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  partnerSlug: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: DirectMessage[];
}

interface Inquiry {
  id: string;
  creator_id: string;
  hirer_name: string;
  hirer_email: string;
  message: string;
  status: string;
  created_at: string;
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const preselectedTo = searchParams.get("to");
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(preselectedTo);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(!!preselectedTo);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadAll();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedPartnerId, conversations]);

  async function loadAll() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch direct messages
      const { data: msgs, error: msgError } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: true });

      if (msgError) throw msgError;

      // Group messages by conversation partner
      const partnerIds = new Set<string>();
      (msgs || []).forEach((m: DirectMessage) => {
        partnerIds.add(m.sender_id === user.id ? m.receiver_id : m.sender_id);
      });

      // Fetch partner profiles
      const partnerIdsArray = Array.from(partnerIds);
      let profiles: any[] = [];
      if (partnerIdsArray.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, public_slug")
          .in("id", partnerIdsArray);
        profiles = profs || [];
      }

      // If we have a preselected "to" that isn't in our existing conversations, add them
      if (preselectedTo && !partnerIds.has(preselectedTo)) {
        const { data: toPro } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, public_slug")
          .eq("id", preselectedTo)
          .single();
        if (toPro) {
          profiles.push(toPro);
          partnerIds.add(preselectedTo);
        }
      }

      const convos: Conversation[] = Array.from(partnerIds).map(pid => {
        const partnerMsgs = (msgs || []).filter(
          (m: DirectMessage) => m.sender_id === pid || m.receiver_id === pid
        );
        const prof = profiles.find((p: any) => p.id === pid);
        const lastMsg = partnerMsgs[partnerMsgs.length - 1];
        
        return {
          partnerId: pid,
          partnerName: prof?.display_name || "Unknown",
          partnerAvatar: prof?.avatar_url || "",
          partnerSlug: prof?.public_slug || "",
          lastMessage: lastMsg?.content || "",
          lastMessageAt: lastMsg?.created_at || new Date().toISOString(),
          unreadCount: partnerMsgs.filter((m: DirectMessage) => m.receiver_id === user.id && !m.is_read).length,
          messages: partnerMsgs,
        };
      });

      convos.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      setConversations(convos);

      if (preselectedTo) {
        setSelectedPartnerId(preselectedTo);
      } else if (convos.length > 0 && !selectedPartnerId) {
        setSelectedPartnerId(convos[0].partnerId);
      }

      // Fetch inquiries too
      const { data: inqs } = await supabase
        .from("inquiries")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      setInquiries(inqs || []);

    } catch (err) {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedPartnerId || sending) return;
    setSending(true);
    
    const result = await sendMessage(selectedPartnerId, newMessage.trim());
    if (result.success) {
      const msg: DirectMessage = {
        id: crypto.randomUUID(),
        sender_id: userId!,
        receiver_id: selectedPartnerId,
        content: newMessage.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setConversations(prev => prev.map(c => 
        c.partnerId === selectedPartnerId 
          ? { ...c, messages: [...c.messages, msg], lastMessage: msg.content, lastMessageAt: msg.created_at }
          : c
      ));
      setNewMessage("");
    } else {
      toast.error(result.error || "Failed to send message");
    }
    setSending(false);
  }, [newMessage, selectedPartnerId, sending, userId]);

  const selectedConvo = conversations.find(c => c.partnerId === selectedPartnerId);

  const filteredConvos = conversations.filter(c =>
    c.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex overflow-hidden rounded-[2.5rem] border-2 border-muted bg-background shadow-2xl">
      {/* Sidebar: Conversation List */}
      <div className={`w-full md:w-96 border-r flex flex-col bg-muted/5 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 md:p-6 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-black tracking-tighter">Messages</h1>
            <Badge variant="secondary" className="rounded-full px-3">{conversations.length}</Badge>
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

        <Tabs defaultValue="direct" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 bg-muted/30 rounded-xl p-1 h-auto">
            <TabsTrigger value="direct" className="rounded-lg text-xs flex-1 py-2">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Direct
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="rounded-lg text-xs flex-1 py-2">
              <Mail className="h-3.5 w-3.5 mr-1.5" /> Inquiries
              {inquiries.length > 0 && (
                <Badge className="ml-1.5 bg-primary text-white rounded-full px-1.5 py-0 h-4 min-w-4 flex items-center justify-center text-[9px]">
                  {inquiries.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="flex-1 overflow-auto mt-0">
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
                ) : filteredConvos.length === 0 ? (
                   <div className="p-12 text-center text-muted-foreground">
                     <MessageSquare className="h-10 w-10 mx-auto mb-4 opacity-20" />
                     <p className="text-sm">No conversations yet</p>
                     <p className="text-xs mt-1 text-muted-foreground/60">Connect with creators to start messaging</p>
                   </div>
                ) : (
                  filteredConvos.map((convo) => (
                    <button
                      key={convo.partnerId}
                      onClick={() => {
                        setSelectedPartnerId(convo.partnerId);
                        setMobileShowChat(true);
                      }}
                      className={`w-full text-left p-4 md:p-5 transition-all hover:bg-primary/5 relative group ${
                        selectedPartnerId === convo.partnerId ? "bg-primary/5" : ""
                      }`}
                    >
                      {selectedPartnerId === convo.partnerId && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                      )}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-primary/10 transition-all">
                          <AvatarImage src={convo.partnerAvatar} />
                          <AvatarFallback className="text-xs font-bold bg-primary/5 text-primary">{convo.partnerName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-sm truncate pr-2">{convo.partnerName}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(convo.lastMessageAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{convo.lastMessage || "Start a conversation..."}</p>
                        </div>
                        {convo.unreadCount > 0 && (
                          <Badge className="bg-primary text-white rounded-full h-5 min-w-5 text-[10px] flex items-center justify-center">
                            {convo.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="inquiries" className="flex-1 overflow-auto mt-0">
            <ScrollArea className="flex-1">
              <div className="divide-y divide-muted/50">
                {inquiries.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Inbox className="h-10 w-10 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">No inquiries yet</p>
                  </div>
                ) : (
                  inquiries.map((inq) => (
                    <div key={inq.id} className="p-4 md:p-5 hover:bg-muted/5 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm">{inq.hirer_name}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(inq.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 mb-1">{inq.hirer_email}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{inq.message}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Main Content: Chat View */}
      <div className={`flex-1 flex flex-col bg-background relative overflow-hidden ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
        {selectedPartnerId && selectedConvo ? (
          <>
            {/* Header */}
            <div className="p-4 md:p-6 border-b flex items-center justify-between bg-background/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3 md:gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full md:hidden"
                  onClick={() => setMobileShowChat(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-primary/10">
                  <AvatarImage src={selectedConvo.partnerAvatar} />
                  <AvatarFallback className="bg-primary/5 text-primary text-sm md:text-lg font-bold">
                    {selectedConvo.partnerName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-black text-base md:text-lg leading-tight">{selectedConvo.partnerName}</h2>
                  <p className="text-[10px] md:text-xs text-muted-foreground font-medium">@{selectedConvo.partnerSlug || 'creator'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Stream */}
            <div ref={scrollRef} className="flex-1 overflow-auto p-4 md:p-8">
              <div className="max-w-2xl mx-auto space-y-4">
                {selectedConvo.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                    <Sparkles className="h-8 w-8 mb-4 text-primary" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em]">New Conversation</p>
                    <p className="text-[10px] mt-1">Say hello to {selectedConvo.partnerName}!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center justify-center py-8 text-center opacity-20">
                      <Sparkles className="h-6 w-6 mb-2 text-primary" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Conversation Started</p>
                    </div>
                    {selectedConvo.messages.map((msg) => {
                      const isMine = msg.sender_id === userId;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-1`}>
                          <div className={`${
                            isMine 
                              ? 'bg-primary text-primary-foreground rounded-3xl rounded-tr-none' 
                              : 'bg-muted/30 border rounded-3xl rounded-tl-none'
                          } p-4 md:p-5 max-w-[80%] md:max-w-lg shadow-sm`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className="flex items-center gap-1.5 px-2">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMine && <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-4 md:p-6 bg-muted/5 border-t">
              <div className="max-w-4xl mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-2 md:gap-4 bg-background p-2 rounded-xl border-2 border-muted focus-within:border-primary transition-all">
                  <Input 
                    placeholder="Type a message..." 
                    className="flex-1 h-10 md:h-12 border-none ring-0 focus-visible:ring-0 bg-transparent text-sm"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <Button 
                    className="h-10 w-10 md:h-12 md:w-12 rounded-lg shadow-xl" 
                    size="icon"
                    onClick={() => void handleSend()}
                    disabled={!newMessage.trim() || sending}
                  >
                    <Send className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             <div className="h-24 w-24 md:h-32 md:w-32 rounded-[2.5rem] bg-muted/10 flex items-center justify-center mb-8 border-4 border-dashed">
                <Mail className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground opacity-20" />
             </div>
             <h2 className="text-2xl md:text-3xl font-black tracking-tighter mb-4">Your Inbox</h2>
             <p className="text-muted-foreground max-w-md mx-auto mb-8">
               Select a conversation from the sidebar or connect with creators to start messaging.
             </p>
             <Button variant="outline" className="rounded-full px-8 h-12 font-bold" onClick={() => void loadAll()}>
                Refresh Messages
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}
