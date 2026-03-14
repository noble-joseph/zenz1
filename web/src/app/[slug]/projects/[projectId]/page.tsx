import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Image as ImageIcon, 
  Film, 
  Music, 
  FileText, 
  File,
  Briefcase,
  Users,
  Wrench,
  Calendar,
  ExternalLink,
  BadgeCheck,
  ChevronRight
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profile, Project, Collaboration } from "@/lib/types/database";

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
    .select("id, display_name, public_slug, avatar_url")
    .eq("public_slug", decodedSlug)
    .single();

  if (!profile) notFound();

  // 2. Fetch Project with new fields
  const { data: projectData } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("owner_id", profile.id)
    .single();

  if (!projectData || !projectData.is_public) notFound();
  const project = projectData as Project;

  // 3. Fetch Collaborators (Verified Credits)
  const { data: collaborators } = await supabase
    .from("collaborations")
    .select(`
      id, 
      role_title, 
      status, 
      creator:profiles(id, display_name, public_slug, avatar_url)
    `)
    .eq("project_id", project.id)
    .eq("status", "verified");

  // 4. Fetch Commits + Assets
  const { data: commits } = await supabase
    .from("commits")
    .select(`
      id, 
      created_at, 
      change_message,
      assets ( hash_id, storage_url, media_type, metadata )
    `)
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  // Extract unique assets
  const uniqueAssetsMap = new Map();
  if (commits) {
    for (const commit of commits) {
      const asset = commit.assets as any;
      if (asset && !uniqueAssetsMap.has(asset.hash_id)) {
        uniqueAssetsMap.set(asset.hash_id, {
          ...asset,
          commitId: commit.id,
          commitMessage: commit.change_message,
          committedAt: commit.created_at,
        });
      }
    }
  }
  const assetsList = Array.from(uniqueAssetsMap.values());

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Hero Header */}
      <div className="relative h-[50vh] min-h-[400px] w-full overflow-hidden mb-12">
        {project.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        <div className="absolute top-8 left-4 md:left-8">
          <Link
            href={`/${profile.public_slug}`}
            className="flex items-center gap-2 group bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white transition-all"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-bold tracking-tight">Return to Profile</span>
          </Link>
        </div>

        <div className="absolute bottom-12 left-0 right-0">
          <div className="mx-auto max-w-5xl px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {project.tags?.map(t => (
                    <Badge key={t} className="bg-emerald-600 text-white border-none shadow-lg shadow-emerald-600/20 px-3 uppercase text-[10px] font-black tracking-widest">
                      {t}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="bg-white/5 backdrop-blur-sm text-white border-white/20 px-3 uppercase text-[10px] font-black tracking-widest">
                    {new Date(project.created_at).getFullYear()}
                  </Badge>
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground drop-shadow-2xl">
                  {project.title}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12">
          {/* Main Column */}
          <div className="space-y-12">
            <div className="prose prose-zinc dark:prose-invert max-w-none">
              <p className="text-2xl leading-relaxed text-muted-foreground font-medium">
                {project.description}
              </p>
            </div>

            {/* Media Gallery */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <h2 className="text-3xl font-black tracking-tight">Project Gallery</h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              
              {assetsList.length === 0 ? (
                <Card className="border-dashed h-48 flex items-center justify-center bg-muted/30">
                  <p className="text-muted-foreground font-medium italic">No public assets shared for this project.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {assetsList.map((asset) => {
                    const mediaType = asset.media_type as keyof typeof MEDIA_ICONS;
                    const Icon = MEDIA_ICONS[mediaType] || MEDIA_ICONS.other;
                    const meta = asset.metadata as Record<string, unknown>;

                    return (
                      <Card key={asset.hash_id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all h-fit">
                        <div className="relative aspect-video bg-muted overflow-hidden">
                          {mediaType === "image" && asset.storage_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/signed-url?hash=${asset.hash_id}`}
                              alt={(meta.originalName as string) || "Asset"}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : mediaType === "video" && asset.storage_url ? (
                            <video src={`/api/signed-url?hash=${asset.hash_id}`} className="w-full h-full object-cover" controls />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon className="h-12 w-12 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="absolute top-4 right-4">
                            <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-white/10 uppercase text-[9px] font-black">
                              {mediaType}
                            </Badge>
                          </div>
                        </div>
                        <CardHeader className="p-5">
                          <CardTitle className="text-lg line-clamp-1">{asset.commitMessage || "Public Contribution"}</CardTitle>
                          <CardDescription className="flex items-center gap-2 text-xs font-mono">
                            <Calendar className="h-3 w-3" />
                            {new Date(asset.committedAt).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                          </CardDescription>
                        </CardHeader>
                        <div className="px-5 pb-5">
                          <Button 
                            variant="secondary" 
                            className="w-full h-9 text-xs font-bold gap-2 rounded-xl"
                            render={<Link href={`/api/signed-url?hash=${asset.hash_id}`} target="_blank" />}
                          >
                            View Full Resolution <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Meta Card */}
            <Card className="rounded-3xl border shadow-sm">
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Project Lead</h3>
                  <Link href={`/${profile.public_slug}`} className="group flex items-center gap-4 hover:bg-muted/50 p-2 -m-2 rounded-2xl transition-colors">
                    <Avatar className="h-12 w-12 border-2 border-emerald-500/20">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback>{profile.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-bold text-sm leading-none">{profile.display_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">Lead Creator</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </div>

                {project.client && (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Client</h3>
                    <p className="text-lg font-bold flex items-center gap-2">
                       <Briefcase className="h-4 w-4 text-emerald-600" />
                       {project.client}
                    </p>
                  </div>
                )}

                {project.role && (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">My Role</h3>
                    <p className="text-lg font-bold flex items-center gap-2 text-emerald-600">
                       <BadgeCheck className="h-4 w-4" />
                       {project.role}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gear Stack */}
            {project.equipment && project.equipment.length > 0 && (
              <Card className="rounded-3xl border bg-zinc-950 text-zinc-50 border-zinc-800 shadow-2xl">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="h-4 w-4 text-emerald-500" />
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Gear Stack</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-0 flex flex-wrap gap-2">
                  {project.equipment.map(item => (
                    <Badge key={item} variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-400 font-mono text-[10px] uppercase">
                      {item}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Collaborators */}
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-2 flex items-center gap-2">
                <Users className="h-3 w-3" /> 
                Verified Collaborators
              </h3>
              <div className="space-y-3">
                {collaborators && collaborators.length > 0 ? (
                  collaborators.map((collab: any) => (
                    <div key={collab.id} className="flex items-center gap-4 p-4 rounded-3xl bg-muted/30 border border-muted transition-colors hover:border-emerald-500/30">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={collab.creator?.avatar_url || ""} />
                        <AvatarFallback>{collab.creator?.display_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{collab.creator?.display_name}</p>
                        <p className="text-[10px] text-muted-foreground italic truncate">{collab.role_title}</p>
                      </div>
                      <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground pl-2 italic">A solo production.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
