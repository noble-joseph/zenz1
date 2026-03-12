"use client";

import { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) return;

    // Handle magic-link callback (?code=...) explicitly.
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ data, error }) => {
          if (!error && data.session) {
            router.replace(next);
          }
        })
        .catch(() => {
          // ignore; Auth component will still render login form
        });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace(next);
    });
    return () => subscription.unsubscribe();
  }, [router, searchParams, supabase]);

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-3 text-sm text-zinc-600">
        Use a magic link. Public portfolios remain accessible without login.
      </p>
      <div className="mt-8 rounded-lg border p-4">
        {supabase ? (
          <Auth
            supabaseClient={supabase}
            view="magic_link"
            appearance={{ theme: ThemeSupa }}
            providers={[]}
          />
        ) : (
          <div className="text-sm text-zinc-600">
            Missing Supabase env vars. Copy <code>.env.example</code> to <code>.env.local</code> and
            set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </div>
        )}
      </div>
    </main>
  );
}

