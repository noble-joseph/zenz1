// ============================================================================
// Talent OS — Shared TypeScript Types (mirrors the Supabase schema)
// ============================================================================

// --- Enum types (match Postgres custom enums) ---

export type UserRole = "creator" | "hirer";
export type MediaType = "image" | "video" | "audio" | "document" | "other";
export type CollabStatus = "pending" | "verified" | "rejected";

// --- Row types ---

export interface Profile {
  id: string;                    // UUID, references auth.users
  role: UserRole;
  display_name: string | null;
  profession: string | null;     // 'Cinematographer', 'Musician', etc.
  bio: string | null;
  avatar_url: string | null;
  public_slug: string | null;   // unique, URL-safe
  specializations: string[];
  achievements: string[];
  influence_score: number;
  created_at: string;            // ISO 8601 timestamptz
  updated_at: string;
}

export interface Asset {
  hash_id: string;               // SHA-256 hex digest (PK)
  storage_url: string;
  phash: string | null;          // perceptual hash
  media_type: MediaType;
  metadata: AssetMetadata;
  created_by: string | null;     // UUID
  created_at: string;
}

export interface AssetMetadata {
  originalName?: string;
  size?: number;
  type?: string;                 // MIME type
  width?: number;
  height?: number;
  duration?: number;             // seconds, for audio/video
  [key: string]: unknown;
}

export interface Project {
  id: string;                    // UUID
  owner_id: string;              // FK to profiles
  title: string;
  slug: string | null;
  description: string | null;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Commit {
  id: string;                    // UUID
  project_id: string;            // FK to projects
  asset_id: string;              // FK to assets.hash_id
  parent_id: string | null;      // FK to commits.id (null for root)
  change_message: string;
  metadata_diff: Record<string, unknown>;
  created_by: string;            // FK to profiles
  created_at: string;
}

export interface Collaboration {
  id: string;                    // UUID
  project_id: string;            // FK to projects
  creator_id: string;            // FK to profiles (the tagged creator)
  requested_by: string;          // FK to profiles (who initiated the tag)
  role_title: string;
  status: CollabStatus;
  created_at: string;
  updated_at: string;
}

// --- API response types ---

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// --- Ingestion pipeline types ---

export interface IngestResult {
  hash: string;
  reused: boolean;
  storageUrl: string;
  commitId: string | null;
}

export interface DedupeCheckResult {
  exists: boolean;
  asset: Pick<Asset, "hash_id" | "storage_url"> | null;
}
