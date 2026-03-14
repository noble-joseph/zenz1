import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function PublicProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-emerald-100 selection:text-emerald-900">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 group"
          >
            <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight text-lg">Talent OS</span>
          </Link>
          
          <nav className="flex items-center gap-1">
            <Link 
              href="/search" 
              className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/50 rounded-full"
            >
              Vibe Search
            </Link>
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors hover:bg-emerald-50 rounded-full dark:hover:bg-emerald-950/30"
            >
              Join the Network
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-12 bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Powered by <span className="text-emerald-600 font-bold">Talent OS</span> — The Professional Identity Protocol for Creators.
          </p>
        </div>
      </footer>
    </div>
  );
}
