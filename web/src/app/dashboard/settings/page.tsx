"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, User } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Profile, UserRole } from "@/lib/types/database";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile| null>(null);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [profession, setProfession] = useState("");
  const [specializations, setSpecializations] = useState("");
  const [achievements, setAchievements] = useState("");
  const [role, setRole] = useState<UserRole>("creator");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? null);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      const prof = data as Profile;
      setProfile(prof);
      setDisplayName(prof.display_name ?? "");
      setSlug(prof.public_slug ?? "");
      setBio(prof.bio ?? "");
      setProfession(prof.profession ?? "");
      setSpecializations(prof.specializations?.join(", ") ?? "");
      setAchievements(prof.achievements?.join("\n") ?? "");
      setRole(prof.role);
      setLoading(false);
    }

    void load();
  }, []);

  async function saveProfile() {
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Missing Supabase env vars.");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      // Sanitize slug
      const cleanSlug = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/^-|-$/g, "");

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          public_slug: cleanSlug || null,
          bio: bio.trim() || null,
          profession: profession.trim() || null,
          specializations: specializations.split(",").map(s => s.trim()).filter(s => s !== ""),
          achievements: achievements.split("\n").map(a => a.trim()).filter(a => a !== ""),
          role,
        })
        .eq("id", user.id);

      if (error) {
        if (error.code === "23505") {
          throw new Error(`Slug "${cleanSlug}" is already taken.`);
        }
        throw error;
      }

      toast.success("Profile saved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and account settings.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Profile
            </CardTitle>
            <CardDescription>
              This information is shown on your public portfolio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <Label>Email</Label>
              <div className="mt-1 text-sm text-muted-foreground">
                {email ?? "Unknown"}
              </div>
            </div>

            <Separator />

            {/* Display Name */}
            <div>
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                className="mt-1"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Doe"
                disabled={busy}
              />
            </div>

            {/* Slug */}
            <div>
              <Label htmlFor="public-slug">Public Slug</Label>
              <div className="mt-1 flex items-center gap-0">
                <span className="flex h-9 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                  /
                </span>
                <Input
                  id="public-slug"
                  className="rounded-l-none"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="janedoe"
                  disabled={busy}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Your public portfolio will be accessible at /{slug || "your-slug"}.
              </p>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the world about your craft…"
                rows={3}
                disabled={busy}
              />
            </div>
            {/* Profession */}
            <div>
              <Label htmlFor="profession">Profession</Label>
              <Input
                id="profession"
                className="mt-1"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="Cinematographer"
                disabled={busy}
              />
            </div>

            {/* Specializations */}
            <div>
              <Label htmlFor="specializations">Specializations (Comma separated)</Label>
              <Input
                id="specializations"
                className="mt-1"
                value={specializations}
                onChange={(e) => setSpecializations(e.target.value)}
                placeholder="Color Grading, Drone Pilot"
                disabled={busy}
              />
            </div>

            {/* Achievements */}
            <div>
              <Label htmlFor="achievements">Achievements (One per line)</Label>
              <textarea
                id="achievements"
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                placeholder="Best Short Film 2024..."
                rows={3}
                disabled={busy}
              />
            </div>

            {/* Role */}
            <div>
              <Label>Role</Label>
              <div className="mt-2 flex gap-2">
                <Button
                  variant={role === "creator" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRole("creator")}
                  disabled={busy}
                >
                  Creator
                </Button>
                <Button
                  variant={role === "hirer" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRole("hirer")}
                  disabled={busy}
                >
                  Hirer
                </Button>
              </div>
            </div>

            <Separator />

            {/* Influence Score (read-only) */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Influence Score</Label>
                <p className="text-xs text-muted-foreground">
                  Derived from your verified collaboration credits.
                </p>
              </div>
              <Badge variant="outline" className="text-lg font-bold">
                {profile?.influence_score ?? 0}
              </Badge>
            </div>

            <Separator />

            <Button onClick={() => void saveProfile()} disabled={busy}>
              <Save className="mr-2 h-4 w-4" />
              {busy ? "Saving…" : "Save profile"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
