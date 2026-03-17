"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Sparkles, MessageSquare, UserPlus, BrainCircuit, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { sendConnectionRequest } from "@/app/actions/connections";

interface Creator {
  id: string;
  display_name: string;
  public_slug: string;
  profession: string;
  avatar_url: string;
  location: string;
  specializations: string[];
  availability_status: string;
}

export default function NetworkHubPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<Record<string, boolean>>({});
  const [requested, setRequested] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchCreators() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);

        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, public_slug, profession, avatar_url, location, specializations, availability_status")
          .neq("id", user?.id || "");

        if (error) throw error;
        setCreators(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load network");
      } finally {
        setLoading(false);
      }
    }

    void fetchCreators();
  }, []);

  const handleConnect = async (receiverId: string) => {
    setRequesting(prev => ({ ...prev, [receiverId]: true }));
    const result = await sendConnectionRequest(receiverId);
    
    if (result.success) {
      toast.success("Connection request sent!");
      setRequested(prev => ({ ...prev, [receiverId]: true }));
    } else {
      toast.error(result.error || "Failed to send request");
    }
    setRequesting(prev => ({ ...prev, [receiverId]: false }));
  };

  const filteredCreators = creators.filter(c => 
    (c.display_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (c.profession?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (c.specializations || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-primary">
            <BrainCircuit className="h-5 w-5" />
            <span className="text-sm font-black uppercase tracking-widest">Neural Discover</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Network Hub</h1>
          <p className="text-muted-foreground text-lg mt-2 max-w-xl">
            Find collaborators, discover new talent, and expand your creative reach. AI-matched for your vibe.
          </p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search by name, role, or skill..." 
            className="pl-12 h-14 rounded-2xl border-2 bg-background/50 backdrop-blur-xl focus-visible:ring-primary shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-80 rounded-[2.5rem] bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCreators.map((creator) => (
            <div key={creator.id} className="group flex flex-col p-6 rounded-[2.5rem] border-2 bg-background shadow-lg hover:shadow-xl hover:border-primary/20 transition-all">
              <div className="flex items-start justify-between mb-4">
                <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                  <AvatarImage src={creator.avatar_url || ""} />
                  <AvatarFallback className="text-2xl font-black bg-primary/10 text-primary">
                    {creator.display_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                
                {creator.availability_status === "available" && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                    Available for work
                  </Badge>
                )}
              </div>
              
              <div className="flex-1">
                <Link href={`/${creator.public_slug}`}>
                  <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">
                    {creator.display_name || "Unknown Creator"}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  {creator.profession || "Creative"}
                </p>
                {creator.location && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/80">
                    <MapPin className="h-3.5 w-3.5" />
                    {creator.location}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {(creator.specializations || []).slice(0, 3).map(skill => (
                    <Badge key={skill} variant="secondary" className="px-2 py-0.5 text-[10px] rounded-md">
                      {skill}
                    </Badge>
                  ))}
                  {(creator.specializations || []).length > 3 && (
                    <Badge variant="outline" className="px-2 py-0.5 text-[10px] rounded-md">
                      +{(creator.specializations.length - 3)}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-muted/50">
                <Button 
                  variant="outline" 
                  className={`rounded-xl font-bold h-10 ${requested[creator.id] ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "border-2"}`}
                  disabled={requesting[creator.id] || requested[creator.id]}
                  onClick={() => handleConnect(creator.id)}
                >
                  {requested[creator.id] ? <Check className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  {requesting[creator.id] ? "Sending..." : requested[creator.id] ? "Requested" : "Connect"}
                </Button>
                <Link href={`/dashboard/messages?to=${creator.id}`} className="w-full">
                  <Button className="w-full rounded-xl font-bold h-10 shadow-lg shadow-primary/20">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </Link>
              </div>
            </div>
          ))}

          {filteredCreators.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-50">
              <Sparkles className="h-12 w-12 mb-4" />
              <h3 className="text-xl font-black">No creators found</h3>
              <p className="text-sm mt-2">Try adjusting your search filters to discover more talent.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
