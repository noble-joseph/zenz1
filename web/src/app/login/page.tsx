"use client";

import { useEffect, Suspense } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function LoginContent() {
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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        // Check if user has an active, fully-formed profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", session.user.id)
          .maybeSingle();

        if (prof?.display_name) {
          router.replace(next);
        } else {
          router.replace("/onboarding");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [router, searchParams, supabase]);

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Join Talent OS</h1>
      <p className="mt-3 text-sm text-zinc-600">
        Create your creator portfolio or sign in to manage your assets.
      </p>
      <div className="mt-8 rounded-lg border p-4 shadow-sm bg-card">
        {supabase ? (
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'oklch(0.205 0 0)',
                    brandAccent: 'oklch(0.145 0 0)',
                  }
                }
              }
            }}
            providers={["google"]}
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=/dashboard`}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email address',
                  password_label: 'Password',
                },
                sign_up: {
                  email_label: 'Email address',
                  password_label: 'Create a password',
                }
              }
            }}
          />
        ) : (
          <div className="text-sm text-zinc-600">
            Missing Supabase configuration.
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-md px-6 py-16 flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        <p className="mt-4 text-sm text-muted-foreground font-medium animate-pulse">Initializing Talent OS...</p>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}

