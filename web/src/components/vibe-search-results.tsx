import { BadgeCheck, Sparkles, FolderGit2, Users, Music } from "lucide-react";
import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// A server component that fetches the top assets by semantic match
export async function VibeSearchResults({ query }: { query: string }) {
  if (!query) return null;

  const url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${url}/api/embeddings?q=${encodeURIComponent(query)}`);
  
  if (!res.ok) {
    return (
      <div className="py-12 text-center text-red-500">
        Failed to analyze search query. Ensure GOOGLE_GENERATIVE_AI_API_KEY is configured.
      </div>
    );
  }

  const { vector } = await res.json();
  if (!vector || !Array.isArray(vector) || vector.length === 0) {
    return (
      <div className="py-12 text-center text-red-500">
        Could not generate search embedding. Check your Google AI API key.
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  
  // 1. Search Assets (Vector Math)
  const { data: results, error } = await supabase
    .rpc("search_assets", {
      query_embedding: vector,
      match_threshold: 0.2, 
      match_count: 8,
    });

  // 2. Search Creators (Text Match on display_name or bio)
  const { data: creators } = await supabase
    .from("profiles")
    .select("id, display_name, public_slug, bio, avatar_url, influence_score")
    .or(`display_name.ilike.%${query}%,bio.ilike.%${query}%`)
    .not("display_name", "is", null)
    .not("avatar_url", "is", null)
    .limit(4);

  if (error) {
    console.error("Vibe Search RPC Error:", error);
    return (
      <div className="py-12 text-center text-red-500">
        Database search failed. Ensure pgvector is setup.
      </div>
    );
  }

  const hasResults = (results && results.length > 0) || (creators && creators.length > 0);

  if (!hasResults) {
    return (
      <div className="py-24 text-center text-muted-foreground border-2 border-dashed rounded-3xl">
        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
        No semantic matches found for &quot;{query}&quot;. Try a different vibe.
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Matching Talent Section */}
      {creators && creators.length > 0 && (
        <section>
          <div className="mb-6 flex items-center gap-2 font-bold text-xl">
             <Users className="h-5 w-5 text-emerald-600" />
             Matching Talent
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
             {creators.map((c: any) => (
                <Link key={c.id} href={`/${c.public_slug}`} className="group flex items-center gap-4 p-4 rounded-2xl border bg-card hover:shadow-md transition-all">
                   <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                      <AvatarImage src={c.avatar_url} />
                      <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold">{c.display_name?.[0]}</AvatarFallback>
                   </Avatar>
                   <div className="min-w-0">
                      <p className="font-bold truncate group-hover:underline">{c.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.influence_score} Credits</p>
                   </div>
                </Link>
             ))}
          </div>
        </section>
      )}

      {/* Matching Works Section */}
      {results && results.length > 0 && (
        <section>
          <div className="mb-6 flex items-center gap-2 font-bold text-xl">
             <FolderGit2 className="h-5 w-5 text-emerald-600" />
             Matching Works
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((asset: any) => {
              const meta = asset.metadata || {};
              const score = Math.round(asset.similarity * 100);

              return (
                <div
                  key={asset.hash_id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-xl"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-muted">
                    {asset.media_type === "image" && asset.storage_url ? (
                      <img
                        src={`/api/signed-url?hash=${asset.hash_id}`}
                        alt={meta.originalName || "Asset"}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : asset.media_type === "video" && asset.storage_url ? (
                      <video
                        src={`/api/signed-url?hash=${asset.hash_id}`}
                        className="h-full w-full object-cover"
                        muted playsInline
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-emerald-500">
                        <Music className="h-12 w-12 opacity-30 animate-pulse" />
                      </div>
                    )}
                    <div className="absolute right-2 top-2 rounded-full bg-black/50 text-white px-2 py-1 text-[10px] font-black backdrop-blur-md">
                      {score}% MATCH
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <p className="line-clamp-1 font-bold text-sm">
                        {meta.originalName || "Unnamed Asset"}
                      </p>
                      <Badge variant="outline" className="mt-2 text-[10px] font-black border-emerald-500/20 text-emerald-600">
                        {asset.media_type}
                      </Badge>
                    </div>
                    <div className="mt-4 border-t pt-3">
                      <Button variant="secondary" size="sm" className="w-full text-xs font-bold rounded-xl" render={
                          <a href={`/api/signed-url?hash=${asset.hash_id}`} target="_blank" rel="noopener noreferrer" />
                      } nativeButton={false}>
                            Inspect Raw Asset
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
