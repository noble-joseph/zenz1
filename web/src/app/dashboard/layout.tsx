"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.replace("/login");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session)
        router.replace(`/login?next=${encodeURIComponent(pathname ?? "/dashboard")}`);
      else setReady(true);
    });
  }, [router, pathname]);

  if (!ready) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm font-semibold">
            Talent OS
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link className="hover:underline" href="/dashboard">
              Overview
            </Link>
            <Link className="hover:underline" href="/dashboard/projects">
              Projects
            </Link>
            <Link className="hover:underline" href="/dashboard/ingest">
              Ingest
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

