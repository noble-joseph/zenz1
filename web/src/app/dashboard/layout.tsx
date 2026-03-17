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
  LineChart,
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
  { href: "/dashboard/analytics", label: "Analytics", icon: LineChart },
  { href: "/dashboard/messages", label: "Messages", icon: Mail },
  { href: "/dashboard/profile", label: "Portfolio", icon: Users },
  { href: "/dashboard/network", label: "Network", icon: BadgeCheck },
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace(
          `/login?next=${encodeURIComponent(pathname ?? "/dashboard")}`,
        );
      } else {
        setEmail(user.email ?? null);
        supabase
          .from("profiles")
          .select("display_name, public_slug, avatar_url, role")
          .eq("id", user.id)
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
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full flex-col border-r bg-background py-6 lg:flex lg:w-64 transition-all duration-300">
        {/* Brand */}
        <div className="mb-10 flex h-10 items-center px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-black tracking-tighter">
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
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
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
                  className="flex h-auto w-full items-center justify-start gap-3 rounded-xl px-3 py-3 text-left"
                />
              }
            >
              <Avatar className="h-8 w-8 ring-2 ring-transparent transition-all group-hover:ring-primary/20">
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
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

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t bg-background/80 px-4 backdrop-blur-xl lg:hidden">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 transition-all ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className={isActive ? "h-6 w-6" : "h-5 w-5"} />
              <span className="text-[10px] font-bold uppercase tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 lg:pb-0 lg:pl-64 transition-all duration-300">
        <div className="container mx-auto p-4 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
