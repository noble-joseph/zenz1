import { format } from "date-fns";
import { Briefcase } from "lucide-react";
import { type ExperienceEntry } from "@/lib/types/database";

export function ExperienceTimeline({ experience }: { experience: ExperienceEntry[] }) {
  if (!experience || experience.length === 0) return null;

  // Sort by start date descending
  const sorted = [...experience].sort((a, b) => 
    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  return (
    <div className="relative space-y-8 pl-8">
      {/* Vertical Line */}
      <div className="absolute left-[15px] top-2 h-[calc(100%-8px)] w-0.5 bg-border" />

      {sorted.map((entry, i) => (
        <div key={i} className="relative">
          {/* Dot */}
          <div className="absolute -left-[25px] top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-primary bg-background shadow-sm z-10">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold leading-none tracking-tight">
                {entry.title}
              </h3>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                {format(new Date(entry.start_date), "MMM yyyy")} — {
                  entry.current ? "Present" : entry.end_date ? format(new Date(entry.end_date), "MMM yyyy") : "N/A"
                }
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <Briefcase className="h-3.5 w-3.5" />
              {entry.company}
            </div>
            {entry.description && (
              <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">
                {entry.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
