// ============================================================================
// Talent OS — Shared TypeScript Types (mirrors the Supabase schema)
// ============================================================================

// --- Enum types (match Postgres custom enums) ---

export type UserRole = "creator" | "hirer";
export type MediaType = "image" | "video" | "audio" | "document" | "other";
export type CollabStatus = "pending" | "verified" | "rejected";

export type AvailabilityStatus = "available" | "busy" | "not_available";

export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  twitter?: string;
  linkedin?: string;
  spotify?: string;
  soundcloud?: string;
  imdb?: string;
  behance?: string;
  vimeo?: string;
  [key: string]: string | undefined;
}

export interface ExperienceEntry {
  title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  description: string;
  current: boolean;
}

export interface PortfolioOrder {
  sections: string[];
  pinnedProjects: string[];
}

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
  
  // New Portfolio Fields
  cover_url: string | null;
  phone: string | null;
  location: string | null;
  website_url: string | null;
  social_links: SocialLinks;
  experience: ExperienceEntry[];
  equipment: string[];
  languages: string[];
  availability_status: AvailabilityStatus;
  portfolio_order: PortfolioOrder;

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
  
  // New Project Fields
  cover_url: string | null;
  client: string | null;
  role: string | null;
  thumbnail_asset_id: string | null;
  equipment: string[];

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

export type ConnectionStatus = "pending" | "accepted" | "rejected";

export interface Connection {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
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

// --- Media Guard types ---

export interface MediaAsset {
  id: string;
  sha256_hash: string;
  media_type: "image" | "audio";
  p_hash: string | null;
  audio_fingerprint: string | null;
  vibe_vector: number[] | null;
  parent_id: string | null;
  created_by: string | null;
  metadata: AssetMetadata;
  created_at: string;
}

export interface GuardResult {
  action: "new" | "exact_match" | "direct_version" | "remix" | "sample";
  asset: MediaAsset & { storage_url?: string }; // Include storage_url for easier access
  similarity?: number;
  parent_id?: string;
}
