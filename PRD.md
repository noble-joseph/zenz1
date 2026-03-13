# Technical Specification: Unified Creator Portfolio

## 1. System Architecture & Core Philosophy
- **Storage Layer:** Content-Addressable Storage (CAS). The platform does not use filenames; it uses cryptographic hashes.
- **Discovery Engine:** Vector-based "Vibe Search." Convert user search queries into embeddings to match creator styles using `pgvector`.
- **Version Control:**
  - `projects`: High-level container for a creative work.
  - `commits`: Each version of a file/edit. Stores `asset_id`, `parent_commit_id`, and a `metadata_diff` (JSONB).

## 2. Database Schema Requirements (PostgreSQL)
Implement the following tables with strict Row Level Security (RLS):
- **profiles:** `id` (UUID, references auth.users), `role` (enum: creator/hirer), `influence_score` (int, default 0), `public_slug` (varchar, unique).
- **assets:** `hash_id` (PK, SHA-256 string), `storage_url` (text), `phash` (varchar, perceptual hash), `media_type` (enum).
- **projects:** `id` (UUID), `owner_id` (FK to profiles), `title` (varchar), `is_public` (boolean).
- **commits:** `id` (UUID), `project_id` (FK to projects), `asset_id` (FK to assets.hash_id), `parent_id` (FK to commits.id, nullable for root), `change_message` (text).
- **collaborations:** `id` (UUID), `project_id` (FK), `creator_id` (FK), `role_title` (varchar), `status` (enum: pending/verified).

## 3. High-Efficiency Workflows
### A. Ingestion & Deduplication Workflow
1. Client generates SHA-256 hash of the file buffer.
2. Query `assets` table for `hash_id`.
3. If found: Deduplicate. Do not upload. Point the new commit to this existing `hash_id`.
4. If not found: Upload to Cloudinary, retrieve secure URL, insert new row in `assets`.
5. Create new `commit` pointing to the `asset_id`.

### B. The Verified Credit System
- A "Credit" requires an approval workflow. If Creator A tags Creator B in a collaboration, the status is `pending`.
- Creator B must authenticate and accept the tag for it to become `verified`. Only verified credits affect the `influence_score`.
