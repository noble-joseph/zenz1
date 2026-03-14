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
  Sparkles,
  BadgeCheck,
  Mail,
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
  { href: "/dashboard", label: "Feed", icon: ImageIcon },
  { href: "/dashboard/explore", label: "Explore", icon: FolderGit2 },
  { href: "/dashboard/messages", label: "Messages", icon: Mail },
  { href: "/dashboard/profile", label: "Portfolio", icon: Users },
  { href: "/dashboard/credits", label: "Network", icon: BadgeCheck },
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
      <div className="flex min-h-screen items-center justify-center bg-background">
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
    <div className="flex min-h-screen bg-background">
      {/* Instagram-style Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-[72px] flex-col border-r bg-background py-6 lg:w-64 transition-all duration-300">
        {/* Brand */}
        <div className="mb-10 flex h-10 items-center px-4 lg:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="hidden text-xl font-black tracking-tighter lg:block">
              TALENT OS
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-4 rounded-xl px-3 py-3 text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-primary/5 font-bold text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-primary" : ""}`}>
                  <item.icon className={isActive ? "h-6 w-6" : "h-5 w-5"} />
                </div>
                <span className="hidden lg:block">{item.label}</span>
                {isActive && (
                  <div className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-primary lg:block" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="flex h-auto w-full items-center justify-center gap-3 rounded-xl px-2 py-3 text-left lg:justify-start lg:px-3"
                />
              }
            >
              <Avatar className="h-8 w-8 ring-2 ring-transparent transition-all group-hover:ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-1 overflow-hidden lg:block">
                <div className="truncate text-sm font-bold tracking-tight">
                  {displayName}
                </div>
                <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground/60">
                  {profile?.role || "Creator"}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="right">
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
      <main className="flex-1 overflow-auto pl-[72px] lg:pl-64 transition-all duration-300">
        <div className="container mx-auto p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
