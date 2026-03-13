"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Film, Music, FileText, File } from "lucide-react";
import { toast } from "sonner";

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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

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
          .from("assets")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAssets((data ?? []) as Asset[]);
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
              MEDIA_ICONS[asset.media_type] ?? MEDIA_ICONS.other;
            const colorCls =
              MEDIA_COLORS[asset.media_type] ?? MEDIA_COLORS.other;
            const meta = asset.metadata;

            return (
              <Dialog key={asset.hash_id}>
                <DialogTrigger render={<Card className="cursor-pointer transition-shadow hover:shadow-md" />}>
                  <CardContent className="p-0">
                      {/* Preview */}
                      <div className="relative flex h-32 items-center justify-center rounded-t-lg bg-muted">
                        {asset.media_type === "image" && asset.storage_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/signed-url?hash=${asset.hash_id}`}
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
                          {asset.hash_id.slice(0, 16)}…
                        </p>
                      </div>
                    </CardContent>
                </DialogTrigger>

                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {meta?.originalName ?? "Asset Details"}
                    </DialogTitle>
                    <DialogDescription>
                      Content-addressed asset metadata.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="font-medium">SHA-256</span>
                      <code className="break-all text-xs">
                        {asset.hash_id}
                      </code>
                    </div>
                    {asset.phash && (
                      <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="font-medium">pHash</span>
                        <code className="break-all text-xs">
                          {asset.phash}
                        </code>
                      </div>
                    )}
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="font-medium">Media Type</span>
                      <Badge variant="outline" className="w-fit">
                        {asset.media_type}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="font-medium">Storage</span>
                        <a
                          href={`/api/signed-url?hash=${asset.hash_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-emerald-600 hover:underline"
                        >
                          View Source
                        </a>
                    </div>
                    {meta?.size && (
                      <div className="grid grid-cols-[100px_1fr] gap-2">
                        <span className="font-medium">Size</span>
                        <span>{formatBytes(meta.size as number)}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="font-medium">Uploaded</span>
                      <span>{formatDate(asset.created_at)}</span>
                    </div>
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
