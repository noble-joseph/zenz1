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
    <div className="flex flex-col gap-6 lg:gap-8 max-w-6xl mx-auto">
      <header className="px-2">
        <h1 className="text-3xl lg:text-4xl font-black tracking-tighter mb-2">EXPLORE</h1>
        <p className="text-muted-foreground text-base lg:text-lg">
          Discover creators, projects, and assets through AI-powered vibe search.
        </p>
      </header>

      {/* Spotlight Search Bar (Client Component) */}
      <div className="px-2">
        <SearchInput initialQuery={query} />
      </div>

      <div className="mt-4 px-2">
        {query ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2">
                Showing results for <span className="text-primary italic">"{query}"</span>
              </h2>
              <div className="flex items-center gap-2 text-xs lg:text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                Sorted by Relevance
              </div>
            </div>
            <Suspense
              fallback={
                <div className="grid gap-4 lg:gap-6 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-xl lg:rounded-2xl bg-muted" />
                  ))}
                </div>
              }
            >
              <VibeSearchResults query={query} />
            </Suspense>
          </div>
        ) : (
          <div className="py-16 lg:py-32 text-center bg-muted/20 rounded-2xl lg:rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center px-4">
             <div className="h-16 w-16 lg:h-20 lg:w-20 rounded-2xl lg:rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 lg:h-10 lg:w-10 text-primary/40" />
             </div>
             <h3 className="text-xl lg:text-2xl font-black tracking-tight mb-2">Start your search</h3>
             <p className="text-sm lg:text-base text-muted-foreground max-w-sm mx-auto">
                Our AI understands artistic concepts. Describe a mood or style to find perfect matches across the entire network.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
