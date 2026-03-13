"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface CreditRow {
  id: string;
  project_id: string;
  creator_id: string;
  requested_by: string;
  role_title: string;
  status: string;
  created_at: string;
  project_title?: string;
  requester_name?: string;
}

export default function CreditsPage() {
  const [incoming, setIncoming] = useState<CreditRow[]>([]);
  const [outgoing, setOutgoing] = useState<CreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Incoming: credits where I am the tagged creator
      const { data: inData } = await supabase
        .from("collaborations")
        .select("id, project_id, creator_id, requested_by, role_title, status, created_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      // Outgoing: credits I requested
      const { data: outData } = await supabase
        .from("collaborations")
        .select("id, project_id, creator_id, requested_by, role_title, status, created_at")
        .eq("requested_by", user.id)
        .neq("creator_id", user.id)
        .order("created_at", { ascending: false });

      // Collect all project and profile IDs to resolve names
      const allCollabs = [...(inData ?? []), ...(outData ?? [])];
      const projectIds = [...new Set(allCollabs.map((c) => c.project_id))];
      const profileIds = [
        ...new Set([
          ...allCollabs.map((c) => c.requested_by),
          ...allCollabs.map((c) => c.creator_id),
        ]),
      ];

      const [{ data: projects }, { data: profiles }] = await Promise.all([
        projectIds.length > 0
          ? supabase.from("projects").select("id, title").in("id", projectIds)
          : Promise.resolve({ data: [] }),
        profileIds.length > 0
          ? supabase.from("profiles").select("id, display_name").in("id", profileIds)
          : Promise.resolve({ data: [] }),
      ]);

      const projectMap = new Map(
        (projects ?? []).map((p) => [p.id, p.title]),
      );
      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p.display_name ?? "Unknown"]),
      );

      const enrich = (rows: typeof allCollabs): CreditRow[] =>
        rows.map((c) => ({
          ...c,
          project_title: projectMap.get(c.project_id) ?? "Unknown project",
          requester_name: profileMap.get(c.requested_by) ?? "Unknown",
        }));

      setIncoming(enrich(inData ?? []));
      setOutgoing(enrich(outData ?? []));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load credits.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(
    collabId: string,
    newStatus: "verified" | "rejected",
  ) {
    setActionBusy(collabId);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Missing Supabase env vars.");

      const { error } = await supabase
        .from("collaborations")
        .update({ status: newStatus })
        .eq("id", collabId);
      if (error) throw error;

      toast.success(`Credit ${newStatus}.`);
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update credit.",
      );
    } finally {
      setActionBusy(null);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function renderCreditCard(credit: CreditRow, direction: "in" | "out") {
    const isPending = credit.status === "pending";

    return (
      <div
        key={credit.id}
        className="flex items-center justify-between gap-4 rounded-lg border p-4"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{credit.project_title}</p>
            <Badge
              variant={
                credit.status === "verified"
                  ? "default"
                  : credit.status === "rejected"
                    ? "destructive"
                    : "secondary"
              }
              className="text-xs"
            >
              {credit.status === "verified" && (
                <CheckCircle className="mr-1 h-3 w-3" />
              )}
              {credit.status === "rejected" && (
                <XCircle className="mr-1 h-3 w-3" />
              )}
              {credit.status === "pending" && (
                <Clock className="mr-1 h-3 w-3" />
              )}
              {credit.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {direction === "in"
              ? `Tagged by ${credit.requester_name}`
              : `You tagged someone`}{" "}
            as <span className="font-medium">{credit.role_title}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(credit.created_at)}
          </p>
        </div>

        {direction === "in" && isPending && (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              onClick={() => void updateStatus(credit.id, "verified")}
              disabled={actionBusy === credit.id}
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void updateStatus(credit.id, "rejected")}
              disabled={actionBusy === credit.id}
            >
              <XCircle className="mr-1 h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Credits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verified Credit System — manage your collaboration credits. Only
          verified credits impact your influence score.
        </p>
      </div>

      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">
            Incoming
            {incoming.filter((c) => c.status === "pending").length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {incoming.filter((c) => c.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : incoming.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No incoming credits yet. When someone tags you as a collaborator,
                  it will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {incoming.map((c) => renderCreditCard(c, "in"))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : outgoing.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No outgoing credits yet. Tag collaborators from a project&apos;s
                  detail page.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {outgoing.map((c) => renderCreditCard(c, "out"))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
