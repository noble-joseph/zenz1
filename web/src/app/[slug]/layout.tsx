import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function PublicProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-5xl items-center px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Talent OS
          </Link>
          <div className="flex-1" />
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="/search"
              className="flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline-block">Vibe Search</span>
            </Link>
            <Link href="/login" className="transition-colors hover:text-primary">
              Creator Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
