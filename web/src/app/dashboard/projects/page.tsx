"use client";

import { useEffect, useState } from "react";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Image as ImageIcon, Film, Music, FileText, File, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Project } from "@/lib/types/database";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
// Deleted state vars

  async function load() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      toast.error("Missing Supabase env vars.");
      return;
    }
    const { data, error } = await supabase
      .from("projects")
      .select("id,owner_id,title,slug,description,is_public,tags,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setProjects((data ?? []) as Project[]);
  }

  useEffect(() => {
    void load();

  }, []);

// Create logic moved to /dashboard/projects/new

  async function toggleVisibility(project: Project) {
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Missing Supabase env vars.");

      const { error } = await supabase
        .from("projects")
        .update({ is_public: !project.is_public })
        .eq("id", project.id);
      if (error) throw error;

      toast.success(`Project is now ${!project.is_public ? "public" : "private"}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update project.");
    }
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Missing Supabase env vars.");

      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;

      toast.success("Project deleted.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete project.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Projects are containers for commit history (Git-style). Each project holds
        versioned assets and collaboration credits.
      </p>

      <div className="mt-6 flex justify-between items-center bg-zinc-50 border p-4 rounded-lg">
        <div>
          <h2 className="text-lg font-medium">Create a New Project</h2>
          <p className="text-sm text-zinc-600">Upload your content, generate AI tags, and credit collaborators.</p>
        </div>
        <Link 
          href="/dashboard/projects/new"
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800 transition"
        >
          New Project
        </Link>
      </div>

      <section className="mt-8 grid gap-3">
        {projects.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-zinc-600">
            No projects yet. Create one above.
          </div>
        ) : (
          projects.map((p) => (
            <div key={p.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link href={`/dashboard/projects/${p.id}`} className="text-sm font-semibold hover:underline">{p.title}</Link>
                  {p.slug && (
                    <div className="mt-0.5 text-xs text-zinc-500">/{p.slug}</div>
                  )}
                  {p.description && (
                    <div className="mt-1 text-sm text-zinc-600">{p.description}</div>
                  )}
                  {p.tags && p.tags.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {p.tags.map(t => (
                        <span key={t} className="inline-flex rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 uppercase">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded border px-2 py-1 text-xs hover:bg-zinc-50"
                    onClick={() => void toggleVisibility(p)}
                  >
                    {p.is_public ? "Make private" : "Make public"}
                  </button>
                  <button
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    onClick={() => void deleteProject(p.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      p.is_public
                        ? "bg-green-100 text-green-800"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {p.is_public ? "public" : "private"}
                  </span>
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold uppercase tracking-widest text-[9px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                     <ShieldCheck className="h-3 w-3" />
                     Media Guard Protected
                  </div>
                  <span>id: {p.id}</span>
                </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
