"use client";

import { useEffect, useState } from "react";
import { 
  Save, 
  User, 
  Palette, 
  Zap, 
  Sparkles,
  Moon,
  Sun,
  Laptop,
  Plus,
  Mail,
  Smartphone,
  Globe,
  MapPin,
  Instagram,
  Youtube,
  Music2,
  Twitter,
  Briefcase,
  Trophy,
  Languages,
  History,
  X
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (platform: string, value: string) => {
    setProfile((prev: any) => ({
      ...prev,
      social_links: { ...prev.social_links, [platform]: value }
    }));
  };

  const toggleArrayItem = (field: string, item: string) => {
    setProfile((prev: any) => {
      const current = prev[field] || [];
      const updated = current.includes(item)
        ? current.filter((i: string) => i !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  const removeArrayItem = (field: string, item: string) => {
    setProfile((prev: any) => ({
      ...prev,
      [field]: (prev[field] || []).filter((i: string) => i !== item)
    }));
  };

  const addArrayItem = (field: string, item: string) => {
    if (!item) return;
    setProfile((prev: any) => {
      const current = prev[field] || [];
      if (current.includes(item)) return prev;
      return { ...prev, [field]: [...current, item] };
    });
  };

  const saveSettings = async () => {
    setBusy(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profile.display_name,
          public_slug: profile.public_slug,
          profession: profile.profession,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          cover_url: profile.cover_url,
          phone: profile.phone,
          location: profile.location,
          website_url: profile.website_url,
          social_links: profile.social_links || {},
          specializations: profile.specializations || [],
          equipment: profile.equipment || [],
          languages: profile.languages || [],
          achievements: profile.achievements || [],
          experience: profile.experience || [],
          availability_status: profile.availability_status || "available",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (err: unknown) {
      console.error("Save Error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return (
    <div className="p-12 animate-pulse space-y-6">
      <div className="h-10 w-48 bg-muted rounded" />
      <div className="h-64 w-full bg-muted rounded-3xl" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-12 mb-20 px-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-8">
         <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">Settings</h1>
            <p className="text-muted-foreground text-lg">Your creative identity. Everything but your email is under your command.</p>
         </div>
         <Button onClick={saveSettings} disabled={busy} className="rounded-full h-12 px-8 font-bold shadow-xl shadow-primary/20 gap-2 shrink-0">
            <Save className="h-4 w-4" /> {busy ? "Syncing..." : "Publish Changes"}
         </Button>
      </header>

      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-2xl h-auto flex-wrap justify-start border-none">
           <TabsTrigger value="profile" className="rounded-xl px-6 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="h-4 w-4 mr-2" /> Identity
           </TabsTrigger>
           <TabsTrigger value="professional" className="rounded-xl px-6 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Briefcase className="h-4 w-4 mr-2" /> Pro Skills
           </TabsTrigger>
           <TabsTrigger value="social" className="rounded-xl px-6 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Globe className="h-4 w-4 mr-2" /> Reach
           </TabsTrigger>
           <TabsTrigger value="experience" className="rounded-xl px-6 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <History className="h-4 w-4 mr-2" /> Experience
           </TabsTrigger>
           <TabsTrigger value="appearance" className="rounded-xl px-6 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Palette className="h-4 w-4 mr-2" /> Vibe
           </TabsTrigger>
        </TabsList>

        {/* IDENTITY TAB */}
        <TabsContent value="profile" className="space-y-8">
          <Card className="rounded-[2.5rem] border-2 bg-background shadow-lg overflow-hidden transition-all hover:border-primary/20">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black">Identity</CardTitle>
              <CardDescription>Public information that defines your brand.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <Avatar className="h-32 w-32 border-4 border-muted group-hover:border-primary transition-all overflow-hidden bg-muted shadow-inner">
                    <AvatarImage src={profile?.avatar_url || ""} className="object-cover" />
                    <AvatarFallback className="text-4xl font-black">{profile?.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Label className="text-[10px] font-black uppercase text-white cursor-pointer hover:underline text-center">Change<br/>Photo</Label>
                  </div>
                </div>
                <div className="flex-1 space-y-6 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Public Slug (Handle)</Label>
                       <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">talent.os/</span>
                          <Input name="public_slug" value={profile?.public_slug || ""} onChange={handleInputChange} className="pl-[4.5rem] h-12 rounded-xl border-2 focus-visible:ring-primary" placeholder="your-name" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Display Name</Label>
                       <Input name="display_name" value={profile?.display_name || ""} onChange={handleInputChange} className="h-12 rounded-xl border-2 focus-visible:ring-primary" placeholder="Full Name" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Professional Tagline</Label>
                    <Input name="profession" value={profile?.profession || ""} onChange={handleInputChange} className="h-12 rounded-xl border-2 focus-visible:ring-primary" placeholder="e.g. Cinematic Motion Designer & Colorist" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Biography</Label>
                  <Textarea name="bio" value={profile?.bio || ""} onChange={handleInputChange} className="min-h-[120px] rounded-2xl border-2 p-4 text-base focus-visible:ring-primary" placeholder="Share your story, your vibe, and what drives your creativity..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Avatar URL</Label>
                    <Input name="avatar_url" value={profile?.avatar_url || ""} onChange={handleInputChange} className="h-12 rounded-xl border-2 focus-visible:ring-primary" placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cover Image URL</Label>
                    <Input name="cover_url" value={profile?.cover_url || ""} onChange={handleInputChange} className="h-12 rounded-xl border-2 focus-visible:ring-primary" placeholder="https://..." />
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRO SKILLS TAB */}
        <TabsContent value="professional" className="space-y-8">
          <Card className="rounded-[2.5rem] border-2 bg-background shadow-lg overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black">Professional Details</CardTitle>
              <CardDescription>Technical details hirers look for when scouting talent.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Availability</Label>
                    <div className="flex flex-wrap gap-3">
                      {["available", "busy", "not_available"].map(status => (
                        <button
                          key={status}
                          onClick={() => setProfile((p: any) => ({ ...p, availability_status: status }))}
                          className={`px-6 py-2 rounded-full text-xs font-black uppercase transition-all border-2 ${
                            profile?.availability_status === status 
                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                            : "bg-muted/10 border-transparent text-muted-foreground hover:border-muted-foreground/20"
                          }`}
                        >
                          {status.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Core Specializations</Label>
                    <div className="flex flex-wrap gap-2">
                      {["Cinematography", "Editing", "Directing", "Sound Design", "VFX", "Music Production", "Color Grading"].map(spec => (
                        <Badge 
                          key={spec} 
                          onClick={() => toggleArrayItem("specializations", spec)}
                          className={`cursor-pointer px-4 py-1.5 rounded-full font-bold text-xs transition-all ${
                            profile?.specializations?.includes(spec)
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Languages className="h-3 w-3" /> Languages
                    </Label>
                    <Input 
                      placeholder="e.g. English, French, Mandarin"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = e.currentTarget.value.trim();
                          if (val) addArrayItem("languages", val);
                          e.currentTarget.value = "";
                          e.preventDefault();
                        }
                      }}
                      className="h-12 rounded-xl border-2"
                    />
                    <div className="flex flex-wrap gap-2">
                        {(profile?.languages || []).map((lang: string) => (
                            <Badge key={lang} variant="outline" className="px-3 py-1 rounded-lg">
                                {lang} <X className="h-3 w-3 ml-2 cursor-pointer hover:text-red-500" onClick={() => removeArrayItem("languages", lang)} />
                            </Badge>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Primary Equipment / Gear</Label>
                    <Input 
                      placeholder="e.g. RED Komodo, Neumann U87, Sony A7SIII"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = e.currentTarget.value.trim();
                          if (val) addArrayItem("equipment", val);
                          e.currentTarget.value = "";
                          e.preventDefault();
                        }
                      }}
                      className="h-12 rounded-xl border-2"
                    />
                    <div className="flex flex-wrap gap-2">
                      {(profile?.equipment || []).map((item: string) => (
                        <Badge key={item} variant="secondary" className="px-3 py-1 rounded-lg">
                          {item} <X className="h-3 w-3 ml-2 cursor-pointer hover:text-red-500" onClick={() => removeArrayItem("equipment", item)} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Trophy className="h-3 w-3" /> Achievements & Awards
                    </Label>
                    <Input 
                      placeholder="e.g. Emmy Award, Vimeo Staff Pick"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = e.currentTarget.value.trim();
                          if (val) addArrayItem("achievements", val);
                          e.currentTarget.value = "";
                          e.preventDefault();
                        }
                      }}
                      className="h-12 rounded-xl border-2"
                    />
                    <div className="grid gap-2">
                        {(profile?.achievements || []).map((ach: string) => (
                            <div key={ach} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border">
                                <span className="text-sm font-medium">{ach}</span>
                                <X className="h-4 w-4 cursor-pointer hover:text-red-500" onClick={() => removeArrayItem("achievements", ach)} />
                            </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REACH TAB */}
        <TabsContent value="social" className="space-y-8">
          <Card className="rounded-[2.5rem] border-2 bg-background shadow-lg overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black">Social & Reach</CardTitle>
              <CardDescription>Direct channels for collaboration and inquiries.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Contact Column */}
                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600">Contact Channels</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                        <Mail className="h-3 w-3" /> Login Email (Locked)
                      </Label>
                      <Input value={userEmail} disabled className="h-12 rounded-xl border-2 bg-muted/20 opacity-60 cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                        <Smartphone className="h-3 w-3" /> Phone Number
                      </Label>
                      <Input name="phone" value={profile?.phone || ""} onChange={handleInputChange} placeholder="+1 (555) 000-0000" className="h-12 rounded-xl border-2 focus-visible:ring-primary" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                        <MapPin className="h-3 w-3" /> Location (City, Country)
                      </Label>
                      <Input name="location" value={profile?.location || ""} onChange={handleInputChange} placeholder="Tokyo, Japan" className="h-12 rounded-xl border-2 focus-visible:ring-primary" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                        <Globe className="h-3 w-3" /> Personal Website
                      </Label>
                      <Input name="website_url" value={profile?.website_url || ""} onChange={handleInputChange} placeholder="https://talent.space" className="h-12 rounded-xl border-2 focus-visible:ring-primary" />
                    </div>
                  </div>
                </div>

                {/* Social Column */}
                <div className="space-y-6">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600">Network Links</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-pink-50 text-pink-600 shrink-0 shadow-sm">
                        <Instagram className="h-6 w-6" />
                      </div>
                      <Input 
                        placeholder="Instagram Handle (without @)" 
                        value={profile?.social_links?.instagram || ""} 
                        onChange={(e) => handleSocialChange("instagram", e.target.value)}
                        className="h-12 rounded-xl border-2 focus-visible:ring-primary" 
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-600 shrink-0 shadow-sm">
                        <Youtube className="h-6 w-6" />
                      </div>
                      <Input 
                        placeholder="YouTube Channel URL/Username" 
                        value={profile?.social_links?.youtube || ""} 
                        onChange={(e) => handleSocialChange("youtube", e.target.value)}
                        className="h-12 rounded-xl border-2 focus-visible:ring-primary" 
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shrink-0 shadow-sm">
                        <Music2 className="h-6 w-6" />
                      </div>
                      <Input 
                        placeholder="Spotify Artist Page" 
                        value={profile?.social_links?.spotify || ""} 
                        onChange={(e) => handleSocialChange("spotify", e.target.value)}
                        className="h-12 rounded-xl border-2 focus-visible:ring-primary" 
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-blue-50 text-blue-500 shrink-0 shadow-sm">
                        <Twitter className="h-6 w-6" />
                      </div>
                      <Input 
                        placeholder="X / Twitter Username" 
                        value={profile?.social_links?.twitter || ""} 
                        onChange={(e) => handleSocialChange("twitter", e.target.value)}
                        className="h-12 rounded-xl border-2 focus-visible:ring-primary" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPERIENCE TAB */}
        <TabsContent value="experience" className="space-y-8">
            <Card className="rounded-[2.5rem] border-2 bg-background shadow-lg overflow-hidden">
                <CardHeader className="p-8">
                    <CardTitle className="text-xl font-black">Professional Timeline</CardTitle>
                    <CardDescription>Summary of your career highlights and key projects.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                    <div className="p-6 rounded-3xl bg-muted/10 border-2 border-dashed flex flex-col items-center justify-center text-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-bold">Add Career Milestone</p>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto">This complex data type is currently read-only in this beta but will be fully editable in the next patch.</p>
                        </div>
                        <Button disabled variant="outline" className="rounded-full px-8">Coming Soon</Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* VIBE TAB */}
        <TabsContent value="appearance" className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="rounded-[2.5rem] border-2 bg-background overflow-hidden shadow-lg">
                 <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black">Theme Mode</CardTitle>
                    <CardDescription>How the platform looks on your device.</CardDescription>
                 </CardHeader>
                 <CardContent className="p-8 pt-0 space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                       <button className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-primary bg-primary/5 transition-all">
                          <div className="h-12 w-full bg-background rounded-lg border flex items-center justify-center">
                             <Sun className="h-5 w-5 text-amber-500" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-widest">Light</span>
                       </button>
                       <button className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-transparent bg-muted/20 hover:border-muted-foreground/20 transition-all cursor-not-allowed opacity-50">
                          <div className="h-12 w-full bg-zinc-950 rounded-lg flex items-center justify-center">
                             <Moon className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-widest">Dark</span>
                       </button>
                       <button className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-transparent bg-muted/20 hover:border-muted-foreground/20 transition-all cursor-not-allowed opacity-50">
                          <div className="h-12 w-full bg-gradient-to-br from-zinc-200 to-zinc-800 rounded-lg flex items-center justify-center">
                             <Laptop className="h-5 w-5 text-zinc-400" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-widest">System</span>
                       </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-dashed">
                       <div className="flex items-center gap-3">
                          <Zap className="h-5 w-5 text-amber-500" />
                          <div>
                             <p className="text-sm font-bold">Dynamic Contrast</p>
                             <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">AI Optimized</p>
                          </div>
                       </div>
                       <Switch />
                    </div>
                 </CardContent>
              </Card>

              <Card className="rounded-[2.5rem] border-2 bg-zinc-950 text-white overflow-hidden shadow-2xl relative shadow-primary/5">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full" />
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black">Creative Vibe</CardTitle>
                    <CardDescription className="text-zinc-400">Personalize your workspace aesthetics.</CardDescription>
                 </CardHeader>
                 <CardContent className="p-8 pt-0 space-y-6">
                    <div className="space-y-4">
                       <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Accent Color</Label>
                       <div className="flex gap-4">
                          {["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"].map(color => (
                            <button 
                               key={color} 
                               className={`h-10 w-10 rounded-full border-4 border-zinc-800 transition-transform hover:scale-110 ${color === "#10b981" ? "border-white" : ""}`}
                               style={{ backgroundColor: color }}
                            />
                          ))}
                       </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                       <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                             <Sparkles className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                             <p className="text-sm font-bold mb-1">Glassmorphism UI</p>
                             <p className="text-xs text-zinc-400 leading-relaxed">Enable subtle background blurs and frosted effects across your dashboard.</p>
                             <div className="mt-4 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-primary">Ultra Premium</span>
                                <Switch defaultChecked />
                             </div>
                          </div>
                       </div>
                    </div>
                 </CardContent>
              </Card>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
