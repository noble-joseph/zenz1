"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Film, Music, FileText, File, ExternalLink, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Asset } from "@/lib/types/database";

const MEDIA_ICONS = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  document: FileText,
  other: File,
} as const;

const MEDIA_COLORS = {
  image: "text-blue-600 bg-blue-50",
  video: "text-purple-600 bg-purple-50",
  audio: "text-amber-600 bg-amber-50",
  document: "text-emerald-600 bg-emerald-50",
  other: "text-zinc-600 bg-zinc-50",
} as const;

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Similar search state
  const [similarAssets, setSimilarAssets] = useState<any[]>([]);
  const [lookingForSimilar, setLookingForSimilar] = useState(false);
  const [searchingAssetId, setSearchingAssetId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("media_assets")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAssets((data ?? []) as any[]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load assets.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  async function findSimilar(assetId: string) {
    try {
      setLookingForSimilar(true);
      setSearchingAssetId(assetId);
      setSimilarAssets([]);
      
      const res = await fetch(`/api/assets/similar?assetId=${assetId}`);
      const json = await res.json();
      
      if (!json.ok) throw new Error(json.error);
      setSimilarAssets(json.data);
      
    } catch (err: any) {
      toast.error(`Discovery failed: ${err.message}`);
    } finally {
      setLookingForSimilar(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All content-addressed assets you&apos;ve uploaded. Identical files are
          never stored twice.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <File className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No assets yet. Head to{" "}
              <a href="/dashboard/ingest" className="text-primary underline">
                Ingest
              </a>{" "}
              to upload your first file.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const Icon =
              MEDIA_ICONS[asset.media_type as keyof typeof MEDIA_ICONS] ?? MEDIA_ICONS.other;
            const colorCls =
              MEDIA_COLORS[asset.media_type as keyof typeof MEDIA_COLORS] ?? MEDIA_COLORS.other;
            const meta = asset.metadata;

            return (
              <Dialog key={asset.id}>
                <DialogTrigger 
                  render={<Card className="cursor-pointer transition-shadow hover:shadow-md" />}
                >
                    <CardContent className="p-0">
                      {/* Preview */}
                      <div className="relative flex h-32 items-center justify-center rounded-t-lg bg-muted">
                        {asset.media_type === "image" && asset.storage_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.storage_url}
                            alt={meta?.originalName ?? "Asset"}
                            className="h-full w-full rounded-t-lg object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorCls}`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <p className="truncate text-sm font-medium">
                          {meta?.originalName ?? "Unnamed asset"}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {asset.media_type}
                          </Badge>
                          {meta?.size && (
                            <span className="text-xs text-muted-foreground">
                              {formatBytes(meta.size as number)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {asset.sha256_hash.slice(0, 16)}…
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-7 text-[10px] uppercase font-bold tracking-tighter"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              router.push(`/dashboard/assets/${asset.id}`);
                            }}
                          >
                            Lineage
                          </Button>
                          <DialogTrigger 
                            onClick={(e) => {
                              e.stopPropagation();
                              void findSimilar(asset.id);
                            }}
                          >
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full h-7 text-[10px] uppercase font-bold tracking-tighter hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Search className="h-3 w-3 mr-1" />
                              Similar
                            </Button>
                          </DialogTrigger>
                        </div>
                      </div>
                    </CardContent>
                </DialogTrigger>
 
                 <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                   <DialogHeader>
                     <DialogTitle className="flex items-center gap-2">
                       <Search className="h-5 w-5" />
                       Visual Discovery: {meta?.originalName}
                     </DialogTitle>
                     <DialogDescription>
                       Finding similar assets across the global Media Guard registry.
                     </DialogDescription>
                   </DialogHeader>
 
                   <div className="space-y-6 pt-4">
                      {lookingForSimilar ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-500">
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <p className="text-sm font-medium">Scanning semantic vector space...</p>
                        </div>
                      ) : similarAssets.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 border-2 border-dashed rounded-xl">
                          <p className="text-sm">No similar assets found in the registry.</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {similarAssets.map(sim => (
                            <Card key={sim.id} className="overflow-hidden bg-zinc-50 dark:bg-zinc-900/50">
                              <div className="aspect-video bg-zinc-200 dark:bg-zinc-800">
                                {sim.metadata?.storage_url && (
                                  <img 
                                    src={sim.metadata.storage_url} 
                                    alt="Similar asset" 
                                    className="h-full w-full object-cover" 
                                  />
                                )}
                              </div>
                              <div className="p-3">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <p className="truncate text-xs font-bold">{sim.metadata?.originalName || "Unnamed Asset"}</p>
                                  <Badge variant="secondary" className="text-[9px] uppercase">
                                    {Math.round((1 - sim.distance) * 100)}% Match
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                                    <ImageIcon className="h-3 w-3" />
                                    <span>Created by <span className="font-bold text-zinc-700 dark:text-zinc-300">{sim.owner?.display_name || "Unknown"}</span></span>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 text-[9px] uppercase px-2"
                                    onClick={() => router.push(`/dashboard/assets/${sim.id}`)}
                                  >
                                    View
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                   </div>
                   
                   <div className="mt-4 pt-4 border-t text-[10px] text-zinc-400 font-medium uppercase tracking-widest text-center">
                      Discovery powered by Media Guard Semantic DNA
                   </div>
                 </DialogContent>
               </Dialog>
            );
          })}
        </div>
      )}
    </div>
  );
}
