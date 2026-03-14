import Link from "next/link";
import { ArrowRight, BadgeCheck, Sparkles, LayoutGrid } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DiscoverySection } from "@/components/discovery-section";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  // Fetch top creators
  const { data: topCreators } = await supabase
    .from("profiles")
    .select("id, display_name, public_slug, bio, influence_score, avatar_url")
    .eq("role", "creator")
    .not("display_name", "is", null)
    .not("avatar_url", "is", null)
    .order("influence_score", { ascending: false })
    .limit(6);

  // Fetch featured assets (Photography and Music)
  const { data: featuredAssets } = await supabase
    .from("assets")
    .select("*, profiles!inner(display_name, avatar_url)")
    .not("profiles.display_name", "is", null)
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tighter">
            <div className="bg-emerald-600 text-white p-1 rounded-lg">
              <LayoutGrid className="h-6 w-6" />
            </div>
            TALENT OS
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              For Hirers
            </Link>
            <div className="h-4 w-px bg-border sm:block hidden" />
            <Button size="sm" variant="outline" render={<Link href="/login" />} nativeButton={false} className="sm:inline-flex hidden">
              Creator Login
            </Button>
            <Button size="sm" render={<Link href="/login" />} nativeButton={false}>
              Join as Creator
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24">
          <div className="container mx-auto px-4 text-center lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800 mb-8 dark:bg-emerald-950/30 dark:border-emerald-900/50">
              <Sparkles className="h-4 w-4" />
              Verifiable Creator Ecosystem
            </div>
            <h1 className="text-balance text-5xl font-black tracking-tighter sm:text-6xl lg:text-8xl mb-8">
              Hire the best{" "}
              <span className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                verified
              </span>{" "}
              talent.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground lg:text-2xl leading-relaxed">
              Discover photographers and musicians whose influence is mathematically proven by their collaboration graph.
            </p>
          </div>
        </section>

        {/* Discovery & Filtering Section */}
        <section className="py-12">
          <div className="container mx-auto px-4 lg:px-8">
             <DiscoverySection 
               initialAssets={featuredAssets || []} 
               initialCreators={topCreators || []} 
             />
          </div>
        </section>

        {/* Top Creators Grid */}
        <section className="border-t bg-muted/20 py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mb-12">
              <h2 className="text-3xl font-black tracking-tight">
                Top Rated Talent
              </h2>
              <p className="mt-2 text-muted-foreground text-lg">
                Creators ranked by our proprietary Verified Credit System.
              </p>
            </div>

            {(topCreators?.length ?? 0) === 0 ? (
              <div className="rounded-3xl border border-dashed border-emerald-200 p-12 text-center bg-white/50">
                <p className="text-muted-foreground">
                  The ecosystem is growing. Be the first to join!
                </p>
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {topCreators?.map((creator) => {
                  const displayName = creator.display_name || "Creator";
                  const initials = displayName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <Link
                      key={creator.id}
                      href={`/${creator.public_slug}`}
                      className="group flex flex-col rounded-3xl border bg-card p-1 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-1"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <Avatar className="h-20 w-20 border-4 border-background shadow-lg group-hover:border-emerald-500/10 transition-colors">
                            <AvatarImage src={creator.avatar_url || ""} />
                            <AvatarFallback className="bg-emerald-50 font-black text-emerald-700 text-xl">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                            <BadgeCheck className="h-4 w-4" />
                            {creator.influence_score} CREDITS
                          </div>
                        </div>

                        <div className="mt-6 flex-1">
                          <h3 className="text-xl font-black tracking-tight">
                            {displayName}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                            {creator.bio || "No biography provided."}
                          </p>
                        </div>

                        <div className="mt-8 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-emerald-600">
                          talent.os/{creator.public_slug}
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            
            <div className="mt-16 text-center">
               <Button size="lg" variant="outline" className="rounded-full px-8 shadow-sm">
                 Browse All Talent
               </Button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-emerald-900 text-white overflow-hidden relative">
           <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-400 rounded-full blur-[120px]" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600 rounded-full blur-[120px]" />
           </div>
           <div className="container mx-auto px-4 text-center relative z-10">
              <h2 className="text-4xl lg:text-6xl font-black mb-8">Ready to prove your influence?</h2>
              <p className="text-xl text-emerald-100/80 mb-12 max-w-2xl mx-auto">
                Join thousands of creators who are cryptographically securing their work and building verifiable professional networks.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <Button size="lg" className="bg-white text-emerald-900 hover:bg-emerald-50 font-black rounded-2xl h-14 px-10" render={<Link href="/login" />} nativeButton={false}>
                    Create Your Profile
                 </Button>
                 <Button size="lg" variant="outline" className="border-emerald-700 text-white hover:bg-emerald-800 font-bold rounded-2xl h-14 px-10">
                    Learn More
                 </Button>
              </div>
           </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-white dark:bg-zinc-950">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2 font-black text-xl tracking-tighter">
              <div className="bg-emerald-600 text-white p-1 rounded-lg">
                <LayoutGrid className="h-6 w-6" />
              </div>
              TALENT OS
            </div>
            <div className="flex gap-8 text-sm font-bold text-muted-foreground uppercase tracking-widest text-xs">
              <Link href="#" className="hover:text-emerald-600 transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-emerald-600 transition-colors">Terms</Link>
              <Link href="#" className="hover:text-emerald-600 transition-colors">Support</Link>
            </div>
            <p className="text-sm text-zinc-400">© {new Date().getFullYear()} Talent OS. Built for Creators.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
