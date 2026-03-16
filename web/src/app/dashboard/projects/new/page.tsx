"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, X, Wand2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { sha256Hex, detectMediaType } from "@/lib/hashing";
import { getEmbeddingAction as _getEmbeddingAction } from "@/app/actions/embeddings";
import { generateProjectMetadataAction } from "@/app/actions/ai";
import type { MediaType } from "@/lib/types/database";

export default function NewProjectPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  
  // Profile
  const [userId, setUserId] = useState<string>("");
  const [profession, setProfession] = useState<string>("");
  
  // Meta
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  
  // Files
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  
  // Collaborators
  const [collaborators, setCollaborators] = useState<{ slug: string; role: string }[]>([]);
  const [collabSlug, setCollabSlug] = useState("");
  const [collabRole, setCollabRole] = useState("collaborator");

  // On Mount
  useEffect(() => {
    async function loadProfile() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not signed in.");
        router.push("/dashboard");
        return;
      }
      setUserId(user.id);
      
      const { data: profile } = await supabase.from("profiles").select("profession").eq("id", user.id).single();
      if (profile?.profession) {
        setProfession(profile.profession);
      }
    }
    loadProfile();
  }, [router]);

  // Add Tag
  const handleAddTag = () => {
    const term = tagInput.trim().toLowerCase();
    if (term && !tags.includes(term)) {
      setTags([...tags, term]);
      setTagInput("");
    }
  };

  // Add Collaborator
  const handleAddCollaborator = () => {
    const s = collabSlug.trim().toLowerCase();
    const r = collabRole.trim() || "collaborator";
    if (s) {
      setCollaborators([...collaborators, { slug: s, role: r }]);
      setCollabSlug("");
      setCollabRole("collaborator");
    }
  };

  // File Handlers
  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const added = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...added]);
    }
  };
  
  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setThumbnailFile(e.target.files[0]);
    }
  };
  
  const removeFile = (idx: number) => {
    const nf = [...files];
    nf.splice(idx, 1);
    setFiles(nf);
  };

  // AI Metadata Generation
  const handleGenerateMetadata = async () => {
    if (files.length === 0 && !thumbnailFile) {
      toast.error("Add some files first so the AI knows what your project is about.");
      return;
    }
    
    setBusy(true);
    const toastId = toast.loading("Generating description and tags...");
    try {
      const fileInfos = files.map(f => ({ name: f.name, type: f.type }));
      if (thumbnailFile) {
        fileInfos.push({ name: thumbnailFile.name, type: thumbnailFile.type });
      }
      
      const res = await generateProjectMetadataAction(fileInfos, profession);
      if (res.ok && res.data) {
        if (!description) setDescription(res.data.description);
        
        const newTags = new Set(tags);
        res.data.tags.forEach(t => newTags.add(t.toLowerCase()));
        setTags(Array.from(newTags));
        
        toast.success("Metadata generated!", { id: toastId });
      } else {
        toast.error("Failed to generate metadata.", { id: toastId });
      }
    } catch (_err) {
      toast.error("Something went wrong.", { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  // Cloudinary helpers
  async function signCloudinaryUpload(publicId: string) {
    const res = await fetch("/api/cloudinary/sign", { method: "POST", body: JSON.stringify({ publicId }) });
    if (!res.ok) throw new Error("Failed to sign Cloudinary upload.");
    const json = await res.json();
    if (!json.ok) throw new Error(json.message);
    return json;
  }

  async function uploadToCloudinary(file: File, publicId: string, mediaType: MediaType): Promise<string> {
    const signed = await signCloudinaryUpload(publicId);
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
      const errData = await res.json().catch(()=>({}));
      throw new Error(`Cloudinary error: ${errData.error?.message || res.statusText}`);
    }
    const json = await res.json();
    return json.secure_url ?? json.url;
  }

  // ---- Video Frame Extraction (Client-side) ----
  async function extractVideoFrame(file: File): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 2);
      };
      
      video.onseeked = () => {
        if (!ctx) return resolve(null);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          resolve(blob);
        }, "image/jpeg", 0.8);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };
    });
  }

  // Upload Single File using Media Guard Pipeline
  const processAndUploadFile = async (
    file: File, 
    projectId: string, 
    supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    commitMessage: string
  ): Promise<void> => {
    const hash = await sha256Hex(file);
    const mediaType: MediaType = detectMediaType(file.type);
    
    // 1. Prepare Media Guard Check
    const mgForm = new FormData();
    mgForm.append("hash", hash);

    let videoFrame: Blob | null = null;
    if (file.type.startsWith("video/")) {
      videoFrame = await extractVideoFrame(file);
      if (videoFrame) mgForm.append("frame", videoFrame, "frame.jpg");
    }

    // 2. Global Registry Pre-Check
    let storageUrl = "";
    let reused = false;
    let p_hash = "";
    const sha256_hash = hash;

    try {
      const preRes = await fetch("/api/media-guard", { method: "POST", body: mgForm });
      if (preRes.ok) {
        const preData = await preRes.json();
        if (preData.action === "exact_match" && preData.asset?.storage_url) {
          storageUrl = preData.asset.storage_url;
          reused = true;
          toast.info(`Media Guard: Exact match found for ${file.name}. Linking protection.`);
        }
      }
    } catch (err) {
      console.warn("Media Guard Pre-check failed, proceeding with fresh check:", err);
    }

    // 3. Upload if not reused
    if (!reused) {
      storageUrl = await uploadToCloudinary(file, hash, mediaType);
      
      // Full Media Guard Guarding (Stage 2/3)
      const fullMgForm = new FormData();
      fullMgForm.append("file", file);
      fullMgForm.append("storage_url", storageUrl);
      if (videoFrame) fullMgForm.append("frame", videoFrame, "frame.jpg");

      const mgRes = await fetch("/api/media-guard", { method: "POST", body: fullMgForm });
      if (mgRes.ok) {
        const mgData = await mgRes.json();
        p_hash = mgData.asset?.p_hash || "";
        
        if (mgData.action === "remix" || mgData.action === "direct_version" || mgData.action === "exact_match") {
          reused = true;
          storageUrl = mgData.parent_storage_url || storageUrl;
          toast.info(`Media Guard: ${mgData.action.replace("_", " ")} detected. Linking original protection.`);
        }
      } else {
        const errData = await mgRes.json().catch(() => ({}));
        console.error("Media Guard API Error Details:", errData);
        throw new Error(`Media Guard DNA Check Failed: ${errData.details || mgRes.statusText}`);
      }
    }

    // 4. Sync with local 'assets' table (for Project system)
    const assetPayload = {
      hash_id: hash,
      storage_url: storageUrl,
      media_type: mediaType,
      metadata: { originalName: file.name, size: file.size, type: file.type },
      created_by: userId,
      phash: p_hash || null,
    };

    const { error: insErr } = await supabase.from("assets").upsert(assetPayload, { onConflict: "hash_id" });
    if (insErr) throw insErr;
    
    // 5. Commit
    const { data: parentCommit } = await supabase.from("commits").select("id").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    
    const { error: cmtErr } = await supabase.from("commits").insert({
      project_id: projectId,
      asset_id: hash,
      parent_id: parentCommit?.id ?? null,
      change_message: commitMessage,
      metadata_diff: { asset: { inserted: !reused, reused } },
      created_by: userId,
    });
    
    if (cmtErr) throw cmtErr;
  };

  // Main Submit
  const handleSubmit = async () => {
    if (!title.trim()) return toast.error("Title is required.");
    
    if (isCinematographer && files.some(f => !f.type.startsWith("image/"))) {
      return toast.error("Cinematographers can only upload image files.");
    }
    if (isMusician && files.some(f => !f.type.startsWith("audio/"))) {
      return toast.error("Musicians can only upload audio files for the primary assets.");
    }
    if (files.length === 0) {
      return toast.error("Please upload at least one file.");
    }

    setBusy(true);
    const t = toast.loading("Creating project...");

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Missing Supabase client");

      // 1. Create Project
      let finalSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      
      let { data: pData, error: pErr } = await supabase.from("projects").insert({
        owner_id: userId,
        title: title.trim(),
        slug: finalSlug || null,
        description: description.trim() || null,
        is_public: isPublic,
        tags: tags,
      }).select("id").single();
      
      if (pErr && pErr.code === "23505") {
        // Handle duplicate key: add random suffix
        const suffix = Math.random().toString(36).substring(2, 6);
        finalSlug = `${finalSlug}-${suffix}`;
        const retry = await supabase.from("projects").insert({
          owner_id: userId,
          title: title.trim(),
          slug: finalSlug,
          description: description.trim() || null,
          is_public: isPublic,
          tags: tags,
        }).select("id").single();
        pData = retry.data;
        pErr = retry.error;
      }

      if (pErr) throw pErr;
      if (!pData) throw new Error("Failed to create project: No data returned.");
      const projectId = pData.id;

      // 2. Upload Files
      toast.loading(`Uploading ${files.length + (thumbnailFile ? 1 : 0)} files...`, { id: t });
      
      for (const f of files) {
        await processAndUploadFile(f, projectId, supabase, `Add ${f.name}`);
      }
      
      if (thumbnailFile) {
        await processAndUploadFile(thumbnailFile, projectId, supabase, `Add cover art ${thumbnailFile.name}`);
      }

      // 3. Add Collaborators
      if (collaborators.length > 0) {
        toast.loading("Tagging collaborators...", { id: t });
        
        for (const collab of collaborators) {
          // Look up user by slug
          const { data: profile } = await supabase.from("profiles").select("id").eq("public_slug", collab.slug).maybeSingle();
          if (profile) {
            await supabase.from("collaborations").insert({
              project_id: projectId,
              creator_id: profile.id,
              requested_by: userId,
              role_title: collab.role,
              status: "pending"
            }).select().maybeSingle();
          } else {
            console.warn(`Collaborator slug ${collab.slug} not found.`);
          }
        }
      }

      toast.success("Project published successfully!", { id: t });
      router.push(`/dashboard/projects`);
      
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to create project", { id: t });
    } finally {
      setBusy(false);
    }
  };

  const isCinematographer = profession.toLowerCase().includes("cinematographer");
  const isMusician = profession.toLowerCase().includes("musician");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create a New Project</h1>
        <p className="mt-2 text-zinc-600">
          Upload your files, set metadata, and tag collaborators all in one place.
        </p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        {/* Left Column: Details */}
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Project Details</h2>
            
            <div>
              <label className="text-sm font-medium">Title *</label>
              <input 
                className="mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm" 
                placeholder="My Awesome Project" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                disabled={busy}
              />
            </div>
            
            <div className="relative">
              <label className="text-sm font-medium">Description</label>
              <textarea 
                className="mt-1 flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm" 
                placeholder="What is this project about?" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                disabled={busy}
              />
              <button 
                type="button"
                onClick={handleGenerateMetadata}
                disabled={busy}
                className="absolute right-2 top-8 text-indigo-600 hover:text-indigo-800 disabled:opacity-50 flex items-center gap-1 text-xs font-medium bg-white p-1 rounded"
              >
                <Wand2 className="h-3 w-3" /> Auto
              </button>
            </div>
            
            <div>
              <label className="text-sm font-medium">Tags</label>
              <div className="mt-1 flex gap-2">
                <input 
                  className="flex h-10 w-full rounded-md border px-3 py-2 text-sm" 
                  placeholder="e.g. cinematic, upbeat..." 
                  value={tagInput} 
                  onChange={(e) => setTagInput(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  disabled={busy}
                />
                <button 
                  type="button" 
                  onClick={handleAddTag} 
                  className="rounded-md bg-zinc-100 px-3 py-2 hover:bg-zinc-200"
                  disabled={busy}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      {t}
                      <button type="button" onClick={() => setTags(tags.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3 opacity-70 hover:opacity-100" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded border-zinc-300" />
              <span className="text-sm">Make project public</span>
            </label>
          </section>

          <section className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Collaborators</h2>
            <p className="text-xs text-zinc-500">Tag other creators who worked on this. They will need to approve.</p>
            
            <div className="flex gap-2">
              <input 
                className="flex h-9 w-[120px] rounded-md border px-3 py-1 text-sm" 
                placeholder="User slug" 
                value={collabSlug} 
                onChange={(e) => setCollabSlug(e.target.value)} 
              />
              <input 
                className="flex h-9 flex-1 rounded-md border px-3 py-1 text-sm" 
                placeholder="Role (e.g. Editor)" 
                value={collabRole} 
                onChange={(e) => setCollabRole(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCollaborator())}
              />
              <button 
                type="button" 
                onClick={handleAddCollaborator} 
                className="rounded-md bg-zinc-100 px-3 hover:bg-zinc-200 inline-flex items-center"
              >
                Add
              </button>
            </div>
            
            {collaborators.length > 0 && (
              <ul className="mt-3 space-y-2">
                {collaborators.map((c, i) => (
                  <li key={i} className="flex justify-between items-center bg-zinc-50 p-2 rounded text-sm">
                    <span><span className="font-semibold">@{c.slug}</span> — {c.role}</span>
                    <button type="button" onClick={() => setCollaborators(collaborators.filter((_, idx) => idx !== i))} className="text-zinc-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right Column: Files */}
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Assets</h2>
            
            <div>
              <label className="text-sm font-medium mb-2 block">
                Primary Files {isCinematographer && "(Images/Videos)"} {isMusician && "(Audio)"}
              </label>
              <div className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 p-8 hover:bg-zinc-50 transition min-h-[150px]">
                <Plus className="h-8 w-8 text-zinc-400 mb-2" />
                <span className="text-sm text-zinc-500">Click to upload files</span>
                <input 
                  type="file" 
                  multiple 
                  className="absolute inset-0 cursor-pointer opacity-0" 
                  accept={isCinematographer ? "image/*" : isMusician ? "audio/*" : "*/*"}
                  onChange={handleFilesChange}
                  disabled={busy}
                />
              </div>
            </div>

            {files.length > 0 && (
              <ul className="max-h-[200px] overflow-y-auto space-y-2 p-1 border border-zinc-200 rounded-md">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-zinc-50 p-2 rounded">
                    <span className="truncate max-w-[80%]">{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-zinc-500 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {isMusician && (
              <div className="pt-4 border-t">
                 <label className="text-sm font-medium mb-2 flex justify-between">
                   Thumbnail / Cover Art
                   {thumbnailFile && <span className="text-indigo-600 font-normal">Selected</span>}
                 </label>
                 <div className="relative mt-2 flex h-[80px] w-full items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50">
                    <span className="text-xs text-zinc-500">{thumbnailFile ? thumbnailFile.name : "+ Upload image"}</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={handleThumbnailChange}
                      disabled={busy}
                    />
                 </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="flex justify-end pt-4 gap-4 border-t">
        <button 
          className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-md transition"
          onClick={() => router.back()}
          disabled={busy}
        >
          Cancel
        </button>
        <button 
          className="flex items-center gap-2 bg-black px-6 py-2 text-sm font-medium text-white rounded-md transition hover:bg-zinc-800 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={busy}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Publish SDK Project
        </button>
      </div>
    </main>
  );
}
