"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  GitCommitHorizontal,
  ArrowLeft,
  Upload,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface ProjectDetail {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

interface CommitRow {
  id: string;
  asset_id: string;
  parent_id: string | null;
  change_message: string;
  metadata_diff: Record<string, unknown>;
  created_at: string;
}

interface CollabRow {
  id: string;
  creator_id: string;
  role_title: string;
  status: string;
  profile?: { display_name: string | null; public_slug: string | null };
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [commits, setCommits] = useState<CommitRow[]>([]);
  const [collabs, setCollabs] = useState<CollabRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;

      try {
        // Fetch project
        const { data: proj, error: projErr } = await supabase
          .from("projects")
          .select("id, title, slug, description, is_public, created_at")
          .eq("id", projectId)
          .single();
        if (projErr) throw projErr;
        setProject(proj as ProjectDetail);

        // Fetch commits
        const { data: commitData } = await supabase
          .from("commits")
          .select("id, asset_id, parent_id, change_message, metadata_diff, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        setCommits((commitData ?? []) as CommitRow[]);

        // Fetch collaborations
        const { data: collabData } = await supabase
          .from("collaborations")
          .select("id, creator_id, role_title, status")
          .eq("project_id", projectId);

        if (collabData && collabData.length > 0) {
          // Fetch profile names
          const creatorIds = collabData.map((c) => c.creator_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, public_slug")
            .in("id", creatorIds);

          const profileMap = new Map(
            (profiles ?? []).map((p) => [
              p.id,
              { display_name: p.display_name, public_slug: p.public_slug },
            ]),
          );

          setCollabs(
            collabData.map((c) => ({
              ...c,
              profile: profileMap.get(c.creator_id) ?? undefined,
            })) as CollabRow[],
          );
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load project.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [projectId]);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="mb-8 h-4 w-96" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" className="mt-4" render={<Link href="/dashboard/projects" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to projects
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Button variant="ghost" size="sm" render={<Link href="/dashboard/projects" />}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Projects
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={project.is_public ? "default" : "secondary"}>
              {project.is_public ? (
                <>
                  <Eye className="mr-1 h-3 w-3" /> Public
                </>
              ) : (
                <>
                  <EyeOff className="mr-1 h-3 w-3" /> Private
                </>
              )}
            </Badge>
            {project.slug && (
              <Badge variant="outline" className="font-mono text-xs">
                /{project.slug}
              </Badge>
            )}
          </div>
        </div>

        <Button render={<Link href={`/dashboard/ingest?project=${project.id}`} />}>
          <Upload className="mr-2 h-4 w-4" />
          Ingest asset
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Commit Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitCommitHorizontal className="h-4 w-4" />
              Commit Timeline
            </CardTitle>
            <CardDescription>
              {commits.length} commit{commits.length !== 1 ? "s" : ""} in this
              project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {commits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No commits yet.{" "}
                <Link
                  href={`/dashboard/ingest?project=${project.id}`}
                  className="text-primary underline"
                >
                  Ingest your first asset
                </Link>
                .
              </p>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[11px] top-0 h-full w-0.5 bg-border" />

                <div className="space-y-4">
                  {commits.map((commit, idx) => (
                    <div key={commit.id} className="relative flex gap-4 pl-8">
                      {/* Dot */}
                      <div
                        className={`absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          idx === 0
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background"
                        }`}
                      >
                        <GitCommitHorizontal className="h-3 w-3" />
                      </div>

                      <div className="min-w-0 flex-1 rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">
                            {commit.change_message || "No message"}
                          </p>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {timeAgo(commit.created_at)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {commit.asset_id.slice(0, 12)}…
                          </Badge>
                          <code className="text-xs text-muted-foreground">
                            {commit.id.slice(0, 8)}
                          </code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collaborators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Collaborators
            </CardTitle>
            <CardDescription>
              {collabs.length} credit{collabs.length !== 1 ? "s" : ""} linked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {collabs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No collaborators tagged yet.
              </p>
            ) : (
              <div className="space-y-3">
                {collabs.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {c.profile?.display_name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.role_title}
                      </p>
                    </div>
                    <Badge
                      variant={
                        c.status === "verified"
                          ? "default"
                          : c.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
