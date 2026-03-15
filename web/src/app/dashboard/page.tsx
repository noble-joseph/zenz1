"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Heart,
  Share2,
  BadgeCheck,
  MoreHorizontal,
  Plus,
} from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface FeedItem {
  id: string;
  type: "project" | "asset";
  title: string;
  description?: string;
  image_url: string;
  created_at: string;
  creator: {
    display_name: string;
    avatar_url: string;
    public_slug: string;
  };
  stats: {
    likes: number;
    credits: number;
  };
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;

      try {
        // Fetch featured assets and projects
        const { data: assets } = await supabase
          .from("assets")
          .select("*, profiles:created_by!inner(display_name, avatar_url, public_slug)")
          .not("profiles.display_name", "is", null)
          .order("created_at", { ascending: false })
          .limit(10);

        if (assets) {
          const feedItems: FeedItem[] = assets.map((a: any) => ({
            id: a.hash_id,
            type: "asset",
            title: a.metadata?.originalName || "Untitled Work",
            description: a.metadata?.description || `A ${a.media_type} asset uploaded to Talent OS.`,
            image_url: `/api/signed-url?hash=${a.hash_id}`,
            created_at: a.created_at,
            creator: {
              display_name: a.profiles?.display_name || "Creator",
              avatar_url: a.profiles?.avatar_url || "",
              public_slug: a.profiles?.public_slug || "",
            },
            stats: {
              likes: Math.floor(Math.random() * 100), // Placeholder
              credits: Math.floor(Math.random() * 50), // Placeholder
            },
          }));
          setItems(feedItems);
        }
      } catch (err) {
        console.error("Failed to load feed:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadFeed();
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-4">
      <header className="mb-6 lg:mb-8 flex items-center justify-between px-2">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tighter uppercase">Your Feed</h1>
          <p className="text-xs lg:text-sm text-muted-foreground">The best work from the creators you follow.</p>
        </div>
        <Button className="rounded-full h-10 w-10 lg:h-12 lg:w-12 p-0 shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5 lg:h-6 lg:w-6" />
        </Button>
      </header>

      <div className="space-y-10 lg:space-y-12">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-[300px] lg:h-[400px] w-full rounded-2xl lg:rounded-3xl" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/40" />
            <h2 className="text-xl font-bold">No works found</h2>
            <p className="text-muted-foreground mt-2">Start following creators to see their work here.</p>
          </div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="group animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Creator Header */}
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 lg:h-10 lg:w-10 ring-2 ring-primary/10 transition-all group-hover:ring-primary/40">
                    <AvatarImage src={item.creator.avatar_url} />
                    <AvatarFallback className="bg-primary/5 font-bold text-primary">
                      {item.creator.display_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link 
                      href={`/${item.creator.public_slug}`}
                      className="text-xs lg:text-sm font-bold hover:text-primary transition-colors"
                    >
                      {item.creator.display_name}
                    </Link>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Work Media */}
              <div className="relative aspect-square overflow-hidden rounded-2xl lg:rounded-3xl bg-muted shadow-lg lg:shadow-xl transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/5">
                <img 
                  src={item.image_url} 
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Overlay - visible on hover for desktop, always visible on mobile */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 lg:opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-4 lg:p-8">
                   <h3 className="text-white text-lg lg:text-2xl font-black tracking-tight mb-1 lg:mb-2">{item.title}</h3>
                   <p className="text-white/80 text-xs lg:text-sm line-clamp-2">{item.description}</p>
                </div>
              </div>

              {/* Actions & Stats */}
              <div className="mt-4 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1 -ml-2">
                  <Button variant="ghost" size="icon" className="rounded-full hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Heart className="h-5 w-5 lg:h-6 lg:w-6" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full hover:text-primary hover:bg-primary/5 transition-colors">
                    <BadgeCheck className="h-5 w-5 lg:h-6 lg:w-6" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full hover:text-primary hover:bg-primary/5 transition-colors">
                    <Share2 className="h-5 w-5 lg:h-6 lg:w-6" />
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-muted-foreground">
                     {item.stats.likes} Likes
                   </span>
                   <div className="h-1 w-1 rounded-full bg-border" />
                   <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-primary">
                     {item.stats.credits} Verified Credits
                   </span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
