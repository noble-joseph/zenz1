"use client";

import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { sha256Hex } from "@/lib/hashing";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type IngestResult =
  | { ok: true; hash: string; reused: boolean; commitId?: string }
  | { ok: false; message: string };

export default function IngestPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [projectId, setProjectId] = useState("");
  const [commitMessage, setCommitMessage] = useState("ingest(asset): add file");

  async function signCloudinaryUpload() {
    const res = await fetch("/api/cloudinary/sign", { method: "POST" });
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

  async function uploadToCloudinary(file: File, publicId: string): Promise<string> {
    const signed = await signCloudinaryUpload();
    const url = `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`;
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("folder", signed.folder);
    form.append("public_id", publicId);
    form.append("signature", signed.signature);

    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) throw new Error("Cloudinary upload failed.");
    const json = (await res.json()) as { secure_url?: string; url?: string };
    const out = json.secure_url ?? json.url;
    if (!out) throw new Error("Cloudinary did not return a URL.");
    return out;
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setResult(null);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase)
        throw new Error(
          "Missing Supabase env vars. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
      if (!projectId.trim()) throw new Error("Project ID is required (create one in /dashboard/projects).");

      const hash = await sha256Hex(file);

      const { data: existing, error: lookupError } = await supabase
        .from("assets")
        .select("hash_id, storage_url")
        .eq("hash_id", hash)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing) {
        setResult({ ok: true, hash, reused: true });
        toast.success("Dedup hit: reused existing asset.");
        return;
      }

      const storageUrl = await uploadToCloudinary(file, hash);

      const { error: insertAssetError } = await supabase.from("assets").insert({
        hash_id: hash,
        storage_url: storageUrl,
        metadata: {
          originalName: file.name,
          size: file.size,
          type: file.type,
        },
      });
      if (insertAssetError) throw insertAssetError;

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("Not signed in.");

      const { data: parentCommit } = await supabase
        .from("commits")
        .select("id")
        .eq("project_id", projectId.trim())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: commit, error: commitErr } = await supabase
        .from("commits")
        .insert({
          project_id: projectId.trim(),
          asset_id: hash,
          parent_id: parentCommit?.id ?? null,
          message: commitMessage.trim() || "ingest(asset): add file",
          metadata_diff: { asset: { inserted: true } },
          created_by: user.id,
        })
        .select("id")
        .single();
      if (commitErr) throw commitErr;

      setResult({ ok: true, hash, reused: false, commitId: commit.id });
      toast.success("Uploaded + committed.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong during ingestion.";
      setResult({ ok: false, message });
      toast.error(message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Ingest (Hash-first)</h1>
      <p className="mt-2 text-sm text-zinc-600">
        This computes SHA-256 in the browser, checks `assets.hash_id` for dedupe, uploads to
        Cloudinary using a server-signed signature, then appends a `commits` row.
      </p>

      <div className="mt-6 rounded-lg border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Project ID</label>
            <input
              className="mt-2 block w-full rounded-md border px-3 py-2 text-sm"
              value={projectId}
              onChange={(ev) => setProjectId(ev.target.value)}
              placeholder="Paste from /dashboard/projects"
              disabled={busy}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Commit message</label>
            <input
              className="mt-2 block w-full rounded-md border px-3 py-2 text-sm"
              value={commitMessage}
              onChange={(ev) => setCommitMessage(ev.target.value)}
              disabled={busy}
            />
          </div>
        </div>

        <label className="mt-4 block text-sm font-medium">Pick a file</label>
        <input
          className="mt-2 block w-full text-sm"
          type="file"
          onChange={onPickFile}
          disabled={busy}
        />
        <p className="mt-2 text-xs text-zinc-500">
          Requires Supabase public env vars. Cloudinary vars are required for real uploads.
        </p>
      </div>

      {result && (
        <div className="mt-6 rounded-lg border p-4 text-sm">
          {result.ok ? (
            <div className="space-y-1">
              <div>
                <span className="font-medium">hash:</span> {result.hash}
              </div>
              <div>
                <span className="font-medium">dedupe:</span>{" "}
                {result.reused ? "reused existing asset" : "inserted new asset"}
              </div>
              {result.commitId && (
                <div>
                  <span className="font-medium">commit:</span> {result.commitId}
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-600">{result.message}</div>
          )}
        </div>
      )}
    </main>
  );
}

