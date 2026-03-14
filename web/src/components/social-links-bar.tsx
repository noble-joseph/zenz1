import { 
  Instagram, 
  Youtube, 
  Twitter, 
  Linkedin, 
  Music, 
  ExternalLink,
  Github,
  Film,
  Camera
} from "lucide-react";
import Link from "next/link";
import { type SocialLinks } from "@/lib/types/database";
import { Button } from "@/components/ui/button";

const PLATFORMS = [
  { key: "instagram", icon: Instagram, color: "hover:text-[#E4405F]" },
  { key: "youtube", icon: Youtube, color: "hover:text-[#FF0000]" },
  { key: "twitter", icon: Twitter, color: "hover:text-[#1DA1F2]" },
  { key: "linkedin", icon: Linkedin, color: "hover:text-[#0077B5]" },
  { key: "spotify", icon: Music, color: "hover:text-[#1DB954]" },
  { key: "soundcloud", icon: Music, color: "hover:text-[#FF3300]" },
  { key: "imdb", icon: Film, color: "hover:text-[#F5C518]" },
  { key: "behance", icon: ExternalLink, color: "hover:text-[#1769FF]" },
  { key: "vimeo", icon: Film, color: "hover:text-[#1AB7EA]" },
];

export function SocialLinksBar({ links }: { links: SocialLinks }) {
  const activeLinks = PLATFORMS.filter(p => !!links[p.key]);

  if (activeLinks.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeLinks.map((platform) => {
        const Icon = platform.icon;
        const handle = links[platform.key];
        
        // Basic URL logic - could be more robust
        let url = handle;
        if (handle && !handle.startsWith("http")) {
          if (platform.key === "instagram") url = `https://instagram.com/${handle}`;
          if (platform.key === "youtube") url = `https://youtube.com/@${handle}`;
          if (platform.key === "twitter") url = `https://twitter.com/${handle}`;
          else url = handle; // Fallback
        }

        return (
          <Button
            key={platform.key}
            variant="ghost"
            size="icon"
            render={<Link href={url || "#"} target="_blank" rel="noopener noreferrer" />}
            className={`h-10 w-10 transition-colors ${platform.color}`}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{platform.key}</span>
          </Button>
        );
      })}
    </div>
  );
}
