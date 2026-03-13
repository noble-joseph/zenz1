"use client";

import { useState } from "react";
import { Search, Camera, Music, Filter, Sparkles, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface DiscoverySectionProps {
  initialAssets: any[];
  initialCreators: any[];
}

export function DiscoverySection({ initialAssets, initialCreators }: DiscoverySectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const router = useRouter();

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const filteredAssets = initialAssets.filter((asset) => {
    if (activeTab === "photography") return asset.media_type === "image";
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
          Try: "Minimalist studio photography" or "Atmospheric synthwave"
        </p>
      </form>

      {/* Filter Tabs */}
      <div className="flex flex-col items-center gap-8">
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-8 border-b pb-4">
            <h2 className="text-2xl font-bold tracking-tight">Featured Works</h2>
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="all" className="gap-2">
                <Filter className="h-4 w-4" /> All
              </TabsTrigger>
              <TabsTrigger value="photography" className="gap-2">
                <Camera className="h-4 w-4" /> Photography
              </TabsTrigger>
              <TabsTrigger value="music" className="gap-2">
                <Music className="h-4 w-4" /> Music
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAssets.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl">
                <p className="text-muted-foreground">No featured {activeTab} yet. Join and upload yours!</p>
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <div key={asset.hash_id} className="group relative aspect-square overflow-hidden rounded-3xl border-4 border-background shadow-lg hover:shadow-2xl transition-all duration-500">
                  {asset.media_type === "image" ? (
                    <img 
                      src={`/api/signed-url?hash=${asset.hash_id}`} 
                      alt="Work" 
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
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
              ))
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
