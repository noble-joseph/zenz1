import { Suspense } from "react";
import { Sparkles, Filter } from "lucide-react";
import { VibeSearchResults } from "@/components/vibe-search-results";
import { SearchInput } from "./search-input";

export default async function ExplorePage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams.q || "";

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <header>
        <h1 className="text-4xl font-black tracking-tighter mb-2">Explore</h1>
        <p className="text-muted-foreground text-lg">
          Discover creators, projects, and assets through AI-powered vibe search.
        </p>
      </header>

      {/* Spotlight Search Bar (Client Component) */}
      <SearchInput initialQuery={query} />

      <div className="mt-4">
        {query ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Showing results for <span className="text-primary italic">"{query}"</span>
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                Sorted by Relevance
              </div>
            </div>
            <Suspense
              fallback={
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              }
            >
              <VibeSearchResults query={query} />
            </Suspense>
          </div>
        ) : (
          <div className="py-32 text-center bg-muted/20 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center">
             <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
                <Sparkles className="h-10 w-10 text-primary/40" />
             </div>
             <h3 className="text-2xl font-black tracking-tight mb-2">Start your search</h3>
             <p className="text-muted-foreground max-w-sm mx-auto">
                Our AI understands artistic concepts. Describe a mood or style to find perfect matches across the entire network.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
