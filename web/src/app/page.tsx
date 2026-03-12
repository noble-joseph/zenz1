import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Talent OS</h1>
      <p className="mt-4 max-w-2xl text-zinc-600">
        Unified creator portfolios with content-addressable assets (SHA-256), Git-style commit
        history, and verified credits.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link className="rounded-md bg-black px-4 py-2 text-sm text-white" href="/dashboard">
          Creator dashboard
        </Link>
        <Link className="rounded-md border px-4 py-2 text-sm" href="/demo">
          Public portfolio demo
        </Link>
      </div>
    </main>
  );
}
