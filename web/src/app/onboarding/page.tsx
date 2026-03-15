"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Music, Video, User, Briefcase, Trophy, Sparkles, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const PROFESSIONS = [
  { id: "cinematographer", label: "Cinematographer", icon: Video },
  { id: "musician", label: "Musician", icon: Music },
  { id: "photographer", label: "Photographer", icon: Camera },
  { id: "director", label: "Director", icon: User },
  { id: "designer", label: "Designer", icon: Briefcase },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: "",
    profession: "",
    bio: "",
    publicSlug: "",
    specializations: "", // We'll split this by comma
    achievements: "", // Split by newline
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let avatarUrl = "";
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        avatarUrl = publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: formData.displayName,
          profession: formData.profession,
          bio: formData.bio,
          public_slug: formData.publicSlug || formData.displayName.toLowerCase().replace(/\s+/g, '-'),
          avatar_url: avatarUrl,
          specializations: formData.specializations.split(",").map(s => s.trim()),
          achievements: formData.achievements.split("\n").map(a => a.trim()).filter(a => a !== ""),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      router.push("/dashboard");
    } catch (err: any) {
      alert(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-6 lg:py-12 px-4 selection:bg-emerald-100 pb-24 lg:pb-12">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl lg:rounded-3xl p-5 lg:p-8 shadow-xl">
          <div className="mb-8 lg:mb-10 text-center">
             <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] lg:text-xs font-bold text-emerald-800 mb-4">
                <Sparkles className="h-3 w-3" />
                Step 2: Define Your Creator Persona
             </div>
             <h1 className="text-2xl lg:text-3xl font-black tracking-tight mb-2 uppercase">Your Professional ID</h1>
             <p className="text-sm text-zinc-500 dark:text-zinc-400">This is how you will be discovered by hirers and fellow creators.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
               <div className="relative group">
                  <div className="h-28 w-28 lg:h-32 lg:w-32 rounded-full border-4 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 overflow-hidden shadow-inner">
                     {avatarPreview ? (
                        <img src={avatarPreview} className="h-full w-full object-cover" alt="Preview" />
                     ) : (
                        <div className="h-full w-full flex items-center justify-center text-zinc-400">
                           <User className="h-10 w-10 lg:h-12 lg:w-12" />
                        </div>
                     )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 bg-emerald-600 rounded-full text-white cursor-pointer shadow-lg hover:scale-110 transition-transform">
                     <Upload className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                     <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                  </label>
               </div>
               <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Profile Photo</p>
            </div>

            <div className="grid gap-4 lg:gap-6 md:grid-cols-2">
               <div className="space-y-2">
                  <label className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-zinc-500">Full Name</label>
                  <Input 
                    required
                    placeholder="e.g. Alex Rivera" 
                    className="rounded-xl h-12"
                    value={formData.displayName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, displayName: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-zinc-500">Public ID (Slug)</label>
                  <Input 
                    placeholder="alex-rivera" 
                    className="rounded-xl h-12"
                    value={formData.publicSlug}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, publicSlug: e.target.value})}
                  />
               </div>
            </div>

            <div className="space-y-3 lg:space-y-4">
               <label className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-zinc-500">I am a professional...</label>
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3">
                  {PROFESSIONS.map((prof) => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => setFormData({...formData, profession: prof.label})}
                      className={`flex flex-col items-center justify-center p-3 lg:p-4 rounded-xl lg:rounded-2xl border-2 transition-all ${
                        formData.profession === prof.label 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-md' 
                        : 'border-zinc-100 dark:border-zinc-800 hover:border-emerald-200'
                      }`}
                    >
                       <prof.icon className="h-5 w-5 lg:h-6 lg:w-6 mb-2" />
                       <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-tight">{prof.label}</span>
                    </button>
                  ))}
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-zinc-500">Professional Bio</label>
               <Textarea 
                 required
                 placeholder="Write a brief story about your journey..." 
                 className="rounded-xl lg:rounded-2xl min-h-[100px] lg:min-h-[120px] resize-none"
                 value={formData.bio}
                 onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, bio: e.target.value})}
               />
            </div>

            <div className="space-y-2">
               <label className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-zinc-500">Specializations</label>
               <Input 
                 placeholder="Color Grading, Sound Design" 
                 className="rounded-xl h-12"
                 value={formData.specializations}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, specializations: e.target.value})}
               />
            </div>

            <div className="space-y-2">
               <label className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-zinc-500">Achievements (One per line)</label>
               <Textarea 
                 placeholder="Best Short Film 2024&#10;Featured in Music Weekly" 
                 className="rounded-xl lg:rounded-2xl min-h-[100px] lg:min-h-[120px] resize-none"
                 value={formData.achievements}
                 onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, achievements: e.target.value})}
               />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-xl lg:rounded-2xl h-12 lg:h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base lg:text-lg uppercase tracking-widest"
            >
               {loading ? "Constructing Identity..." : "Complete Registration"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
