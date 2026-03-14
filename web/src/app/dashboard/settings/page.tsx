"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Save, 
  User, 
  Globe, 
  Briefcase, 
  Layout, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Music,
  Film,
  ExternalLink,
  MapPin,
  Phone,
  Languages,
  Wrench
} from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { 
  Profile, 
  UserRole, 
  SocialLinks, 
  ExperienceEntry, 
  AvailabilityStatus,
  PortfolioOrder
} from "@/lib/types/database";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [profession, setProfession] = useState("");
  const [specializations, setSpecializations] = useState("");
  const [achievements, setAchievements] = useState("");
  const [role, setRole] = useState<UserRole>("creator");
  
  // New Fields
  const [coverUrl, setCoverUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [equipment, setEquipment] = useState("");
  const [languages, setLanguages] = useState("");
  const [availability, setAvailability] = useState<AvailabilityStatus>("available");
  const [portfolioOrder, setPortfolioOrder] = useState<PortfolioOrder>({
    sections: ["hero", "about", "social", "experience", "projects", "credits", "contact"],
    pinnedProjects: []
  });

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
      
      // Load new fields
      setCoverUrl(prof.cover_url ?? "");
      setPhone(prof.phone ?? "");
      setLocation(prof.location ?? "");
      setWebsiteUrl(prof.website_url ?? "");
      setSocialLinks(prof.social_links || {});
      setExperience(prof.experience || []);
      setEquipment(prof.equipment?.join(", ") ?? "");
      setLanguages(prof.languages?.join(", ") ?? "");
      setAvailability(prof.availability_status || "available");
      if (prof.portfolio_order) setPortfolioOrder(prof.portfolio_order);
      
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
          // New Fields
          cover_url: coverUrl.trim() || null,
          phone: phone.trim() || null,
          location: location.trim() || null,
          website_url: websiteUrl.trim() || null,
          social_links: socialLinks,
          experience: experience,
          equipment: equipment.split(",").map(e => e.trim()).filter(e => e !== ""),
          languages: languages.split(",").map(l => l.trim()).filter(l => l !== ""),
          availability_status: availability,
          portfolio_order: portfolioOrder,
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

  const addExperience = () => {
    setExperience([...experience, {
      title: "",
      company: "",
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      description: "",
      current: false
    }]);
  };

  const updateExperience = (index: number, field: keyof ExperienceEntry, value: any) => {
    const next = [...experience];
    next[index] = { ...next[index], [field]: value };
    setExperience(next);
  };

  const removeExperience = (index: number) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  const updateSocial = (platform: string, handle: string) => {
    setSocialLinks({ ...socialLinks, [platform]: handle });
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">
            Build your professional identity and portfolio layout.
          </p>
        </div>
        <Button onClick={() => void saveProfile()} disabled={busy} size="lg" className="shadow-lg">
          <Save className="mr-2 h-4 w-4" />
          {busy ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <Tabs defaultValue="basics" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 w-full justify-start overflow-x-auto no-scrollbar">
          <TabsTrigger value="basics" className="gap-2"><User className="h-4 w-4" /> Basics</TabsTrigger>
          <TabsTrigger value="social" className="gap-2"><Globe className="h-4 w-4" /> Social & Contact</TabsTrigger>
          <TabsTrigger value="work" className="gap-2"><Briefcase className="h-4 w-4" /> Experience & Gear</TabsTrigger>
          <TabsTrigger value="layout" className="gap-2"><Layout className="h-4 w-4" /> Portfolio Layout</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Identity</CardTitle>
              <CardDescription>Your main profile details shown at the top of your portfolio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input id="display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="public-slug">Public Username / Slug</Label>
                  <div className="flex">
                    <span className="flex h-10 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">talent.os/</span>
                    <Input id="public-slug" className="rounded-l-none" value={slug} onChange={e => setSlug(e.target.value)} placeholder="janedoe" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profession">Professional Title</Label>
                <Input id="profession" value={profession} onChange={e => setProfession(e.target.value)} placeholder="Cinematographer & Drone Pilot" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio / About Me</Label>
                <Textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell your story..." rows={4} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="avatar-url">Avatar Image URL</Label>
                  <Input id="avatar-url" value={profile?.avatar_url || ""} onChange={e => setProfile(p => p ? {...p, avatar_url: e.target.value} : null)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cover-url">Hero Cover Image URL</Label>
                  <Input id="cover-url" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Availability Status</Label>
                <div className="flex flex-wrap gap-2">
                  {(["available", "busy", "not_available"] as AvailabilityStatus[]).map((s) => (
                    <Button 
                      key={s}
                      variant={availability === s ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setAvailability(s)}
                      className="capitalize"
                    >
                      {s.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills & Awards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="specializations">Specializations (Comma separated)</Label>
                <Input id="specializations" value={specializations} onChange={e => setSpecializations(e.target.value)} placeholder="Color Grading, 16mm Film, Music Engineering" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="achievements">Achievements (One per line)</Label>
                <Textarea id="achievements" value={achievements} onChange={e => setAchievements(e.target.value)} placeholder="Won Best Cinematography @ Indie Awards 2023..." rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Help hirers find you. Email is always {email}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</Label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="London, UK" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 900000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> Personal Website</Label>
                <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yourname.com" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Languages className="h-4 w-4" /> Languages (Comma separated)</Label>
                <Input value={languages} onChange={e => setLanguages(e.target.value)} placeholder="English, French, German" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Presence</CardTitle>
              <CardDescription>Enter your handles or full URLs.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Instagram className="h-4 w-4" /> Instagram</Label>
                <Input value={socialLinks.instagram || ""} onChange={e => updateSocial("instagram", e.target.value)} placeholder="@handle" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Youtube className="h-4 w-4" /> YouTube</Label>
                <Input value={socialLinks.youtube || ""} onChange={e => updateSocial("youtube", e.target.value)} placeholder="@channel" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Music className="h-4 w-4" /> Spotify</Label>
                <Input value={socialLinks.spotify || ""} onChange={e => updateSocial("spotify", e.target.value)} placeholder="User or Artist ID" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Film className="h-4 w-4" /> IMDb</Label>
                <Input value={socialLinks.imdb || ""} onChange={e => updateSocial("imdb", e.target.value)} placeholder="nm1234567" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Linkedin className="h-4 w-4" /> LinkedIn</Label>
                <Input value={socialLinks.linkedin || ""} onChange={e => updateSocial("linkedin", e.target.value)} placeholder="in/username" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Behance / Portfolio</Label>
                <Input value={socialLinks.behance || ""} onChange={e => updateSocial("behance", e.target.value)} placeholder="username" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Professional Experience</CardTitle>
                <CardDescription>List your previous companies, groups, or freelance history.</CardDescription>
              </div>
              <Button onClick={addExperience} size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {experience.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                  No experience entries yet. Click "Add" to list your history.
                </div>
              )}
              {experience.map((exp, i) => (
                <div key={i} className="relative p-4 rounded-lg border bg-muted/20 space-y-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-destructive hover:bg-destructive/10"
                    onClick={() => removeExperience(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
                    <div className="space-y-2">
                      <Label>Job Title / Role</Label>
                      <Input value={exp.title} onChange={e => updateExperience(i, "title", e.target.value)} placeholder="Senior Colorist" />
                    </div>
                    <div className="space-y-2">
                      <Label>Company / Group</Label>
                      <Input value={exp.company} onChange={e => updateExperience(i, "company", e.target.value)} placeholder="Technicolor" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" value={exp.start_date} onChange={e => updateExperience(i, "start_date", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="date" value={exp.end_date || ""} onChange={e => updateExperience(i, "end_date", e.target.value)} disabled={exp.current} />
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                      <input 
                        type="checkbox" 
                        id={`curr-${i}`} 
                        checked={exp.current} 
                        onChange={e => updateExperience(i, "current", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor={`curr-${i}`} className="text-sm cursor-pointer">Currently working here</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Key Responsibilities / Impact</Label>
                    <Textarea value={exp.description} onChange={e => updateExperience(i, "description", e.target.value)} placeholder="What did you achieve?" rows={2} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> Gear & Equipment</CardTitle>
              <CardDescription>Your regular tools of the trade (Musician gear, Camera kits, etc).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="equipment">Equipment List (Comma separated)</Label>
                <Textarea id="equipment" value={equipment} onChange={e => setEquipment(e.target.value)} placeholder="RED V-Raptor, Cooke Anamorphics, Davinci Resolve Mini Panel..." rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Ordering</CardTitle>
              <CardDescription>Control the flow of your public portfolio page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Section Sequence</Label>
                <div className="grid gap-2">
                  {portfolioOrder.sections.map((section, idx) => (
                    <div key={section} className="flex items-center justify-between p-3 rounded-md border bg-muted/40 group">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-4">{idx + 1}</span>
                        <span className="font-medium capitalize">{section}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" size="icon" className="h-8 w-8" 
                          disabled={idx === 0}
                          onClick={() => {
                            const next = [...portfolioOrder.sections];
                            [next[idx], next[idx-1]] = [next[idx-1], next[idx]];
                            setPortfolioOrder({...portfolioOrder, sections: next});
                          }}
                        >
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" size="icon" className="h-8 w-8" 
                          disabled={idx === portfolioOrder.sections.length - 1}
                          onClick={() => {
                            const next = [...portfolioOrder.sections];
                            [next[idx], next[idx+1]] = [next[idx+1], next[idx]];
                            setPortfolioOrder({...portfolioOrder, sections: next});
                          }}
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  Tip: Pin your best projects to show them at the very top of your work section. Use the Projects dashboard to manage public visibility first.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

