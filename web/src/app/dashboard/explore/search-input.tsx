"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchInput({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams(searchParams?.toString());
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    
    startTransition(() => {
      router.push(`/dashboard/explore?${params.toString()}`);
    });
  };

  return (
    <div className="relative group">
      <form onSubmit={handleSearch} className="relative flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe a vibe, style, or concept (e.g., 'moody cinematic sunset')"
            className="h-16 pl-14 pr-32 text-lg rounded-2xl border-2 border-muted bg-background/50 backdrop-blur-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
            disabled={isPending}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Button 
              type="submit" 
              size="sm" 
              className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20"
              disabled={isPending || !query}
            >
              {isPending ? "..." : "Find"}
            </Button>
          </div>
        </div>
        <Button variant="outline" size="icon" className="h-16 w-16 rounded-2xl border-2">
          <SlidersHorizontal className="h-6 w-6" />
        </Button>
      </form>
      
      {/* Search Suggestions */}
      <div className="flex flex-wrap gap-2 mt-4">
        {["Cinematic", "Neon", "Minimalist", "High Octane", "Experimental"].map((tag) => (
          <button
            key={tag}
            onClick={() => {
              setQuery(tag);
              const params = new URLSearchParams(searchParams?.toString());
              params.set("q", tag);
              router.push(`/dashboard/explore?${params.toString()}`);
            }}
            className="px-4 py-1.5 rounded-full bg-muted/50 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"
          >
            # {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
