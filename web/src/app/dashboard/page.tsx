import Link from "next/link";

export const metadata = {
  title: "Dashboard • Talent OS",
};

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Creator Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600">
            MVP shell. Next: auth gating, project creation, and asset ingestion.
          </p>
        </div>
        <Link
          className="rounded-md border px-3 py-2 text-sm hover:bg-zinc-50"
          href="/dashboard/ingest"
        >
          Ingest asset
        </Link>
      </div>
    </main>
  );
}

