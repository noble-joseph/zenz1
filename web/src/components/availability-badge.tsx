import { Badge } from "@/components/ui/badge";
import { type AvailabilityStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<AvailabilityStatus, { label: string; className: string }> = {
  available: {
    label: "Available for projects",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  busy: {
    label: "Currently busy",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  not_available: {
    label: "Not available",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant="outline" className={cn("gap-1.5 px-3 py-1 font-semibold", config.className)}>
      <span className="relative flex h-2 w-2">
        <span className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          status === "available" ? "bg-emerald-400" : status === "busy" ? "bg-amber-400" : "bg-rose-400"
        )} />
        <span className={cn(
          "relative inline-flex rounded-full h-2 w-2",
          status === "available" ? "bg-emerald-500" : status === "busy" ? "bg-amber-500" : "bg-rose-500"
        )} />
      </span>
      {config.label}
    </Badge>
  );
}
