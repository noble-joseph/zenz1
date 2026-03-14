"use client";

import { useEffect, useState } from "react";
import { 
  ExternalLink, 
  Grid3X3, 
  Layout, 
  Settings as SettingsIcon, 
  Eye, 
  Plus, 
  MoveUp, 
  MoveDown,
  Sparkles,
  Link2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Profile, Project } from "@/lib/types/database";

export default function PortfolioPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profRes, projRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("projects").select("*").eq("owner_id", user.id).order("created_at", { ascending: false })
      ]);

      if (profRes.error) throw profRes.error;
      setProfile(profRes.data as Profile);
      setProjects(projRes.data || []);
    } catch (err) {
      toast.error("Failed to load portfolio data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
     return <div className="p-8 animate-pulse space-y-8">
        <div className="h-40 w-full bg-muted rounded-3xl" />
        <div className="grid grid-cols-3 gap-6">
           <div className="h-64 bg-muted rounded-2xl" />
           <div className="h-64 bg-muted rounded-2xl" />
           <div className="h-64 bg-muted rounded-2xl" />
        </div>
     </div>;
  }

  const publicUrl = profile?.public_slug ? `/${profile.public_slug}` : "#";

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Visual Identity Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-950 text-white p-8 md:p-12 border shadow-2xl">
         <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 via-primary/5 to-transparent pointer-events-none" />
         
         <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-white/10 shadow-xl">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-white/5 text-4xl font-bold">
                  {profile?.display_name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-xl shadow-lg border-2 border-zinc-950">
                 <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
               <h1 className="text-4xl font-black tracking-tighter mb-2">{profile?.display_name || "Untitled Creator"}</h1>
               <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-zinc-400">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Layout className="h-4 w-4" /> {profile?.profession || "Visual Artist"}
                  </span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Grid3X3 className="h-4 w-4" /> {projects.length} Projects
                  </span>
               </div>
               
               <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <Link href={publicUrl} target="_blank">
                    <Button variant="outline" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2 h-11 px-6">
                      <Eye className="h-4 w-4" /> View Public Site
                    </Button>
                  </Link>
                  <Button variant="outline" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2 h-11 px-6" onClick={() => {
                    void navigator.clipboard.writeText(window.location.origin + publicUrl);
                    toast.success("Link copied to clipboard");
                  }}>
                    <Link2 className="h-4 w-4" /> Copy Link
                  </Button>
                  <Link href="/dashboard/settings">
                    <Button className="rounded-full bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 shadow-lg shadow-primary/20">
                      <SettingsIcon className="h-4 w-4" /> Edit Profile
                    </Button>
                  </Link>
               </div>
            </div>
         </div>
      </div>

      <Tabs defaultValue="grid" className="space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-2xl h-auto self-start">
          <TabsTrigger value="grid" className="rounded-xl px-8 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
             <Grid3X3 className="h-4 w-4 mr-2" /> Project Grid
          </TabsTrigger>
          <TabsTrigger value="layout" className="rounded-xl px-8 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
             <Layout className="h-4 w-4 mr-2" /> Section Flow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-6">
          <div className="flex items-center justify-between">
             <div>
               <h2 className="text-2xl font-black tracking-tight">Your Portfolio Grid</h2>
               <p className="text-muted-foreground mt-1">Arrange and manage your projects as they appear to visitors.</p>
             </div>
             <Link href="/dashboard/projects">
               <Button className="rounded-xl gap-2 h-11">
                 <Plus className="h-4 w-4" /> New Project
               </Button>
             </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 ? (
              <div className="col-span-full py-24 text-center border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center bg-muted/10">
                 <Grid3X3 className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                 <h3 className="text-xl font-bold mb-2">No public projects</h3>
                 <p className="text-muted-foreground max-w-sm mx-auto mb-6">Create a project and set it to 'Public' to see it here.</p>
                 <Link href="/dashboard/projects">
                   <Button variant="outline" className="rounded-full h-11 px-8">Create Project</Button>
                 </Link>
              </div>
            ) : (
              projects.map((project) => (
                <Card key={project.id} className="group overflow-hidden rounded-[2rem] border-2 border-muted hover:border-primary/50 transition-all bg-card/50 backdrop-blur-sm h-full flex flex-col">
                  <div className="relative aspect-video overflow-hidden">
                    {project.cover_url ? (
                       <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="h-full w-full bg-muted flex items-center justify-center opacity-30">
                         <Layout className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                       <Button size="sm" variant="secondary" className="rounded-lg shadow-xl" render={
                          <Link href={`/dashboard/projects/${project.id}`}>Edit Details</Link>
                       }>
                       </Button>
                    </div>
                    {project.is_public && (
                       <Badge className="absolute top-4 right-4 bg-emerald-500 text-white border-none rounded-lg shadow-lg">Live</Badge>
                    )}
                  </div>
                  <CardContent className="p-6 flex-1">
                    <h3 className="font-bold text-lg mb-2 truncate">{project.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                      {project.description || "No description provided."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                       {project.tags?.slice(0, 3).map(tag => (
                         <Badge key={tag} variant="outline" className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-muted/50 border-none">
                            {tag}
                         </Badge>
                       ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="layout" className="space-y-6">
           <Card className="rounded-[2.5rem] border-2 bg-muted/10 overflow-hidden">
              <CardHeader className="p-8 pb-4">
                 <CardTitle className="text-2xl font-black">Visual Flow</CardTitle>
                 <CardDescription>Determine the order in which sections appear on your public profile.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                 <div className="space-y-3">
                   {profile?.portfolio_order?.sections.map((section, idx) => (
                     <div key={section} className="flex items-center justify-between p-6 rounded-2xl border bg-background group shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-6">
                           <div className="h-10 w-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black text-lg">
                              {idx + 1}
                           </div>
                           <div>
                              <p className="font-bold capitalize text-lg">{section}</p>
                              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Profile Component</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button variant="ghost" size="icon" className="rounded-xl h-11 w-11 hover:bg-primary/10 hover:text-primary transition-all">
                              <MoveUp className="h-5 w-5" />
                           </Button>
                           <Button variant="ghost" size="icon" className="rounded-xl h-11 w-11 hover:bg-primary/10 hover:text-primary transition-all">
                              <MoveDown className="h-5 w-5" />
                           </Button>
                        </div>
                     </div>
                   ))}
                 </div>
                 
                 <div className="mt-8 p-6 rounded-2xl bg-primary/5 border-2 border-primary/10 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                       <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                       <p className="font-bold text-primary">Intelligent Layout Optimizer</p>
                       <p className="text-xs text-primary/70">Our AI suggests placing 'Projects' higher based on your latest activity.</p>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
