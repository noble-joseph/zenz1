import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Sparkles } from "lucide-react";

import { VibeSearchResults } from "@/components/vibe-search-results";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const currentQuery = (await searchParams).q || "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-7xl items-center px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Talent OS
          </Link>
        </div>
      </header>
      
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          
          <div className="mb-10 text-center">
            <h1 className="flex items-center justify-center gap-3 text-3xl font-extrabold tracking-tight lg:text-5xl">
              <Sparkles className="h-8 w-8 text-emerald-500" /> Vibe Search
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Describe the feeling, mood, or concept you&apos;re looking for. Our AI parses the cryptographically secured assets and returns semantic matches.
            </p>
          </div>

          <div className="mx-auto max-w-2xl">
            <form action="/search" method="GET" className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={currentQuery}
                placeholder="e.g. 'moody cyberpunk neon street photography'"
                className="h-14 w-full rounded-full border border-input bg-background pl-12 pr-24 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="submit"
                className="absolute right-2 h-10 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Search
              </button>
            </form>
          </div>

          {currentQuery ? (
            <div className="mt-8">
              <h2 className="text-xl font-semibold tracking-tight">
                Results for &quot;<span className="text-primary">{currentQuery}</span>&quot;
              </h2>
              <Suspense
                fallback={
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
                    ))}
                  </div>
                }
              >
                <VibeSearchResults query={currentQuery} />
              </Suspense>
            </div>
          ) : (
            <div className="mt-16 text-center text-muted-foreground">
              Enter a search query to discover connected raw assets.
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
