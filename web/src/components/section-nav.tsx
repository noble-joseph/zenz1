"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  label: string;
}

export function SectionNav({ sections }: { sections: Section[] }) {
  const [activeTab, setActiveTab] = useState(sections[0]?.id || "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id);
          }
        });
      },
      { threshold: 0.5, rootMargin: "-10% 0% -40% 0%" }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="sticky top-14 z-30 flex w-full border-b bg-background/80 px-4 backdrop-blur-md overflow-x-auto no-scrollbar">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-8">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => {
              document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
            }}
            className={cn(
              "relative flex h-full items-center text-sm font-medium transition-colors hover:text-primary",
              activeTab === section.id ? "text-primary" : "text-muted-foreground"
            )}
          >
            {section.label}
            {activeTab === section.id && (
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
