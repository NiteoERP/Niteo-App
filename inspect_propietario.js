const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
const env = {};
for (const line of envLines) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[k] = v;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const { data: perfiles } = await supabase.from('perfiles').select('*');
  const perfilMap = new Map();
  for (const p of perfiles || []) {
    perfilMap.set(p.id, p);
  }

  console.log("=== ALL AUTH USERS ===");
  for (const u of users) {
    const p = perfilMap.get(u.id);
    console.log(`Email: ${u.email}`);
    console.log(`  Auth app_metadata:`, JSON.stringify(u.app_metadata));
    console.log(`  Auth user_metadata:`, JSON.stringify(u.user_metadata));
    if (p) {
      console.log(`  Perfil: id=${p.id}, rol="${p.rol}", empresa_id=${p.empresa_id}, sede_id=${p.sede_id}`);
      console.log(`  Permisos:`, JSON.stringify(p.permisos));
    } else {
      console.log(`  Perfil: NONE`);
    }
    console.log('---');
  }
}

run();
