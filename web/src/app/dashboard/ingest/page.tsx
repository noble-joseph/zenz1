"use client";

import { useState, useCallback, useEffect, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { sha256Hex, detectMediaType } from "@/lib/hashing";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getEmbeddingAction } from "@/app/actions/embeddings";
import type { IngestResult, MediaType } from "@/lib/types/database";

type PageResult =
  | { ok: true; data: IngestResult }
  | { ok: false; error: string };

export default function IngestPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PageResult | null>(null);
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [commitMessage, setCommitMessage] = useState("ingest(asset): add file");
  const [dragActive, setDragActive] = useState(false);

  async function loadProjects() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const { data } = await supabase.from("projects").select("id, title").order("created_at", { ascending: false });
    if (data) {
      setProjects(data);
      if (data.length > 0 && !projectId) {
        setProjectId(data[0].id);
      }
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  // ---- Cloudinary Signing ----

  async function signCloudinaryUpload(publicId: string) {
    const res = await fetch("/api/cloudinary/sign", { 
      method: "POST",
      body: JSON.stringify({ publicId })
    });
    if (!res.ok) throw new Error("Failed to sign Cloudinary upload.");
    const json = (await res.json()) as
      | {
          ok: true;
          cloudName: string;
          apiKey: string;
          timestamp: number;
          folder: string;
          signature: string;
        }
      | { ok: false; message: string };
    if (!json.ok) throw new Error(json.message);
    return json;
  }

  async function uploadToCloudinary(file: File, publicId: string, mediaType: MediaType): Promise<string> {
    const signed = await signCloudinaryUpload(publicId);
    
    // Map mediaType to Cloudinary resource types
    // Cloudinary treats audio as 'video' resource type
    let resourceType = "raw";
    if (mediaType === "image") resourceType = "image";
    else if (mediaType === "video" || mediaType === "audio") resourceType = "video";

    const url = `https://api.cloudinary.com/v1_1/${signed.cloudName}/${resourceType}/upload`;
    
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("folder", signed.folder);
    form.append("public_id", publicId);
    form.append("signature", signed.signature);

    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Cloudinary upload failed: ${errorData.error?.message || res.statusText}`);
    }
    const json = (await res.json()) as { secure_url?: string; url?: string };
    const out = json.secure_url ?? json.url;
    if (!out) throw new Error("Cloudinary did not return a URL.");
    return out;
  }

  // ---- Core Ingestion Pipeline ----

  async function ingestFile(file: File) {
    setBusy(true);
    setResult(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        throw new Error(
          "Missing Supabase env vars. Copy .env.example to .env.local and configure.",
        );
      }
      if (!projectId.trim()) {
        throw new Error("Project ID is required (create one in /dashboard/projects).");
      }

      // UUID validation (basic regex)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(projectId.trim())) {
        throw new Error("Invalid Project ID format. It should be a standard UUID.");
      }

      // Step 1: SHA-256 hash (binary integrity)
      const hash = await sha256Hex(file);
      const mediaType: MediaType = detectMediaType(file.type);

      // Step 2: Deduplicate against storage — check if asset already exists
      const { data: existing, error: lookupError } = await supabase
        .from("assets")
        .select("hash_id, storage_url")
        .eq("hash_id", hash)
        .maybeSingle();

      if (lookupError) throw lookupError;

      let storageUrl: string;
      let reused: boolean;
      let mgParentId: string | null = null;
      let mgAction: string | null = null;

      if (existing) {
        // Dedup hit: reuse existing asset completely
        storageUrl = existing.storage_url;
        reused = true;
        toast.info("Storage: Reusing existing asset based on hash.");
      } else {
        // Not a perfect hash match in our main assets table.
        // Let's check Media Guard first. Wait, we need the Cloudinary URL to save it if it's new.
        // So we will upload to Cloudinary first. Yes, this means the very first exact collision 
        // across users might double-upload to Cloudinary, but the DB will reuse it.
        storageUrl = await uploadToCloudinary(file, hash, mediaType);
        reused = false;

        // Step 3: Media Guard Tracking (Images and Audio only)
        if (mediaType === "image" || mediaType === "audio") {
          toast.loading("Media Guard analyzing asset...", { id: "mg" });
          try {
            const form = new FormData();
            form.append("file", file);
            form.append("storage_url", storageUrl); // Pass the URL to save it!

            const mgRes = await fetch("/api/media-guard", {
              method: "POST",
              body: form,
            });

            if (mgRes.ok) {
              const mgData = await mgRes.json() as any;
              mgAction = mgData.action;
              mgParentId = mgData.parent_id || null;

              if (mgAction === "exact_match") {
                // Wait, it WAS an exact match globally? Override the Cloudinary URL to reuse the original!
                storageUrl = mgData.asset.storage_url || storageUrl;
                reused = true;
                toast.success("Media Guard: Exact global match verified. Reusing master.");
              } else if (mgAction === "similar_match") {
                toast.info(`Media Guard: Derivative linked to parent ${mgParentId?.split("-")[0]}`);
              } else {
                toast.success("Media Guard: New master asset tracked.");
              }
            } else {
              console.warn("Media Guard API failed:", await mgRes.text());
              toast.error("Media Guard tracking failed, but upload will continue.");
            }
          } catch (err) {
            console.error("Media Guard Error:", err);
            toast.error("Media Guard analysis encountered an error.");
          } finally {
            toast.dismiss("mg");
          }
        }

        // Generate AI Embedding for the Vibe Search
        const semanticContext = `Media Type: ${mediaType}. Filename: ${file.name}. Context: ${commitMessage.trim()}`;
        const embeddingRes = await getEmbeddingAction(semanticContext);
        
        const assetPayload: any = {
          hash_id: hash,
          storage_url: storageUrl,
          media_type: mediaType,
          metadata: {
            originalName: file.name,
            size: file.size,
            type: file.type,
            parent_id: mgParentId,
            mg_action: mgAction
          },
        };

        if (embeddingRes.ok && embeddingRes.vector && embeddingRes.vector.length > 0) {
           assetPayload.embedding = embeddingRes.vector;
        } else {
           // If key is missing, generateEmbedding returns [], so we just skip.
           // Only show error if it was a real API failure (not missing key).
           if (!embeddingRes.ok) {
             toast.error("Warning: Could not generate AI search embedding.");
           }
        }

        // Insert asset row
        const { error: insertAssetError } = await supabase.from("assets").insert(assetPayload);
        if (insertAssetError) throw insertAssetError;
      }

      // Step 3: Get current user
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("Not signed in.");

      // Step 4: Find parent commit (latest in this project)
      const { data: parentCommit } = await supabase
        .from("commits")
        .select("id")
        .eq("project_id", projectId.trim())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Step 5: Create commit
      const { data: commit, error: commitErr } = await supabase
        .from("commits")
        .insert({
          project_id: projectId.trim(),
          asset_id: hash,
          parent_id: parentCommit?.id ?? null,
          change_message: commitMessage.trim() || "ingest(asset): add file",
          metadata_diff: { asset: { inserted: !reused, reused } },
          created_by: user.id,
        })
        .select("id")
        .single();
      if (commitErr) throw commitErr;

      setResult({
        ok: true,
        data: {
          hash,
          reused,
          storageUrl,
          commitId: commit.id,
        },
      });
      toast.success(reused ? "Dedup + committed." : "Uploaded + committed.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong during ingestion.";
      setResult({ ok: false, error: message });
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  // ---- File Input Handlers ----

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void ingestFile(file);
    e.target.value = "";
  }

  // ---- Drag & Drop ----

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void ingestFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId, commitMessage],
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Ingest (Hash-first)</h1>
      <p className="mt-2 text-sm text-zinc-600">
        SHA-256 → dedupe check → Cloudinary upload → commit. Every file is
        content-addressed; identical binaries are never stored twice.
      </p>

      <div className="mt-6 rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Project</label>
            <select
              id="ingest-project-id"
              className="mt-2 block w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={projectId}
              onChange={(ev) => setProjectId(ev.target.value)}
              disabled={busy}
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            {projects.length === 0 && !busy && (
              <p className="mt-2 text-xs text-red-600">
                You don&apos;t have any projects yet.{" "}
                <Link href="/dashboard/projects" className="underline font-bold">
                  Create one here
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Commit message</label>
            <input
              id="ingest-commit-message"
              className="mt-2 block w-full rounded-md border px-3 py-2 text-sm"
              value={commitMessage}
              onChange={(ev) => setCommitMessage(ev.target.value)}
              disabled={busy}
            />
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div
          className={`mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragActive
              ? "border-black bg-zinc-50"
              : "border-zinc-300 hover:border-zinc-400"
          } ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() =>
            !busy && document.getElementById("ingest-file-input")?.click()
          }
        >
          <svg
            className="mb-2 h-8 w-8 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6h.1a5 5 0 0 1 1 9.9M15 13l-3-3m0 0-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm font-medium">
            {busy ? "Processing…" : "Drop a file here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Supports images, videos, audio, and documents.
          </p>
        </div>

        <input
          id="ingest-file-input"
          className="hidden"
          type="file"
          onChange={onPickFile}
          disabled={busy}
        />
      </div>

      {result && (
        <div className="mt-6 rounded-lg border p-4 text-sm">
          {result.ok ? (
            <div className="space-y-1">
              <div>
                <span className="font-medium">hash:</span>{" "}
                <code className="text-xs">{result.data.hash}</code>
              </div>
              <div>
                <span className="font-medium">dedupe:</span>{" "}
                {result.data.reused ? "reused existing asset" : "inserted new asset"}
              </div>
              {result.data.commitId && (
                <div>
                  <span className="font-medium">commit:</span>{" "}
                  <code className="text-xs">{result.data.commitId}</code>
                </div>
              )}
              <div>
                <span className="font-medium">storage:</span>{" "}
                <a
                  href={result.data.storageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  view asset
                </a>
              </div>
            </div>
          ) : (
            <div className="text-red-600">{result.error}</div>
          )}
        </div>
      )}
    </main>
  );
}
