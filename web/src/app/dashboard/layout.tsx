"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  Upload,
  Image as ImageIcon,
  Users,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import type { Profile } from "@/lib/types/database";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderGit2 },
  { href: "/dashboard/assets", label: "Assets", icon: ImageIcon },
  { href: "/dashboard/ingest", label: "Ingest", icon: Upload },
  { href: "/dashboard/credits", label: "Credits", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.replace("/login");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace(
          `/login?next=${encodeURIComponent(pathname ?? "/dashboard")}`,
        );
      } else {
        setEmail(data.session.user.email ?? null);
        // Fetch profile to verify onboarding status
        supabase
          .from("profiles")
          .select("display_name, public_slug, avatar_url, role")
          .eq("id", data.session.user.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof?.display_name) {
              setProfile(prof);
              setReady(true);
            } else {
              // Missing essential profile data, force onboarding
              router.replace("/onboarding");
            }
          });
      }
    });
  }, [router, pathname]);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const displayName =
    profile?.display_name || email?.split("@")[0] || "Creator";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-sidebar">
        {/* Brand */}
        <div className="flex h-14 items-center px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-bold tracking-tight"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              T
            </span>
            Talent OS
          </Link>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
                {isActive && (
                  <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* User menu */}
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button
                variant="ghost"
                className="flex h-auto w-full items-center justify-start gap-3 px-3 py-2 text-left"
              />
            }>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-medium">
                  {displayName}
                </div>
                {email && (
                  <div className="truncate text-xs text-muted-foreground">
                    {email}
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => void handleSignOut()}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
