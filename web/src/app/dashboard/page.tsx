"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderGit2,
  Image as ImageIcon,
  GitCommitHorizontal,
  Users,
  ArrowRight,
  Clock,
} from "lucide-react";

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

interface DashboardStats {
  projectCount: number;
  assetCount: number;
  commitCount: number;
  collabCount: number;
}

interface RecentCommit {
  id: string;
  change_message: string;
  created_at: string;
  project_title: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCommits, setRecentCommits] = useState<RecentCommit[]>([]);
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

        // Fetch counts in parallel
        const [projectsRes, assetsRes, commitsRes, collabsRes] =
          await Promise.all([
            supabase
              .from("projects")
              .select("id", { count: "exact", head: true })
              .eq("owner_id", user.id),
            supabase
              .from("assets")
              .select("hash_id", { count: "exact", head: true })
              .eq("created_by", user.id),
            supabase
              .from("commits")
              .select("id", { count: "exact", head: true })
              .eq("created_by", user.id),
            supabase
              .from("collaborations")
              .select("id", { count: "exact", head: true })
              .eq("creator_id", user.id)
              .eq("status", "verified"),
          ]);

        setStats({
          projectCount: projectsRes.count ?? 0,
          assetCount: assetsRes.count ?? 0,
          commitCount: commitsRes.count ?? 0,
          collabCount: collabsRes.count ?? 0,
        });

        // Fetch recent commits with project title
        const { data: commits } = await supabase
          .from("commits")
          .select("id, change_message, created_at, project_id")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (commits && commits.length > 0) {
          // Fetch project titles
          const projectIds = [
            ...new Set(commits.map((c) => c.project_id)),
          ];
          const { data: projects } = await supabase
            .from("projects")
            .select("id, title")
            .in("id", projectIds);

          const projectMap = new Map(
            (projects ?? []).map((p) => [p.id, p.title]),
          );

          setRecentCommits(
            commits.map((c) => ({
              id: c.id,
              change_message: c.change_message,
              created_at: c.created_at,
              project_title: projectMap.get(c.project_id) ?? "Unknown",
            })),
          );
        }
      } catch {
        // Stats loading failed silently
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const statCards = [
    {
      label: "Projects",
      value: stats?.projectCount ?? 0,
      icon: FolderGit2,
      href: "/dashboard/projects",
      color: "text-blue-600",
    },
    {
      label: "Assets",
      value: stats?.assetCount ?? 0,
      icon: ImageIcon,
      href: "/dashboard/assets",
      color: "text-emerald-600",
    },
    {
      label: "Commits",
      value: stats?.commitCount ?? 0,
      icon: GitCommitHorizontal,
      href: "/dashboard/projects",
      color: "text-violet-600",
    },
    {
      label: "Verified Credits",
      value: stats?.collabCount ?? 0,
      icon: Users,
      href: "/dashboard/credits",
      color: "text-amber-600",
    },
  ];

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

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your creative workspace at a glance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-sm font-medium">
                  {stat.label}
                </CardDescription>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Commits */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Recent Commits
            </CardTitle>
            <CardDescription>Latest changes across your projects.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentCommits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No commits yet. Start by{" "}
                <Link
                  href="/dashboard/ingest"
                  className="text-primary underline"
                >
                  ingesting an asset
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-3">
                {recentCommits.map((commit) => (
                  <div
                    key={commit.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <GitCommitHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {commit.change_message || "No message"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {commit.project_title}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(commit.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-between" render={<Link href="/dashboard/projects" />} nativeButton={false}>
              Create a project
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-between" render={<Link href="/dashboard/ingest" />} nativeButton={false}>
              Ingest an asset
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="justify-between" render={<Link href="/dashboard/settings" />} nativeButton={false}>
              Edit profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
