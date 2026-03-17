import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  BadgeCheck, 
  Users, 
  FolderGit2, 
  ArrowRight, 
  Sparkles,
  MapPin,
  Globe,
  Mail,
  Phone,
  Layout,
  Briefcase,
  Wrench,
  Languages,
  UserPlus,
  MessageSquare,
  Clock,
  ShieldCheck,
  Lock
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SocialLinksBar } from "@/components/social-links-bar";
import { ExperienceTimeline } from "@/components/experience-timeline";
import { SectionNav } from "@/components/section-nav";
import { ShareButton } from "@/components/share-button";
import { AvailabilityBadge } from "@/components/availability-badge";
import { ProfileConnectionActions } from "@/components/profile-connection-actions";
import { PublicInquiryForm } from "@/components/public-inquiry-form";
import type { Profile, Project, Collaboration } from "@/lib/types/database";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicProfilePage(props: PageProps) {
  const { slug } = await props.params;
  const decodedSlug = decodeURIComponent(slug);
  const supabase = await createSupabaseServerClient();

  // 1. Fetch Profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("public_slug", decodedSlug)
    .single();

  if (!profileData) {
    notFound();
  }
  const profile = profileData as Profile;

  // 2. Fetch Projects (RLS handles privacy automatically now)
  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, title, slug, description, tags, created_at, cover_url, client, role, is_public")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false });
  
  const projects = (projectsData || []) as Project[];

  // 3. Check Connection Status with the viewer
  const { data: { user } } = await supabase.auth.getUser();
  let connectionStatus = null;
  let isSender = false;

  if (user && user.id !== profile.id) {
    const { data: conn } = await supabase
      .from("connections")
      .select("status, sender_id")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user.id})`)
      .single();
    
    if (conn) {
      connectionStatus = conn.status;
      isSender = conn.sender_id === user.id;
    }
  }

  // 4. Fetch Verified Credits (Proof of Work)
  const { data: incomingCollabs } = await supabase
    .from("collaborations")
    .select("id, role_title, project_id, project:projects(title)")
    .eq("creator_id", profile.id)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(10);

  const displayName = profile.display_name || "Creator";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Define Sections for Nav
  const sections = [
    { id: "hero", label: "Top" },
    { id: "about", label: "About" },
    { id: "work", label: "Experience" },
    { id: "projects", label: "Projects" },
    { id: "credits", label: "Proof of Work" },
    { id: "contact", label: "Contact" },
  ];

  // Helper to render sections in order
  const renderSection = (id: string) => {
    switch (id) {
      case "hero":
        return (
          <section id="hero" key="hero" className="relative mb-24 -mt-12 overflow-hidden rounded-3xl bg-muted/30 pb-12 shadow-sm border">
            {/* Cover Image */}
            <div className="h-64 w-full bg-zinc-200 dark:bg-zinc-800 relative">
              {profile.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.cover_url} alt="Cover" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <ShareButton slug={profile.public_slug || ""} />
              </div>
            </div>

            <div className="px-6 md:px-12 flex flex-col md:flex-row items-end gap-6 -mt-16 relative z-10">
              <Avatar className="h-40 w-40 border-[6px] border-background shadow-2xl">
                <AvatarImage src={profile.avatar_url || ""} alt={displayName} />
                <AvatarFallback className="text-5xl bg-zinc-100">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">{displayName}</h1>
                  <BadgeCheck className="h-8 w-8 text-emerald-600 fill-emerald-50" />
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <p className="text-xl font-medium text-emerald-600 dark:text-emerald-400">{profile.profession}</p>
                  {profile.location && (
                    <span className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
                      <MapPin className="h-4 w-4" /> {profile.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="pb-2 flex flex-col items-end gap-3">
                <AvailabilityBadge status={profile.availability_status} />
                
                {user && user.id !== profile.id && (
                  <ProfileConnectionActions 
                    targetId={profile.id} 
                    initialStatus={connectionStatus} 
                    isSender={isSender} 
                  />
                )}
              </div>
            </div>

            <div className="px-6 md:px-12 mt-8 flex flex-wrap gap-2">
              {profile.specializations.map((spec) => (
                <Badge key={spec} variant="secondary" className="px-3 py-1 text-xs font-semibold rounded-full bg-white dark:bg-zinc-900 border shadow-sm">
                  {spec}
                </Badge>
              ))}
            </div>
          </section>
        );

      case "about":
        return (
          <section id="about" key="about" className="mb-24 scroll-mt-32">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <span className="h-8 w-1 bg-primary rounded-full" />
              About Me
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-6">
                <p className="text-xl leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {profile.bio || "No bio provided."}
                </p>
                
                {/* Languages */}
                {profile.languages.length > 0 && (
                  <div className="flex items-center gap-4 py-4 border-y">
                    <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                      <Languages className="h-4 w-4" /> Languages:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {profile.languages.map(l => (
                        <span key={l} className="text-sm font-semibold">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {/* Social Links */}
                <Card className="bg-muted/10 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Connected Channels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SocialLinksBar links={profile.social_links} />
                    {profile.website_url && (
                      <Button variant="outline" className="w-full mt-4 gap-2" render={<Link href={profile.website_url} target="_blank" />}>
                        <Globe className="h-4 w-4" /> Official Website
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Equipment / Gear */}
                {profile.equipment.length > 0 && (
                  <Card className="bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-emerald-600" /> Equipment & Kit
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {profile.equipment.map(item => (
                        <Badge key={item} variant="outline" className="bg-white/50 dark:bg-zinc-900/50">
                          {item}
                        </Badge>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </section>
        );

      case "experience":
        return (
          <section id="work" key="experience" className="mb-24 scroll-mt-32">
            <h2 className="text-3xl font-bold mb-10 flex items-center gap-3">
              <span className="h-8 w-1 bg-primary rounded-full" />
              Professional History
            </h2>
            <ExperienceTimeline experience={profile.experience} />
          </section>
        );

      case "projects":
        return (
          <section id="projects" key="projects" className="mb-24 scroll-mt-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <span className="h-8 w-1 bg-primary rounded-full" />
                  Public Portfolio
                </h2>
                <p className="text-muted-foreground mt-1">Curated projects, films, and music productions.</p>
              </div>
            </div>

            {projects.length === 0 ? (
              <p className="text-muted-foreground py-12 text-center border-2 border-dashed rounded-2xl">
                {displayName} hasn&apos;t published any projects yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {projects.map((project) => (
                  <Card key={project.id} className="group overflow-hidden border-none shadow-none bg-transparent h-full flex flex-col">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl shadow-md transition-all hover:shadow-xl">
                      {project.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={project.cover_url} 
                          alt={project.title} 
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center">
                          <FolderGit2 className="h-10 w-10 text-muted-foreground opacity-20" />
                        </div>
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                        <Button size="sm" variant="secondary" className="w-fit gap-2" render={<Link href={`/${profile.public_slug}/projects/${project.id}`} />}>
                          See Details <ArrowRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <CardHeader className="px-0 pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-2xl group-hover:text-primary transition-colors flex items-center gap-2">
                            {project.title}
                            {!project.is_public && (
                              <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200 text-[10px] py-0 px-2 h-5 gap-1 uppercase tracking-tighter">
                                <Lock className="h-3 w-3" /> Private
                              </Badge>
                            )}
                          </CardTitle>
                          {project.client && (
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">for {project.client}</p>
                          )}
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          {new Date(project.created_at).getFullYear()}
                        </span>
                      </div>
                      <CardDescription className="line-clamp-2 text-base mt-2">
                        {project.description}
                      </CardDescription>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {project.tags?.map(t => (
                          <span key={t} className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted">
                            {t}
                          </span>
                        ))}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </section>
        );

      case "credits":
        return (
          <section id="credits" key="credits" className="mb-24 scroll-mt-32">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-12">
              <div>
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                  <span className="h-8 w-1 bg-primary rounded-full" />
                  Proof of Work
                </h2>
                <div className="space-y-4">
                  {(incomingCollabs?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground">No verified collaborations yet.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {incomingCollabs?.map((collab: any) => (
                        <div key={collab.id} className="flex items-start gap-4 rounded-2xl border p-5 bg-muted/5 hover:bg-muted/10 transition-colors">
                          <BadgeCheck className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                          <div>
                            <p className="font-bold">{collab.role_title}</p>
                            <p className="text-sm text-muted-foreground italic">on {collab.project?.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" /> Achievements
                </h3>
                <div className="space-y-4">
                  {profile.achievements.length > 0 ? (
                    profile.achievements.map((achievement, i) => (
                      <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-muted/30 border border-zinc-100 dark:border-zinc-900">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white uppercase tracking-tighter">
                          Award
                        </span>
                        <p className="text-sm font-medium leading-relaxed">{achievement}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No achievements listed.</p>
                  )}
                </div>
                
                <div className="mt-12 p-6 rounded-3xl bg-primary text-primary-foreground">
                  <div className="flex items-center gap-3 mb-2">
                    <BadgeCheck className="h-6 w-6" />
                    <span className="text-2xl font-black">{profile.influence_score}</span>
                  </div>
                  <p className="text-sm font-medium opacity-80">Verified Talent OS Influence Score</p>
                </div>
              </div>
            </div>
          </section>
        );

      case "social":
        return null; // Merged into About or Hero usually

      case "contact":
        return (
          <section id="contact" key="contact" className="mb-12 scroll-mt-32">
            <Card className="bg-zinc-950 text-zinc-50 rounded-[2rem] overflow-hidden border-none p-8 md:p-12 shadow-2xl relative">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-4xl font-black mb-4">Let&apos;s build something great.</h2>
                    <p className="text-lg text-zinc-400">
                      I&apos;m currently {profile.availability_status === "available" ? "open for new projects" : "at capacity"}, but feel free to reach out for future collaborations.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Mail className="h-5 w-5" />
                      </div>
                      <span className="text-lg font-medium">talent.os/{profile.public_slug}@mail</span>
                    </div>
                    {profile.phone && (
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Phone className="h-5 w-5" />
                        </div>
                        <span className="text-lg font-medium">{profile.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold mb-6">Quick Inquiry</h3>
                  <PublicInquiryForm creatorId={profile.id} />
                </div>
              </div>
              <div className="absolute -bottom-24 -right-24 h-96 w-96 bg-emerald-600/20 blur-[100px] rounded-full pointer-events-none" />
            </Card>
          </section>
        );
      
      default: return null;
    }
  };

  const orderedSections = profile.portfolio_order?.sections || ["hero", "about", "work", "projects", "credits", "contact"];

  return (
    <div className="bg-background min-h-screen">
      <SectionNav sections={sections} />
      <div className="mx-auto max-w-5xl px-4 py-12">
        {orderedSections.map(sectionId => renderSection(sectionId))}
      </div>
    </div>
  );
}

