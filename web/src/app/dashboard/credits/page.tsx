"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  Users, 
  BadgeCheck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Zap,
  MoreHorizontal,
  Plus,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Globe2,
  Activity,
  Award,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { format, subDays, isAfter, startOfDay } from "date-fns";

interface Connection {
  id: string;
  project_title: string;
  role_title: string;
  creator_id: string;
  creator_name: string;
  creator_avatar: string;
  creator_slug: string;
  status: string;
  created_at: string;
  direction: "in" | "out";
}

export default function NetworkPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ influence: 0, verifiedCount: 0 });
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    void loadNetwork();
  }, []);

  async function loadNetwork() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile for influence score and other metadata
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setProfile(prof);

      // Fetch collaborations (connections)
      const { data: collabs, error } = await supabase
        .from("collaborations")
        .select(`
          id,
          role_title,
          status,
          created_at,
          project_id,
          project:projects(title),
          creator:profiles!collaborations_creator_id_fkey(id, display_name, avatar_url, public_slug),
          requester:profiles!collaborations_requested_by_fkey(id, display_name, avatar_url, public_slug)
        `)
        .or(`creator_id.eq.${user.id},requested_by.eq.${user.id}`);

      if (error) throw error;

      const enriched: Connection[] = (collabs || []).map((c: any) => {
        const isIncoming = c.creator.id === user.id;
        const otherParty = isIncoming ? c.requester : c.creator;
        return {
          id: c.id,
          project_title: c.project?.title || "Unknown Project",
          role_title: c.role_title,
          creator_id: otherParty.id,
          creator_name: otherParty.display_name || "Unknown Creator",
          creator_avatar: otherParty.avatar_url || "",
          creator_slug: otherParty.public_slug || "",
          status: c.status,
          created_at: c.created_at,
          direction: isIncoming ? "in" : "out"
        };
      });

      setConnections(enriched);
      setStats({
        influence: prof?.influence_score || 0,
        verifiedCount: enriched.filter(c => c.status === "verified").length
      });
    } catch (err) {
      toast.error("Failed to load network");
    } finally {
      setLoading(false);
    }
  }

  // Analytics Derivation
  const analyticsData = useMemo(() => {
    const verified = connections.filter(c => c.status === "verified");
    const now = new Date();
    const last30Days = verified.filter(c => isAfter(new Date(c.created_at), subDays(now, 30)));
    const last7Days = verified.filter(c => isAfter(new Date(c.created_at), subDays(now, 7)));

    // Role density
    const roles: Record<string, number> = {};
    verified.forEach(c => {
        roles[c.role_title] = (roles[c.role_title] || 0) + 1;
    });

    // History for chart (last 14 days)
    const history = Array.from({ length: 14 }).map((_, i) => {
        const d = subDays(now, 13 - i);
        const count = verified.filter(c => 
            startOfDay(new Date(c.created_at)).getTime() === startOfDay(d).getTime()
        ).length;
        return { date: format(d, "MMM dd"), count };
    });

    return {
        totalReach: verified.length * 120, // Theoretical reach
        velocity30: last30Days.length,
        velocity7: last7Days.length,
        topRoles: Object.entries(roles).sort((a,b) => b[1] - a[1]).slice(0, 3),
        history
    };
  }, [connections]);

  const verifiedConnections = connections.filter(c => c.status === "verified");
  const pendingRequests = connections.filter(c => c.status === "pending" && c.direction === "in");

  if (loading) return (
     <div className="p-12 animate-pulse space-y-6">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="grid grid-cols-3 gap-6">
            <div className="h-48 bg-muted rounded-3xl" />
            <div className="h-48 bg-muted rounded-3xl" />
            <div className="h-48 bg-muted rounded-3xl" />
        </div>
     </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 mb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-8">
         <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">Network Hub</h1>
            <p className="text-muted-foreground text-lg">Your influence, verified by the world's best creators.</p>
         </div>
      </header>

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="md:col-span-2 rounded-[2.5rem] border-2 bg-zinc-950 text-white overflow-hidden relative shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-emerald-500/10" />
            <div className="absolute top-0 right-0 p-8">
                <div className="h-12 w-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 group hover:bg-primary/20 transition-all cursor-pointer">
                    <TrendingUp className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
            </div>
            <CardHeader className="p-8 relative z-10">
               <div className="flex items-center gap-3 mb-4">
                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest px-3">Elite Status</Badge>
                  <CardTitle className="text-xl font-black tracking-tight">Influence Score</CardTitle>
               </div>
               <div className="flex items-end gap-6 mb-8">
                  <h2 className="text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]">{stats.influence}</h2>
                  <div className="pb-3">
                     <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">Verified Credits</p>
                     <p className="text-xs text-zinc-500">+{analyticsData.velocity30} in last 30 days</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                     <span>Evolution Progress</span>
                     <span className="text-primary">{stats.influence}% to Master</span>
                  </div>
                  <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                     <div 
                        className="absolute h-full bg-gradient-to-r from-primary to-emerald-400 shadow-[0_0_10px_rgba(var(--primary),0.5)] transition-all duration-1000" 
                        style={{ width: `${Math.min(stats.influence, 100)}%` }}
                     />
                  </div>
               </div>
            </CardHeader>
         </Card>

         <div className="space-y-6">
            <Card className="rounded-[2.5rem] border-2 bg-muted/5 p-8 text-center flex flex-col items-center justify-center hover:bg-muted/10 transition-colors">
                <div className="h-16 w-16 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center mb-4">
                   <BadgeCheck className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-black tracking-tighter">{stats.verifiedCount}</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Verified Nodes</p>
            </Card>
            <Card className="rounded-[2.5rem] border-2 bg-primary/5 p-8 text-center flex flex-col items-center justify-center border-dashed group cursor-pointer hover:border-primary/40 transition-all">
                <div className="h-16 w-16 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-black tracking-tighter">Boost Profile</h3>
                <p className="text-xs font-medium text-muted-foreground mt-1">Increase visibility by 40%</p>
            </Card>
         </div>
      </div>

      <Tabs defaultValue="connections" className="space-y-8">
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-auto flex-wrap justify-start border-none">
           <TabsTrigger value="connections" className="rounded-xl px-8 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="h-4 w-4 mr-2" /> Verified Network
           </TabsTrigger>
           <TabsTrigger value="analytics" className="rounded-xl px-8 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-2" /> Analytics
           </TabsTrigger>
           <TabsTrigger value="requests" className="rounded-xl px-8 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Clock className="h-4 w-4 mr-2" /> Requests
              {pendingRequests.length > 0 && (
                 <Badge className="ml-2 bg-primary text-white rounded-full px-2 py-0 h-5 min-w-5 flex items-center justify-center scale-90">
                    {pendingRequests.length}
                 </Badge>
              )}
           </TabsTrigger>
           <TabsTrigger value="discover" className="rounded-xl px-8 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Sparkles className="h-4 w-4 mr-2" /> Discover
           </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verifiedConnections.length === 0 ? (
                 <div className="col-span-full py-32 text-center border-4 border-dashed rounded-[3rem] bg-muted/5 transition-all hover:bg-muted/10">
                    <Users className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
                    <h3 className="text-2xl font-black tracking-tight">Build Your Web</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto mt-2 leading-relaxed">Your professional network is empty. Start collaborating on projects to verify your talent.</p>
                    <Button variant="outline" className="mt-8 rounded-full h-12 px-8 border-2 font-bold group">
                        Connect with Creators <ArrowUpRight className="h-4 w-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </Button>
                 </div>
              ) : (
                 verifiedConnections.map((conn) => (
                    <Card key={conn.id} className="group rounded-[2.5rem] overflow-hidden border-2 border-muted hover:border-primary/40 transition-all bg-card/50 hover:shadow-xl hover:shadow-primary/5">
                       <div className="p-8">
                          <div className="flex items-center gap-5 mb-8">
                             <Avatar className="h-16 w-16 ring-4 ring-primary/5 ring-offset-background group-hover:ring-primary/20 transition-all">
                                <AvatarImage src={conn.creator_avatar} className="object-cover" />
                                <AvatarFallback className="font-black">{conn.creator_name[0]}</AvatarFallback>
                             </Avatar>
                             <div className="flex-1 truncate">
                                <p className="font-black text-lg truncate group-hover:text-primary transition-colors">{conn.creator_name}</p>
                                <Badge variant="secondary" className="mt-1 rounded-md text-[10px] font-black uppercase tracking-widest">{conn.role_title}</Badge>
                             </div>
                             <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                                <MoreHorizontal className="h-4 w-4" />
                             </Button>
                          </div>
                          
                          <div className="p-5 rounded-2xl bg-muted/30 border border-muted-foreground/10 mb-8 relative overflow-hidden group/box">
                             <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-1.5 opacity-60">Verified Collaboration</p>
                             <p className="text-sm font-bold truncate pr-6">{conn.project_title}</p>
                             <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                             <Link href={`/${conn.creator_slug}`}>
                                <Button variant="outline" className="w-full rounded-2xl font-black h-12 border-2 text-xs uppercase tracking-widest">
                                   Portfolio
                                </Button>
                             </Link>
                             <Button className="rounded-2xl font-black h-12 w-full shadow-lg shadow-primary/20 text-xs uppercase tracking-widest">
                                Ping
                             </Button>
                          </div>
                       </div>
                    </Card>
                 ))
              )}
           </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="rounded-[2.5rem] border-2 bg-background p-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <Globe2 className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-3xl font-black tracking-tighter">{(analyticsData.totalReach / 1000).toFixed(1)}k</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estimated Reach</p>
                    </div>
                </Card>
                <Card className="rounded-[2.5rem] border-2 bg-background p-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                        <Activity className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-3xl font-black tracking-tighter">+{analyticsData.velocity7}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Weekly Velocity</p>
                    </div>
                </Card>
                <Card className="rounded-[2.5rem] border-2 bg-background p-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <Award className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-3xl font-black tracking-tighter">{verifiedConnections.length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verified Credits</p>
                    </div>
                </Card>
                <Card className="rounded-[2.5rem] border-2 bg-background p-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-3xl font-black tracking-tighter">{analyticsData.velocity30}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">30D New Connects</p>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Growth Chart */}
                <Card className="md:col-span-2 rounded-[3rem] border-2 bg-background p-10 overflow-hidden">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <CardTitle className="text-xl font-black">Influence Velocity</CardTitle>
                            <CardDescription>Network growth over the last 14 days</CardDescription>
                        </div>
                        <Badge variant="outline" className="rounded-full px-4 h-8 font-bold">Live Data</Badge>
                    </div>
                    <div className="h-[200px] w-full flex items-end justify-between gap-3 px-4">
                        {analyticsData.history.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                                <div className="w-full relative">
                                    <div 
                                        className="w-full bg-primary/20 rounded-full group-hover:bg-primary/40 transition-all relative overflow-hidden" 
                                        style={{ height: `${Math.max(day.count * 40, 12)}px` }}
                                    >
                                        <div className="absolute bottom-0 left-0 w-full bg-primary/40 h-2 group-hover:h-full transition-all duration-500" />
                                    </div>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {day.count}
                                    </div>
                                </div>
                                <span className="text-[9px] font-black uppercase text-muted-foreground opacity-40 group-hover:opacity-100 rotate-45 md:rotate-0">{day.date}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Role Breakdown */}
                <Card className="rounded-[3rem] border-2 bg-background p-10">
                    <CardTitle className="text-xl font-black mb-10">Professional Density</CardTitle>
                    <div className="space-y-8">
                        {analyticsData.topRoles.length === 0 ? (
                            <div className="text-center py-20 opacity-30">
                                <Users className="h-10 w-10 mx-auto" />
                            </div>
                        ) : (
                            analyticsData.topRoles.map(([role, count]) => (
                                <div key={role} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm font-black uppercase tracking-widest">{role}</span>
                                        <span className="text-xs font-bold text-muted-foreground">{count} connections</span>
                                    </div>
                                    <Progress value={(count / verifiedConnections.length) * 100} className="h-2" />
                                </div>
                            ))
                        )}
                        <p className="text-[10px] text-muted-foreground text-center pt-6 uppercase tracking-[0.2em] font-black">Core Network Composition</p>
                    </div>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
           {pendingRequests.length === 0 ? (
              <div className="py-32 text-center border-4 border-dashed rounded-[3rem] bg-muted/5">
                 <Clock className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
                 <h3 className="text-2xl font-black">Pure Horizon</h3>
                 <p className="text-muted-foreground max-w-xs mx-auto mt-2 text-sm leading-relaxed">No pending requests found. When colleagues tag you in projects, you'll see them here.</p>
              </div>
           ) : (
              <div className="grid gap-4 max-w-4xl mx-auto">
                 {pendingRequests.map((req) => (
                    <Card key={req.id} className="rounded-3xl border-2 shadow-sm hover:shadow-xl transition-all overflow-hidden bg-card/80 backdrop-blur-sm">
                       <div className="p-8 flex flex-col md:flex-row items-center gap-8">
                          <Avatar className="h-20 w-20 ring-4 ring-muted">
                             <AvatarImage src={req.creator_avatar} />
                             <AvatarFallback className="font-black text-xl">{req.creator_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-center md:text-left space-y-2">
                             <p className="font-black text-2xl tracking-tight">{req.creator_name}</p>
                             <p className="text-muted-foreground text-lg">
                                Tagged you as <span className="text-primary font-black underline underline-offset-4 Decoration-primary/30">"{req.role_title}"</span>
                             </p>
                             <div className="pt-2">
                                <Badge variant="secondary" className="px-4 py-1.5 rounded-full font-bold">Project: {req.project_title}</Badge>
                             </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                             <Button variant="ghost" className="rounded-2xl h-14 px-8 font-black text-destructive hover:bg-destructive/5 uppercase tracking-widest text-xs">
                                Ignore
                             </Button>
                             <Button className="rounded-2xl h-14 px-10 font-black shadow-xl shadow-primary/20 gap-2 uppercase tracking-widest text-xs">
                                <CheckCircle className="h-4 w-4" /> Verify Credit
                             </Button>
                          </div>
                       </div>
                    </Card>
                 ))}
              </div>
           )}
        </TabsContent>

        <TabsContent value="discover" className="space-y-6">
           <div className="py-32 text-center border-4 border-dashed rounded-[4rem] bg-muted/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.08),transparent)] pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
              <div className="relative z-10 max-w-md mx-auto">
                 <div className="h-24 w-24 rounded-[2.5rem] bg-zinc-950 flex items-center justify-center mx-auto mb-10 shadow-2xl relative overflow-hidden">
                    <Sparkles className="h-10 w-10 text-primary animate-pulse relative z-10" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/20 to-transparent" />
                 </div>
                 <h3 className="text-3xl font-black tracking-tighter mb-4">Neural Discovery</h3>
                 <p className="text-muted-foreground mb-10 text-lg leading-relaxed">
                   We're currently training our algorithm to match you with compatible creators based on your artistic blueprint.
                 </p>
                 <Button className="rounded-full h-14 px-10 font-black gap-3 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white border-2 border-white/10 shadow-2xl hover:scale-105 active:scale-95 transition-all">
                    Secure Early Access <ArrowUpRight className="h-5 w-5" />
                 </Button>
                 <p className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-primary">In Beta Development</p>
              </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
