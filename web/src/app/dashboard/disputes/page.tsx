"use client";

import { useEffect, useState } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  ArrowRight,
  User,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function DisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch disputes where user is involved
        const { data, error } = await supabase
          .from("disputes")
          .select(`
            *,
            asset:media_assets!asset_id(id, sha256_hash, metadata),
            creator:profiles!creator_id(display_name, public_slug)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDisputes(data ?? []);
      } catch (err) {
        toast.error("Failed to load disputes.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) return <div className="p-8"><Skeleton className="h-[400px] w-full" /></div>;

  return (
    <main className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-amber-500" />
          Media Guard Resolutions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage disputes, incorrect matches, or ownership claims for your content.
        </p>
      </div>

      <div className="space-y-4">
        {disputes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-zinc-500">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 opacity-20" />
              <p className="text-sm">You have no active disputes or content flags.</p>
            </CardContent>
          </Card>
        ) : (
          disputes.map(dispute => (
            <Card key={dispute.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className={`w-2 sm:w-1 ${dispute.status === 'open' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={dispute.status === 'open' ? 'secondary' : 'default'} className="uppercase text-[9px]">
                          {dispute.status}
                        </Badge>
                        <span className="text-xs text-zinc-400">{new Date(dispute.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-bold text-lg">{dispute.dispute_type.replace('_', ' ').toUpperCase()}</h3>
                      <p className="text-sm text-zinc-600 line-clamp-2">{dispute.reason}</p>
                    </div>
                    <div className="text-right shrink-0">
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="gap-2"
                         onClick={() => router.push(`/dashboard/assets/${dispute.asset_id}`)}
                       >
                         <ExternalLink className="h-3 w-3" />
                         Inspect Asset
                       </Button>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center border">
                        <User className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter leading-none">Flagged By</p>
                        <p className="text-xs font-bold">{dispute.creator?.display_name || "Unknown"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center border text-white">
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter leading-none">Target Asset</p>
                        <p className="text-xs font-bold font-mono">{(dispute.asset?.metadata as any)?.originalName || dispute.asset?.sha256_hash.slice(0, 8)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      
      <div className="mt-12 p-6 rounded-2xl bg-zinc-50 border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">
         <h4 className="text-sm font-bold mb-2">How do disputes work?</h4>
         <p className="text-xs text-zinc-500 leading-relaxed">
           Media Guard automatically flags potential remixes or unauthorized uses based on semantic DNA. 
           If our AI makes a mistake, or if you believe you have the primary rights to a piece of content, 
           you can open a dispute. Our resolution center ensures creators are fairly credited and recognized.
         </p>
      </div>
    </main>
  );
}
