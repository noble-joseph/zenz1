-- ============================================================================
-- Add tags to projects
-- ============================================================================

ALTER TABLE public.projects 
ADD COLUMN tags text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.projects.tags IS 'AI generated or user-provided tags for the project.';
