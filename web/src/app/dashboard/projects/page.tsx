"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      toast.error(
        "Missing Supabase env vars. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }
    const { data, error } = await supabase
      .from("projects")
      .select("id,title,description,is_public,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setProjects((data ?? []) as ProjectRow[]);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createProject() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase)
        throw new Error(
          "Missing Supabase env vars. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("Not signed in.");

      const { error } = await supabase.from("projects").insert({
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        is_public: false,
      });
      if (error) throw error;

      toast.success("Project created.");
      setTitle("");
      setDescription("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Projects are containers for commit history (Git-style).
      </p>

      <section className="mt-6 rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Neon Alley"
              disabled={busy}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short pitch"
              disabled={busy}
            />
          </div>
        </div>
        <button
          className="mt-4 rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => void createProject()}
          disabled={busy}
        >
          Create project
        </button>
      </section>

      <section className="mt-8 grid gap-3">
        {projects.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-zinc-600">
            No projects yet.
          </div>
        ) : (
          projects.map((p) => (
            <div key={p.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">{p.title}</div>
                  {p.description && <div className="mt-1 text-sm text-zinc-600">{p.description}</div>}
                </div>
                <div className="text-xs text-zinc-500">{p.is_public ? "public" : "private"}</div>
              </div>
              <div className="mt-2 text-xs text-zinc-500">id: {p.id}</div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

