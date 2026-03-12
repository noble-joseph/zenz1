# Talent OS (Unified Creator Portfolio) – MVP

This repo contains:

- `web/`: Next.js 15 (App Router) frontend (TypeScript + Tailwind)
- `supabase/`: SQL migrations for the core schema + RLS
- `.cursor/rules/`: Cursor rules enforcing the platform architecture

## Run the web app

From `web/`:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

Pages:

- `/` home
- `/demo` public SEO demo portfolio page
- `/dashboard` creator dashboard shell
- `/dashboard/ingest` hash-first ingestion demo (dedupe against `assets.hash_id`)

## Supabase

- Apply `supabase/migrations/0001_init.sql` to your Supabase project.
- Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `web/.env.local`.

### Notes

- **Uploads are stubbed** in the MVP (`cloudinary://stub/<sha256>`). Next step is wiring a server action/API route to upload to Cloudinary and insert `assets`.
- **Commits require auth + a project**. The ingestion page currently demonstrates hashing + dedupe + asset insert only.

