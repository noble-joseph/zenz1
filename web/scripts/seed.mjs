import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Load .env.local manually since we might not have dotenv
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...value] = line.split('=');
    acc[key.trim()] = value.join('=').trim();
    return acc;
  }, {});

const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_AI_KEY = envConfig.GOOGLE_GENERATIVE_AI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_AI_KEY) {
  console.error("Missing environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

async function generateEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

const USERS = [
  {
    email: 'elara.voss@talent.os',
    password: 'password123',
    display_name: 'Elara Voss',
    public_slug: 'elara-voss',
    profession: 'Cinematographer',
    bio: 'Award-winning cinematographer specialized in neon-noir aesthetics and urban storytelling. Exploring the intersection of artificial light and human emotion.',
    specializations: ['Neon-Noir', 'Urban Storytelling', 'Anamorphic Photography'],
    assets: [
      {
        name: 'Midnight in Shibuya',
        url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989',
        type: 'image',
        description: 'Rain-slicked streets of Shibuya bathed in magenta and cyan neon lights.'
      },
      {
        name: 'The Concrete Silence',
        url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
        type: 'image',
        description: 'Brutalist architecture in Paris, captured during the blue hour for a stark, moody vibe.'
      }
    ]
  },
  {
    email: 'kael.synth@talent.os',
    password: 'password123',
    display_name: 'Kael Synth',
    public_slug: 'kael-synth',
    profession: 'Musician',
    bio: 'Sound architect crafting immersive cyberpunk soundscapes and dark synthwave. Bridging the gap between 80s nostalgia and futuristic textures.',
    specializations: ['Cyberpunk', 'Dark Synthwave', 'Sound Design'],
    assets: [
      {
        name: 'Neural Interface',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        type: 'audio',
        description: 'A pulsing, high-energy synthwave track with glitchy textures and heavy analog bass.'
      },
      {
        name: 'Neon Rain Drifter',
        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        type: 'audio',
        description: 'Atmospheric and melancholic lo-fi synth track perfect for rainy urban night drives.'
      }
    ]
  },
  {
    email: 'maya.nature@talent.os',
    password: 'password123',
    display_name: 'Maya Chen',
    public_slug: 'maya-chen',
    profession: 'Cinematographer',
    bio: 'Visual storyteller dedicated to capturing the ethereal beauty of the natural world. Minimalist approach with a focus on natural light and raw textures.',
    specializations: ['Natural Light', 'Minimalism', 'Nature Documentary'],
    assets: [
      {
        name: 'Ethereal Dawn',
        url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e',
        type: 'image',
        description: 'Morning mist rolling over a silent mountain range in the Swiss Alps.'
      },
      {
        name: 'Liquid Gold',
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
        type: 'image',
        description: 'Sunlight reflecting off calm ocean waves during the peak of golden hour.'
      }
    ]
  }
];

async function seed() {
  console.log("🚀 Starting seed process...");

  for (const userData of USERS) {
    console.log(`\n👤 Seeding user: ${userData.display_name}...`);

    let userId;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true
    });

    if (authError) {
      if (authError.code === 'email_exists' || authError.message.toLowerCase().includes("already registered")) {
        console.log("  - User already exists, fetching ID...");
        const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error("  ❌ Error listing users:", listError.message);
          continue;
        }
        const existingUser = usersData.users.find(u => u.email === userData.email);
        userId = existingUser?.id;
      } else {
        console.error("  ❌ Error creating auth user:", authError.message);
        continue;
      }
    } else {
      userId = authData.user.id;
    }

    if (!userId) continue;

    // 2. Update Profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: userData.display_name,
        public_slug: userData.public_slug,
        profession: userData.profession,
        bio: userData.bio,
        specializations: userData.specializations,
        influence_score: Math.floor(Math.random() * 500) + 100,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error("  ❌ Error updating profile:", profileError.message);
      continue;
    }

    // 3. Create Projects and Assets
    for (const assetData of userData.assets) {
      console.log(`  📦 Seeding asset: ${assetData.name}...`);

      const hashId = Buffer.from(`${userData.public_slug}-${assetData.name}`).toString('hex').slice(0, 32);
      
      // Generate embedding
      let embedding = null;
      try {
        const rawEmbedding = await generateEmbedding(`${assetData.name}: ${assetData.description} for ${userData.profession} ${userData.display_name}`);
        
        // Ensure exactly 1536 dimensions
        if (rawEmbedding.length === 1536) {
          embedding = rawEmbedding;
        } else if (rawEmbedding.length > 1536) {
          console.log(`    ✂️ Slicing embedding from ${rawEmbedding.length} to 1536`);
          embedding = rawEmbedding.slice(0, 1536);
        } else {
          console.log(`    🧱 Padding embedding from ${rawEmbedding.length} to 1536`);
          embedding = [...rawEmbedding, ...new Array(1536 - rawEmbedding.length).fill(0)];
        }
      } catch (err) {
        console.warn("  ⚠️ Embedding generation failed, using random vector:", err.message);
        embedding = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
      }

      // Upsert Asset
      const { error: assetError } = await supabase
        .from('assets')
        .upsert({
          hash_id: hashId,
          storage_url: assetData.url,
          media_type: assetData.type,
          metadata: { originalName: assetData.name, description: assetData.description },
          created_by: userId,
          embedding: embedding
        });

      if (assetError) {
        console.error("    ❌ Error upserting asset:", assetError.message);
        continue;
      }

      // Create a project for this asset
      const projectSlug = assetData.name.toLowerCase().replace(/\s+/g, '-');
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .upsert({
          owner_id: userId,
          title: assetData.name,
          slug: projectSlug,
          description: assetData.description,
          is_public: true
        })
        .select()
        .single();

      if (projectError) {
        console.error("    ❌ Error creating project:", projectError.message);
        continue;
      }

      // Create a commit
      await supabase.from('commits').upsert({
        project_id: project.id,
        asset_id: hashId,
        change_message: `Initial seed for ${assetData.name}`,
        created_by: userId
      });
    }
  }

  console.log("\n✅ Seeding complete!");
}

seed().catch(console.error);
