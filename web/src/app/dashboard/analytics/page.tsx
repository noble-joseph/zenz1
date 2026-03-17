"use client";

import { useState, useEffect } from "react";
import { 
  LineChart, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  BrainCircuit, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ connections: 0, projects: 0, commits: 0 });
  const [chartData, setChartData] = useState<number[]>(Array(12).fill(0));
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch precise counts
        const [{ count: connCount }, { count: projCount }, { count: commitCount }, { data: profData }] = await Promise.all([
          supabase.from("connections").select("*", { count: "exact", head: true }).or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).eq("status", "accepted"),
          supabase.from("projects").select("*", { count: "exact", head: true }).eq("owner_id", user.id),
          supabase.from("commits").select("*", { count: "exact", head: true }).eq("created_by", user.id),
          supabase.from("profiles").select("display_name, profession").eq("id", user.id).single()
        ]);

        setStats({
          connections: connCount || 0,
          projects: projCount || 0,
          commits: commitCount || 0
        });
        setProfile(profData || null);

        // Activity chart (commits last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: recentCommits } = await supabase
          .from("commits")
          .select("created_at")
          .eq("created_by", user.id)
          .gte("created_at", thirtyDaysAgo.toISOString());

        const bins = Array(12).fill(0);
        if (recentCommits && recentCommits.length > 0) {
          const now = new Date().getTime();
          const start = thirtyDaysAgo.getTime();
          const binSize = (now - start) / 12;

          recentCommits.forEach(c => {
            const t = new Date(c.created_at).getTime();
            let binIdx = Math.floor((t - start) / binSize);
            if (binIdx >= 12) binIdx = 11;
            if (binIdx >= 0) {
              bins[binIdx]++;
            }
          });
        }
        setChartData(bins);
      } catch (e) {
        console.error("Failed to load analytics", e);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-32 bg-muted/20 rounded-[2.5rem]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-muted/20 rounded-3xl" />)}
        </div>
        <div className="h-96 bg-muted/20 rounded-[2.5rem]" />
      </div>
    );
  }

  const maxChartVal = Math.max(...chartData, 1);

  return (
    <div className="max-w-7xl mx-auto space-y-8 mb-20">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1 text-primary">
          <LineChart className="h-5 w-5" />
          <span className="text-sm font-black uppercase tracking-widest">Performance</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">AI Analytics</h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Deep insights into your network growth, project reach, and creative impact.
        </p>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-2 shadow-lg hover:border-primary/20 transition-all bg-background">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Users className="h-7 w-7" />
              </div>
              <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 px-3 py-1">
                Live Data
              </Badge>
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Network Connections</p>
            <h3 className="text-4xl font-black">{stats.connections}</h3>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-2 shadow-lg hover:border-primary/20 transition-all bg-background">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="h-14 w-14 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <BarChart3 className="h-7 w-7" />
              </div>
              <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 px-3 py-1">
                Live Data
              </Badge>
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Projects</p>
            <h3 className="text-4xl font-black">{stats.projects}</h3>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-2 shadow-lg hover:border-primary/20 transition-all bg-background">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Eye className="h-7 w-7" />
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-3 py-1">
                Live Data
              </Badge>
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Asset Commits</p>
            <h3 className="text-4xl font-black">{stats.commits}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <Card className="lg:col-span-2 rounded-[2.5rem] border-2 shadow-lg bg-background overflow-hidden flex flex-col">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black">Activity Over Time</CardTitle>
            <CardDescription>Your upload frequency for the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 flex-1 flex flex-col justify-end min-h-[300px]">
            {/* CSS Mock Chart tied to real data bins */}
            <div className="w-full h-48 flex items-end gap-2 md:gap-4 mt-auto">
              {chartData.map((val, i) => (
                <div key={i} className="flex-1 w-full bg-primary/10 hover:bg-primary/20 rounded-t-lg relative group transition-colors" style={{ height: `${val === 0 ? 5 : (val / maxChartVal) * 100}%` }}>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 z-10 transition-opacity whitespace-nowrap shadow-xl border">
                    {val} uploads
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs font-bold text-muted-foreground px-1">
              <span>30 Days Ago</span>
              <span>15 Days Ago</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights Panel */}
        <Card className="rounded-[2.5rem] border-2 shadow-xl bg-zinc-950 text-white relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/30 blur-[80px] rounded-full pointer-events-none" />
          <CardHeader className="p-8 pb-4 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <span className="text-xs font-black text-primary tracking-widest uppercase">Neural Engine</span>
            </div>
            <CardTitle className="text-2xl font-black text-white">AI Insights</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 relative z-10 space-y-6">
            
            <div className="p-5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm mb-1 text-white">Profile Reach</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {stats.projects > 0 
                      ? `You currently have ${stats.projects} project(s) showcasing your ${profile?.profession || 'creative'} skills. Keep uploading to increase visibility.` 
                      : `You haven't uploaded any projects yet. Publishing your first project is a critical step in building your network.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm mb-1 text-white">Network Opportunity</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {stats.connections > 0
                      ? `You have connected with ${stats.connections} creator(s). Active networking leads to more collaboration opportunities.`
                      : `Your network is empty. Head over to Neural Discover to find like-minded collaborators.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                Generate Full Report
              </button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
