import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Users, FolderGit2, ArrowRight, Sparkles } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicProfilePage(props: PageProps) {
  const { slug } = await props.params;
  const decodedSlug = decodeURIComponent(slug);
  const supabase = await createSupabaseServerClient();

  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("public_slug", decodedSlug)
    .single();

  if (!profile) {
    notFound();
  }

  // 2. Fetch Public Projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, slug, description, tags, created_at")
    .eq("owner_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  // 3. Fetch Verified Credits (Proof of Work)
  // Incoming credits: where profile is tagged as a collaborator
  const { data: incomingCollabs } = await supabase
    .from("collaborations")
    .select("id, role_title, project_id, project:projects(title)")
    .eq("creator_id", profile.id)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(10);

  const displayName = profile.display_name || "Creator";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-24">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left">
        <Avatar className="mb-6 h-32 w-32 border-4 border-background shadow-lg md:mb-0 md:mr-8 md:h-40 md:w-40">
          <AvatarImage src={profile.avatar_url || ""} alt={displayName} />
          <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                {displayName}
              </h1>
              <Badge variant="secondary" className="mt-1">
                {profile.role}
              </Badge>
            </div>
            <p className="mt-2 font-mono text-sm text-muted-foreground">
              talent.os/{profile.public_slug}
            </p>
            {profile.profession && (
              <p className="mt-1 text-emerald-600 font-bold tracking-tight text-lg">
                {profile.profession}
              </p>
            )}
          </div>

          {profile.bio && (
            <p className="max-w-xl text-balance text-lg text-muted-foreground">
              {profile.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 md:justify-start">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
              <BadgeCheck className="h-5 w-5" />
              <span className="font-bold">{profile.influence_score}</span>
              <span className="text-sm font-medium">Credits</span>
            </div>
            
            {(profile.specializations?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.specializations.map((spec: string) => (
                  <Badge key={spec} variant="outline" className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border-emerald-100">
                    {spec}
                  </Badge>
                ))}
              </div>
            )}
            <Button>Contact {displayName.split(" ")[0]}</Button>
          </div>
        </div>
      </div>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_300px]">
        {/* Main Content: Projects */}
        <div className="space-y-8">
          <div className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <FolderGit2 className="h-6 w-6" />
            <h2>Public Portfolios</h2>
          </div>

          {(projects?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground">
              {displayName} hasn&apos;t published any projects yet.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {(projects ?? []).map((project) => (
                <Card key={project.id} className="transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl">{project.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {project.description || "No description provided."}
                    </CardDescription>
                    {project.tags && project.tags.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {project.tags.map((t: string) => (
                          <span key={t} className="inline-flex rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 uppercase">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      render={<Link href={`/${profile.public_slug}/projects/${project.id}`} />}
                    >
                      View Project
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Proof of Work */}
        <div className="space-y-8">
          <div className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Users className="h-5 w-5" />
            <h3>Proof of Work</h3>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Verified Credits</CardTitle>
              <CardDescription>
                Mathematically proven collaborations via our multi-signature credit
                system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(incomingCollabs?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No verified collaborations yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {(incomingCollabs ?? []).map((collab) => {
                    // Supabase typed nested join
                    const projectTitle =
                      // @ts-expect-error Types mismatch on joined relation array vs object in basic type gen
                      collab.project?.title || "Unknown Project";

                    return (
                      <div
                        key={collab.id}
                        className="flex items-start gap-3 rounded-md border p-3"
                      >
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium">{collab.role_title}</p>
                          <p className="text-xs text-muted-foreground">
                            on <span className="font-semibold">{projectTitle}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          {(profile.achievements?.length ?? 0) > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                <h3>Achievements</h3>
              </div>
              <div className="space-y-3">
                {profile.achievements.map((achievement: string, i: number) => (
                  <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-muted/30 border border-zinc-100 dark:border-zinc-900">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white uppercase tracking-tighter">
                      Award
                    </span>
                    <p className="text-sm font-medium leading-relaxed">{achievement}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
