"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, 
  BadgeCheck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Zap,
  MoreHorizontal,
  Sparkles,
  BarChart3,
  Globe2,
  Activity,
  Award,
  Calendar,
  Loader2,
  Brain,
  Target,
  AlertTriangle,
  ArrowUpRight,
  Download,
  RefreshCw,
  MessageSquare
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
import { acceptCollaboration, rejectCollaboration } from "@/app/actions/collaborations";
import { generateNetworkInsightsAction } from "@/app/actions/ai";

/* eslint-disable @typescript-eslint/no-explicit-any */

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

interface AIInsight {
  title: string;
  text: string;
  type: string;
}

export default function NetworkPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ influence: 0, verifiedCount: 0 });
  const [profile, setProfile] = useState<any>(null);
  const [discovery, setDiscovery] = useState<any[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadNetwork();
    void loadDiscovery();
  }, []);

  async function loadNetwork() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      setProfile(prof);

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

  async function loadDiscovery() {
    setDiscoveryLoading(true);
    try {
        const res = await fetch("/api/neural-discovery");
        if (res.ok) {
            const data = await res.json();
            setDiscovery(data.matches || []);
        }
    } catch (err) {
        console.error("Discovery failed", err);
    } finally {
        setDiscoveryLoading(false);
    }
  }

  // Handle Credit Accept
  const handleAcceptCredit = useCallback(async (id: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
    const result = await acceptCollaboration(id);
    if (result.success) {
      toast.success("Credit verified! Your influence score has been updated.");
      setConnections(prev => prev.map(c => c.id === id ? { ...c, status: "verified" } : c));
      setStats(prev => ({ ...prev, verifiedCount: prev.verifiedCount + 1, influence: prev.influence + 1 }));
    } else {
      toast.error(result.error || "Failed to verify credit");
    }
    setProcessingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  // Handle Credit Reject
  const handleRejectCredit = useCallback(async (id: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
    const result = await rejectCollaboration(id);
    if (result.success) {
      toast.success("Credit rejected.");
      setConnections(prev => prev.map(c => c.id === id ? { ...c, status: "rejected" } : c));
    } else {
      toast.error(result.error || "Failed to reject credit");
    }
    setProcessingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  // Load AI Insights
  const loadAIInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const result = await generateNetworkInsightsAction({
        totalConnections: connections.length,
        verifiedCount: stats.verifiedCount,
        velocity30: analyticsData.velocity30,
        velocity7: analyticsData.velocity7,
        topRoles: analyticsData.topRoles,
        influenceScore: stats.influence,
        profession: profile?.profession || null,
      });
      if (result.ok && result.data) {
        setAiInsights(result.data.insights);
      }
    } catch (err) {
      console.error("AI Insights Error:", err);
    } finally {
      setInsightsLoading(false);
    }
  }, [connections, stats, profile]);

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

    // Monthly comparison
    const last60Days = verified.filter(c => isAfter(new Date(c.created_at), subDays(now, 60)));
    const previousMonth = last60Days.length - last30Days.length;
    const growthRate = previousMonth > 0 ? ((last30Days.length - previousMonth) / previousMonth * 100) : last30Days.length > 0 ? 100 : 0;

    return {
        totalReach: verified.length * 120,
        velocity30: last30Days.length,
        velocity7: last7Days.length,
        topRoles: Object.entries(roles).sort((a,b) => b[1] - a[1]).slice(0, 5) as [string, number][],
        history,
        growthRate: Math.round(growthRate),
        previousMonth
    };
  }, [connections]);

  const verifiedConnections = connections.filter(c => c.status === "verified");
  const pendingRequests = connections.filter(c => c.status === "pending" && c.direction === "in");

  // Download report
  const downloadReport = useCallback(() => {
    const report = {
      generatedAt: new Date().toISOString(),
      profile: { name: profile?.display_name, profession: profile?.profession },
      metrics: {
        influenceScore: stats.influence,
        verifiedCredits: stats.verifiedCount,
        totalConnections: connections.length,
        estimatedReach: analyticsData.totalReach,
        weeklyVelocity: analyticsData.velocity7,
        monthlyVelocity: analyticsData.velocity30,
        growthRate: `${analyticsData.growthRate}%`
      },
      topRoles: analyticsData.topRoles,
      history: analyticsData.history,
      aiInsights: aiInsights
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `network-report-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
  }, [profile, stats, connections, analyticsData, aiInsights]);

  if (loading) return (
     <div className="p-12 animate-pulse space-y-6">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <p className="text-muted-foreground text-lg">Your influence, verified by the world&apos;s best creators.</p>
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
                     <span className="text-primary">{Math.min(stats.influence, 100)}% to Master</span>
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

      {/* ========== TABS ========== */}
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
              <Sparkles className="h-4 w-4 mr-2" /> Neural Discover
           </TabsTrigger>
        </TabsList>

        {/* ====== VERIFIED NETWORK TAB ====== */}
        <TabsContent value="connections" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verifiedConnections.length === 0 ? (
                 <div className="col-span-full py-32 text-center border-4 border-dashed rounded-[3rem] bg-muted/5 transition-all hover:bg-muted/10">
                    <Users className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
                    <h3 className="text-2xl font-black tracking-tight">Build Your Web</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto mt-2 leading-relaxed">Your professional network is empty. Start collaborating on projects to verify your talent.</p>
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
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                             <Link href={`/${conn.creator_slug}`}>
                                <Button variant="outline" className="w-full rounded-2xl font-black h-12 border-2 text-xs uppercase tracking-widest">
                                   Portfolio
                                </Button>
                             </Link>
                             <Button 
                               className="rounded-2xl font-black h-12 w-full shadow-lg shadow-primary/20 text-xs uppercase tracking-widest gap-2"
                               onClick={() => router.push(`/dashboard/messages?to=${conn.creator_id}`)}
                             >
                                <MessageSquare className="h-3.5 w-3.5" /> Message
                             </Button>
                          </div>
                       </div>
                    </Card>
                 ))
              )}
           </div>
        </TabsContent>

        {/* ====== ANALYTICS TAB ====== */}
        <TabsContent value="analytics" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <Card className="rounded-[2rem] border-2 bg-background p-6 md:p-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <Globe2 className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-2xl md:text-3xl font-black tracking-tighter">{(analyticsData.totalReach / 1000).toFixed(1)}k</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estimated Reach</p>
                    </div>
                </Card>
                <Card className="rounded-[2rem] border-2 bg-background p-6 md:p-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                        <Activity className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-2xl md:text-3xl font-black tracking-tighter">+{analyticsData.velocity7}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Weekly Velocity</p>
                    </div>
                </Card>
                <Card className="rounded-[2rem] border-2 bg-background p-6 md:p-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <Award className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-2xl md:text-3xl font-black tracking-tighter">{verifiedConnections.length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Verified Credits</p>
                    </div>
                </Card>
                <Card className="rounded-[2rem] border-2 bg-background p-6 md:p-8 space-y-4">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-2xl md:text-3xl font-black tracking-tighter">{analyticsData.velocity30}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">30D New Connects</p>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Growth Chart */}
                <Card className="md:col-span-2 rounded-[2.5rem] border-2 bg-background p-8 md:p-10 overflow-hidden">
                    <div className="flex items-center justify-between mb-8 md:mb-10">
                        <div>
                            <CardTitle className="text-xl font-black">Influence Velocity</CardTitle>
                            <CardDescription>Network growth over the last 14 days</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full px-4 h-8 font-bold">Live Data</Badge>
                          {analyticsData.growthRate !== 0 && (
                            <Badge 
                              variant="outline" 
                              className={`rounded-full px-4 h-8 font-bold ${analyticsData.growthRate > 0 ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-red-600 border-red-200 bg-red-50'}`}
                            >
                              <ArrowUpRight className={`h-3 w-3 mr-1 ${analyticsData.growthRate < 0 ? 'rotate-180' : ''}`} />
                              {analyticsData.growthRate > 0 ? '+' : ''}{analyticsData.growthRate}% MoM
                            </Badge>
                          )}
                        </div>
                    </div>
                    <div className="h-[200px] w-full flex items-end justify-between gap-1.5 md:gap-3 px-2 md:px-4">
                        {analyticsData.history.map((day, i) => {
                            const maxCount = Math.max(...analyticsData.history.map(d => d.count), 1);
                            const heightPct = (day.count / maxCount) * 100;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-2 md:gap-4 group">
                                  {day.count > 0 && (
                                    <span className="text-[9px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                      {day.count}
                                    </span>
                                  )}
                                  <div className="w-full relative">
                                      <div 
                                          className="w-full rounded-full transition-all duration-500 group-hover:shadow-lg group-hover:shadow-primary/20"
                                          style={{ 
                                            height: `${Math.max(heightPct * 1.5, 8)}px`,
                                            background: day.count > 0 
                                              ? `linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.6))` 
                                              : 'hsl(var(--muted))'
                                          }}
                                      />
                                  </div>
                                  <span className="text-[8px] md:text-[9px] font-black uppercase text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity">{day.date.split(' ')[1]}</span>
                              </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Role Breakdown */}
                <Card className="rounded-[2.5rem] border-2 bg-background p-8 md:p-10">
                    <CardTitle className="text-xl font-black mb-8 md:mb-10">Professional Density</CardTitle>
                    <div className="space-y-6 md:space-y-8">
                        {analyticsData.topRoles.length === 0 ? (
                          <div className="text-center py-8">
                            <Target className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <p className="text-sm text-muted-foreground">Collaborate on projects to build your professional density map.</p>
                          </div>
                        ) : (
                          analyticsData.topRoles.map(([role, count]) => (
                              <div key={role} className="space-y-3">
                                  <div className="flex justify-between items-end">
                                      <span className="text-sm font-black uppercase tracking-widest">{role}</span>
                                      <span className="text-xs font-bold text-muted-foreground">{count} credit{count !== 1 ? 's' : ''}</span>
                                  </div>
                                  <Progress value={(count / (verifiedConnections.length || 1)) * 100} className="h-2" />
                              </div>
                          ))
                        )}
                        <p className="text-[10px] text-muted-foreground text-center pt-4 md:pt-6 uppercase tracking-[0.2em] font-black">Core Network Composition</p>
                    </div>
                </Card>
            </div>

            {/* AI Insights Section */}
            <Card className="rounded-[2.5rem] border-2 bg-gradient-to-br from-zinc-950 to-zinc-900 text-white overflow-hidden relative shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                <CardHeader className="p-8 md:p-10 pb-0 relative z-10">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                                <Brain className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black text-white">AI Career Insights</CardTitle>
                                <CardDescription className="text-zinc-400">Powered by neural analysis of your network</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={downloadReport}
                              className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2 h-9"
                            >
                                <Download className="h-3.5 w-3.5" /> Export Report
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => void loadAIInsights()}
                              disabled={insightsLoading}
                              className="rounded-full gap-2 h-9 shadow-lg shadow-primary/20"
                            >
                                {insightsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                {insightsLoading ? "Analyzing..." : aiInsights.length > 0 ? "Refresh" : "Generate Insights"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 md:p-10 relative z-10">
                    {aiInsights.length === 0 && !insightsLoading ? (
                      <div className="text-center py-8">
                        <Sparkles className="h-10 w-10 mx-auto mb-4 text-primary/40" />
                        <p className="text-sm text-zinc-400">Click &quot;Generate Insights&quot; to get AI-powered career recommendations based on your network data.</p>
                      </div>
                    ) : insightsLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1,2,3].map(i => (
                          <div key={i} className="p-6 rounded-2xl bg-white/5 animate-pulse">
                            <div className="h-4 w-24 bg-white/10 rounded mb-3" />
                            <div className="h-3 w-full bg-white/5 rounded mb-2" />
                            <div className="h-3 w-3/4 bg-white/5 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {aiInsights.map((insight, i) => (
                          <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                                insight.type === 'growth' ? 'bg-emerald-500/20 text-emerald-400' :
                                insight.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {insight.type === 'growth' ? <TrendingUp className="h-4 w-4" /> :
                                 insight.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                                 <Target className="h-4 w-4" />}
                              </div>
                              <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{insight.title}</span>
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed">{insight.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        {/* ====== REQUESTS TAB ====== */}
        <TabsContent value="requests" className="space-y-6">
           {pendingRequests.length === 0 ? (
              <div className="py-32 text-center border-4 border-dashed rounded-[3rem] bg-muted/5">
                 <Clock className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
                 <h3 className="text-2xl font-black">Clear Horizon</h3>
                 <p className="text-muted-foreground max-w-xs mx-auto mt-2 text-sm leading-relaxed">No pending requests found.</p>
              </div>
           ) : (
              <div className="grid gap-4 max-w-4xl mx-auto">
                 {pendingRequests.map((req) => {
                   const isProcessing = processingIds.has(req.id);
                   return (
                    <Card key={req.id} className="rounded-3xl border-2 shadow-sm hover:shadow-xl transition-all overflow-hidden bg-card/80 backdrop-blur-sm">
                       <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                          <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-4 ring-muted">
                             <AvatarImage src={req.creator_avatar} />
                             <AvatarFallback className="font-black text-xl">{req.creator_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-center md:text-left space-y-2">
                             <p className="font-black text-xl md:text-2xl tracking-tight">{req.creator_name}</p>
                             <p className="text-muted-foreground text-base md:text-lg">
                               Tagged you as <span className="text-primary font-black underline">&quot;{req.role_title}&quot;</span> on <span className="font-bold">{req.project_title}</span>
                             </p>
                             <p className="text-xs text-muted-foreground">
                               {format(new Date(req.created_at), "MMM dd, yyyy")}
                             </p>
                          </div>
                          <div className="flex gap-3">
                             <Button 
                               variant="ghost" 
                               className="rounded-2xl h-12 md:h-14 px-6 md:px-8 font-black text-destructive uppercase tracking-widest text-xs gap-2"
                               onClick={() => void handleRejectCredit(req.id)}
                               disabled={isProcessing}
                             >
                               {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                               Ignore
                             </Button>
                             <Button 
                               className="rounded-2xl h-12 md:h-14 px-8 md:px-10 font-black shadow-xl shadow-primary/20 gap-2 uppercase tracking-widest text-xs"
                               onClick={() => void handleAcceptCredit(req.id)}
                               disabled={isProcessing}
                             >
                               {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                               Verify Credit
                             </Button>
                          </div>
                       </div>
                    </Card>
                   );
                 })}
              </div>
           )}
        </TabsContent>

        {/* ====== NEURAL DISCOVER TAB ====== */}
        <TabsContent value="discover" className="space-y-8">
           {/* Refresh Controls */}
           <div className="flex items-center justify-between">
             <div>
               <h2 className="text-xl font-black tracking-tight">Your Creative Twins</h2>
               <p className="text-sm text-muted-foreground">Matched by AI based on your professional blueprint</p>
             </div>
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => void loadDiscovery()} 
               disabled={discoveryLoading}
               className="rounded-full gap-2 h-9"
             >
               {discoveryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
               Refresh Matches
             </Button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {discoveryLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="rounded-[2.5rem] border-2 bg-muted/5 p-8 animate-pulse">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-16 w-16 rounded-full bg-muted" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-24 bg-muted rounded" />
                                <div className="h-3 w-16 bg-muted rounded" />
                            </div>
                        </div>
                        <div className="h-20 w-full bg-muted rounded-xl mb-4" />
                        <div className="h-10 w-full bg-muted rounded-xl" />
                    </Card>
                  ))
              ) : discovery.length === 0 ? (
                <div className="col-span-full py-32 text-center border-4 border-dashed rounded-[4rem] bg-muted/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 pointer-events-none" />
                    <Sparkles className="h-16 w-16 mx-auto mb-6 text-primary opacity-20" />
                    <h3 className="text-2xl font-black tracking-tight">Expand Your Blueprint</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2 leading-relaxed text-sm">
                        Add more detail to your bio and skills in Settings to help our neural engine find your creative twins.
                    </p>
                    <Link href="/dashboard/settings">
                      <Button className="mt-6 rounded-full h-11 px-8 font-black gap-2 shadow-lg shadow-primary/20">
                        <Sparkles className="h-4 w-4" /> Update Blueprint
                      </Button>
                    </Link>
                </div>
              ) : (
                discovery.map((match) => (
                    <Card key={match.id} className="group rounded-[2.5rem] overflow-hidden border-2 border-muted hover:border-primary/40 transition-all bg-card/50 hover:shadow-xl relative">
                        <div className="absolute top-6 right-8">
                          <Badge 
                            variant="outline" 
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                              match.similarity >= 0.8 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                              match.similarity >= 0.5 ? 'bg-primary/10 text-primary border-primary/20' :
                              'bg-amber-500/10 text-amber-600 border-amber-200'
                            }`}
                          >
                            {Math.round(match.similarity * 100)}% Match
                          </Badge>
                        </div>
                        <div className="p-8">
                            <div className="flex items-center gap-5 mb-6">
                                <Avatar className="h-16 w-16 ring-4 ring-primary/5">
                                    <AvatarImage src={match.avatar_url} className="object-cover" />
                                    <AvatarFallback className="font-black text-xl">{match.display_name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 truncate">
                                    <p className="font-black text-lg truncate group-hover:text-primary transition-colors">{match.display_name}</p>
                                    <p className="text-xs font-bold text-muted-foreground truncate">{match.profession}</p>
                                </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px] leading-relaxed">
                                {match.bio || "No professional blueprint provided yet."}
                            </p>

                            {/* Match Reasoning */}
                            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 mb-6 flex items-center gap-2">
                              <Brain className="h-4 w-4 text-primary shrink-0" />
                              <p className="text-[10px] font-bold text-primary/80">
                                {match.influence_score > 0 
                                  ? `Influence Score: ${match.influence_score} · Verified professional`
                                  : 'Emerging creator · Similar creative blueprint'}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Link href={`/${match.public_slug}`}>
                                    <Button variant="outline" className="w-full rounded-2xl font-black h-12 border-2 text-[10px] uppercase tracking-widest">
                                        Blueprint
                                    </Button>
                                </Link>
                                <Button 
                                  className="rounded-2xl font-black h-12 w-full shadow-lg shadow-primary/20 text-[10px] uppercase tracking-widest gap-1.5"
                                  onClick={() => router.push(`/dashboard/messages?to=${match.id}`)}
                                >
                                    <MessageSquare className="h-3.5 w-3.5" /> Connect
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))
              )}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
