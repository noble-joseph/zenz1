import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Image as ImageIcon, Film, Music, FileText, File } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  params: Promise<{ slug: string; projectId: string }>;
}

const MEDIA_ICONS = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  document: FileText,
  other: File,
} as const;

export default async function PublicProjectPage(props: PageProps) {
  const { slug, projectId } = await props.params;
  const decodedSlug = decodeURIComponent(slug);
  const supabase = await createSupabaseServerClient();

  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, public_slug")
    .eq("public_slug", decodedSlug)
    .single();

  if (!profile) notFound();

  // 2. Fetch Project
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, description, is_public, owner_id")
    .eq("id", projectId)
    .eq("owner_id", profile.id)
    .single();

  if (!project || !project.is_public) notFound();

  // 3. Fetch Commits + Assets
  const { data: commits } = await supabase
    .from("commits")
    .select(
      `
      id, created_at, change_message,
      assets ( hash_id, storage_url, media_type, metadata )
    `,
    )
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  // Extract unique assets from commits for the gallery
  const uniqueAssets = new Map();
  if (commits) {
    for (const commit of commits) {
      const asset = commit.assets as any; // Type inference workaround for joined relation
      if (asset && !uniqueAssets.has(asset.hash_id)) {
        uniqueAssets.set(asset.hash_id, {
          ...asset,
          commitId: commit.id,
          commitMessage: commit.change_message,
          committedAt: commit.created_at,
        });
      }
    }
  }

  const assetsList = Array.from(uniqueAssets.values());

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/${profile.public_slug}`}
          className="mb-6 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {profile.display_name}&apos;s profile
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
          {project.title}
        </h1>
        {project.description && (
          <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>

      {assetsList.length === 0 ? (
        <Card className="flex h-64 items-center justify-center p-6 text-center shadow-none">
          <p className="text-muted-foreground">This project has no public assets yet.</p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {assetsList.map((asset) => {
            const mediaType = asset.media_type as keyof typeof MEDIA_ICONS;
            const Icon = MEDIA_ICONS[mediaType] || MEDIA_ICONS.other;
            const meta = asset.metadata as Record<string, unknown>;

            return (
              <Card
                key={asset.hash_id}
                className="group flex flex-col overflow-hidden transition-all hover:shadow-lg"
              >
                {/* Media Preview */}
                <div className="relative flex aspect-video items-center justify-center bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                  {mediaType === "image" && asset.storage_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/signed-url?hash=${asset.hash_id}`}
                      alt={(meta.originalName as string) || "Visual Asset"}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : mediaType === "video" && asset.storage_url ? (
                    <video
                      src={`/api/signed-url?hash=${asset.hash_id}`}
                      className="absolute inset-0 h-full w-full object-cover"
                      controls
                    />
                  ) : mediaType === "audio" && asset.storage_url ? (
                    <div className="w-full px-4">
                      <audio src={asset.storage_url} controls className="w-full" />
                    </div>
                  ) : (
                    <Icon className="h-10 w-10 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100" />
                  )}
                </div>

                <CardHeader className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="line-clamp-1 text-base">
                      {asset.commitMessage || "Unnamed Asset"}
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                      {mediaType}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-1 text-xs">
                    {(meta.originalName as string) || "Unknown filename"}
                  </CardDescription>
                </CardHeader>
                <div className="border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground flex justify-between items-center">
                  <span className="font-mono">
                    {new Date(asset.committedAt).toLocaleDateString()}
                  </span>
                  <a
                    href={`/api/signed-url?hash=${asset.hash_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    View Source
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
