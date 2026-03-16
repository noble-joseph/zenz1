"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Camera, 
  Music, 
  Filter, 
  Sparkles, 

  Users, 
  UserPlus, 
  MessageSquare,
  BadgeCheck,
  SearchX
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Card, CardContent } from "@/components/ui/card";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinary";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Asset, Profile } from "@/lib/types/database";


export interface AssetWithProfile extends Asset {
  profiles?: {
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface DiscoverySectionProps {
  initialAssets: AssetWithProfile[];
  initialCreators: Profile[];
}

export function DiscoverySection({ initialAssets, initialCreators }: DiscoverySectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [recommendedTalent, setRecommendedTalent] = useState<Profile[]>([]);
  const [isLoadingTalent, setIsLoadingTalent] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // Fetch Recommended Talent (Neural Discovery)
  useEffect(() => {
    async function fetchRecommendations() {
      if (!supabase) return;
      setIsLoadingTalent(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setRecommendedTalent(initialCreators.slice(0, 4));
          return;
        }

        // Fetch user profile to get embedding and profession
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, profession, embedding")
          .eq("id", session.user.id)
          .single();

        if (profile?.embedding && supabase) {
          const { data: matched } = await supabase.rpc("match_creators", {
            query_embedding: profile.embedding,
            match_threshold: 0.5,
            match_count: 4,
            excluded_id: session.user.id,
            preferred_profession: profile.profession
          });
          
          if (matched && matched.length > 0) {
            setRecommendedTalent(matched);
          } else {
            setRecommendedTalent(initialCreators.slice(0, 4));
          }
        } else {
          setRecommendedTalent(initialCreators.slice(0, 4));
        }
      } catch (err) {
        console.error("Discovery talent fetch error:", err);
        setRecommendedTalent(initialCreators.slice(0, 4));
      } finally {
        setIsLoadingTalent(false);
      }
    }

    if (activeTab === "talent") {
      fetchRecommendations();
    }
  }, [activeTab, initialCreators, supabase]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const filteredAssets = initialAssets.filter((asset) => {
    if (activeTab === "cinematography") return asset.media_type === "image";
    if (activeTab === "music") return asset.media_type === "audio";
    return true;
  });

  return (
    <div className="space-y-12">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mx-auto max-w-3xl">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative flex items-center bg-background border-2 border-emerald-100 dark:border-emerald-900/30 rounded-2xl shadow-xl p-1.5 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
            <Search className="ml-4 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by vibe (e.g. 'cinematic neon city' or 'lofi hip hop')"
              className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-lg outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" className="rounded-xl px-6 py-6 h-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
              <Sparkles className="h-4 w-4" />
              Discover
            </Button>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Try: &quot;Cinematic studio shot&quot; or &quot;Atmospheric synthwave&quot;
        </p>
      </form>

      {/* Filter Tabs */}
      <div className="flex flex-col items-center gap-8">
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-8 border-b pb-4">
            <h2 className="text-2xl font-bold tracking-tight">Discovery Hub</h2>
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="all" className="gap-2">
                <Filter className="h-4 w-4" /> All
              </TabsTrigger>
              <TabsTrigger value="cinematography" className="gap-2">
                <Camera className="h-4 w-4" /> Cinematography
              </TabsTrigger>
              <TabsTrigger value="music" className="gap-2">
                <Music className="h-4 w-4" /> Music
              </TabsTrigger>
              <TabsTrigger value="talent" className="gap-2">
                <Users className="h-4 w-4" /> Smart Match
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="talent" className="mt-0">
             <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
               {isLoadingTalent ? (
                 Array.from({ length: 4 }).map((_, i) => (
                   <div key={i} className="h-64 rounded-3xl bg-muted animate-pulse border" />
                 ))
               ) : recommendedTalent.length === 0 ? (
                 <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl">
                   <SearchX className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                   <p className="text-muted-foreground text-lg">No matching creators found yet.</p>
                 </div>
               ) : (
                 recommendedTalent.map((creator) => (
                   <Card key={creator.id} className="group overflow-hidden rounded-3xl border shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 bg-white dark:bg-zinc-950">
                     <CardContent className="p-0">
                       <Link href={`/${creator.public_slug}`}>
                         <div className="relative h-32 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                           <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
                           <div className="absolute inset-0 flex items-center justify-center -mb-16">
                             <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                               <AvatarImage src={creator.avatar_url || ""} />
                               <AvatarFallback className="bg-emerald-50 text-emerald-900 font-bold text-2xl">
                                 {creator.display_name?.charAt(0) || "U"}
                               </AvatarFallback>
                             </Avatar>
                           </div>
                         </div>
                       </Link>
                       <div className="p-6 pt-10 text-center">
                         <div className="flex items-center justify-center gap-1.5 mb-1">
                           <h3 className="font-black text-lg truncate px-2">{creator.display_name}</h3>
                           <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                         </div>
                         <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">
                           {creator.profession}
                         </p>
                         <p className="text-sm text-muted-foreground line-clamp-2 mb-6 min-h-[40px]">
                           {creator.bio || "Creative mind building on Talent OS."}
                         </p>
                         <div className="grid grid-cols-2 gap-2">
                           <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-2">
                             <UserPlus className="h-3.5 w-3.5" /> Connect
                           </Button>
                           <Button size="sm" variant="outline" className="rounded-xl gap-2">
                             <MessageSquare className="h-3.5 w-3.5" /> Message
                           </Button>
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 ))
               )}
             </div>
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            <AssetGrid assets={filteredAssets} />
          </TabsContent>
          
          <TabsContent value="cinematography" className="mt-0">
            <AssetGrid assets={filteredAssets} />
          </TabsContent>

          <TabsContent value="music" className="mt-0">
            <AssetGrid assets={filteredAssets} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function AssetGrid({ assets }: { assets: AssetWithProfile[] }) {
  if (assets.length === 0) {
    return (
      <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl">
        <p className="text-muted-foreground">No featured works yet. Join and upload yours!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {assets.map((asset, i) => (
        <div key={asset.hash_id || i} className="group relative aspect-square overflow-hidden rounded-3xl border-4 border-background shadow-lg hover:shadow-2xl transition-all duration-500">
          {asset.media_type === "image" ? (
            <Image 
              src={getOptimizedCloudinaryUrl(asset.storage_url, { width: 600, height: 600, crop: "fill" })} 
              alt={asset.metadata?.originalName || "Work"} 
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110" 
              priority={i < 4}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900 text-white p-6 text-center">
                <Music className="h-12 w-12 mb-4 text-emerald-400 animate-pulse" />
                <p className="font-bold text-lg">{asset.metadata?.originalName || "Untitled Track"}</p>
                <p className="text-sm text-zinc-400 mt-2">Listen to vibe</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
            <p className="text-white font-bold">{asset.metadata?.originalName}</p>
            <p className="text-zinc-300 text-sm">by {asset.profiles?.display_name || "Anonymous"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
