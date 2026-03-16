import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .reduce((acc: any, line) => {
    const [key, ...value] = line.split('=');
    acc[key.trim()] = value.join('=').trim();
    return acc;
  }, {});

const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("🔍 Checking Media Guard Sync Status...");

  const { count: mediaCount, error: mediaError } = await supabase
    .from('media_assets')
    .select('*', { count: 'exact', head: true });

  const { count: profileCount, error: profileError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (mediaError || profileError) {
    console.error("❌ Database Connection Error:", mediaError?.message || profileError?.message);
    return;
  }

  console.log("\n📊 Global Registry Stats:");
  console.log(`- Profiles Found: ${profileCount}`);
  console.log(`- Media Assets Guarded: ${mediaCount}`);

  if (mediaCount && mediaCount > 0) {
    const { data: recent } = await supabase
      .from('media_assets')
      .select('media_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log("\n🕙 Recent Activity:");
    console.table(recent);
  } else {
    console.log("\n⚠️ No assets found. Did you run the seed script?");
    console.log("👉 Run: node scripts/seed.mjs");
  }
}

check().catch(console.error);
