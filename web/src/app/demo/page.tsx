import Link from "next/link";

export const metadata = {
  title: "Demo Portfolio • Talent OS",
  description: "Public, SEO-friendly portfolio page example.",
};

export default function DemoPortfolioPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Public Portfolio (Demo)</h1>
          <p className="mt-3 max-w-2xl text-zinc-600">
            This page is intentionally server-rendered for SEO and requires no login.
          </p>
        </div>
        <Link className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50" href="/">
          Home
        </Link>
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">Project</div>
          <div className="mt-1 text-lg font-semibold">Neon Alley (Cinematography)</div>
          <div className="mt-2 text-sm text-zinc-600">
            Commit timeline and hover-to-play previews will live here.
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium">Credits</div>
          <div className="mt-2 text-sm text-zinc-600">
            Only verified credits appear publicly (pending tags are hidden).
          </div>
        </div>
      </section>
    </main>
  );
}

