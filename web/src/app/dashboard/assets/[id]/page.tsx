"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  GitBranch, 
  Image as ImageIcon, 
  Music, 
  User, 
  ExternalLink,
  ShieldCheck,
  History,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaAsset } from "@/lib/types/database";

export default function AssetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [parent, setParent] = useState<MediaAsset | null>(null);
  const [derivatives, setDerivatives] = useState<MediaAsset[]>([]);
  const [attributions, setAttributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase || !id) return;

      try {
        setLoading(true);
        
        // 1. Fetch main asset
        const { data: mainAsset, error: assetErr } = await supabase
          .from("media_assets")
          .select("*, created_by_profile:profiles(display_name, public_slug)")
          .eq("id", id)
          .single();

        if (assetErr) throw assetErr;
        setAsset(mainAsset as any);

        // 2. Fetch parent if exists
        if (mainAsset.parent_id) {
          const { data: parentData } = await supabase
            .from("media_assets")
            .select("*")
            .eq("id", mainAsset.parent_id)
            .single();
          setParent(parentData);
        }

        // 3. Fetch derivatives (children)
        const { data: children } = await supabase
          .from("media_assets")
          .select("*")
          .eq("parent_id", id)
          .order("created_at", { ascending: true });
        setDerivatives(children ?? []);

        // 4. Fetch formal attributions
        const { data: attrData } = await supabase
          .from("attributions")
          .select("*, original_owner:profiles!original_owner_id(display_name, public_slug), derivative_owner:profiles!derivative_owner_id(display_name, public_slug)")
          .or(`original_asset_id.eq.${id},derivative_asset_id.eq.${id}`);
        setAttributions(attrData ?? []);

      } catch (err) {
        toast.error("Failed to load asset lineage.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  if (loading) return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>;
  if (!asset) return <div className="p-8">Asset not found.</div>;

  const storageUrl = (asset.metadata as any)?.storage_url;

  return (
    <main className="p-6 lg:p-8 max-w-5xl mx-auto">
      <Button 
        variant="ghost" 
        onClick={() => router.back()} 
        className="mb-6 gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assets
      </Button>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Preview & Basic Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-2">
            <div className="aspect-video bg-zinc-900 flex items-center justify-center relative group">
              {asset.media_type === "image" && storageUrl ? (
                <img 
                  src={storageUrl} 
                  alt="Asset Preview" 
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-zinc-500">
                  {asset.media_type === "audio" ? <Music className="h-16 w-16" /> : <ImageIcon className="h-16 w-16" />}
                  <span className="text-sm font-medium uppercase tracking-widest">Preview Not Available</span>
                </div>
              )}
              
              <div className="absolute top-4 right-4">
                 <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-md border-none px-3 py-1">
                    {asset.media_type.toUpperCase()}
                 </Badge>
              </div>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{ (asset.metadata as any)?.originalName || "Unnamed Asset" }</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">ID: {asset.id}</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  render={<a href={storageUrl} target="_blank" rel="noopener noreferrer" className="gap-2" />}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Source
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Lineage Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5" />
              Content Lineage
            </h3>
            
            <div className="relative space-y-6 pl-4 border-l-2 border-zinc-200 dark:border-zinc-800">
               {/* Parent Link */}
               {parent ? (
                 <div className="relative">
                    <div className="absolute -left-[25px] top-4 h-0.5 w-4 bg-zinc-200 dark:border-zinc-800" />
                    <Card className="bg-zinc-50 dark:bg-zinc-900/50 border-dashed">
                       <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="h-10 w-10 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center border">
                                <ImageIcon className="h-5 w-5 text-zinc-400" />
                             </div>
                             <div>
                                <p className="text-xs font-black uppercase text-zinc-400 tracking-widest leading-none mb-1">Original Master</p>
                                <p className="text-sm font-bold">{(parent.metadata as any)?.originalName || "Previous Version"}</p>
                             </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/assets/${parent.id}`)}>
                             View Origin
                          </Button>
                       </CardContent>
                    </Card>
                 </div>
               ) : (
                 <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-sm font-bold uppercase tracking-tight">Root Asset / Master Identity Verified</span>
                 </div>
               )}

               {/* Current Asset Indicator */}
               <div className="relative">
                  <div className="absolute -left-[25px] top-6 h-3 w-3 rounded-full bg-emerald-600 outline outline-4 outline-emerald-100 dark:outline-emerald-900/50" />
                  <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none">
                     <p className="text-xs font-black uppercase opacity-80 mb-1">Current Active Version</p>
                     <p className="font-bold flex items-center gap-2">
                        { (asset.metadata as any)?.originalName || "This Asset" }
                        <Badge variant="outline" className="border-white/30 text-white bg-white/10">Active</Badge>
                     </p>
                  </div>
               </div>

               {/* Derivatives */}
               {derivatives.length > 0 && (
                 <div className="grid gap-3 pt-2">
                    {derivatives.map(child => (
                      <div key={child.id} className="relative">
                         <div className="absolute -left-[25px] top-6 h-0.5 w-4 bg-zinc-200 dark:border-zinc-800" />
                         <div className="flex items-center justify-between p-4 rounded-xl border bg-white dark:bg-zinc-900 hover:border-emerald-200 transition-colors">
                            <div className="flex items-center gap-3">
                               <GitBranch className="h-5 w-5 text-zinc-400 rotate-180" />
                               <div>
                                  <p className="text-sm font-bold">{(child.metadata as any)?.originalName || "Derivative"}</p>
                                  <p className="text-[10px] text-zinc-400 uppercase">Version {new Date(child.created_at).toLocaleDateString()}</p>
                               </div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/assets/${child.id}`)}>
                               Inspect
                            </Button>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata & Protection Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 text-center">
               <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
               </div>
               <CardTitle className="text-base uppercase tracking-widest font-black">Security Audit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-zinc-400">Fingerprint (SHA-256)</span>
                <p className="text-xs font-mono break-all bg-zinc-50 dark:bg-zinc-900 p-2 rounded border">{asset.sha256_hash}</p>
              </div>
              {asset.p_hash && (
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Perceptual DNA (pHash)</span>
                  <p className="text-xs font-mono break-all bg-zinc-50 dark:bg-zinc-900 p-2 rounded border">{asset.p_hash}</p>
                </div>
              )}
              <div className="pt-2">
                 <Badge className="w-full justify-center bg-emerald-600 hover:bg-emerald-600 cursor-default py-2">
                    Media Guard Active
                 </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Attribution System */}
          <Card className="border-emerald-100 dark:border-emerald-950">
             <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
                   <LinkIcon className="h-4 w-4" />
                   Network Attributions
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                {attributions.length === 0 ? (
                  <div className="p-6 text-center">
                     <p className="text-xs text-zinc-500 italic">No external attributions linked to this asset yet.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                     {attributions.map(attr => (
                       <div key={attr.id} className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                             <Badge variant="outline" className="text-[9px] uppercase">{attr.attribution_type}</Badge>
                             <span className="text-[10px] text-zinc-400">{new Date(attr.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                             <User className="h-3 w-3 text-zinc-400" />
                             <span className="font-bold">
                                { attr.original_owner_id === asset.created_by ? "You" : attr.original_owner?.display_name || "Unknown Creator" }
                             </span>
                             <span className="text-zinc-400">remixed by</span>
                             <span className="font-bold">
                                { attr.derivative_owner_id === asset.created_by ? "You" : attr.derivative_owner?.display_name || "Unknown Creator" }
                             </span>
                          </div>
                       </div>
                     ))}
                  </div>
                )}
             </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
