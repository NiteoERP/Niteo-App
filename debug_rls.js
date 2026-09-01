require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  // Login to get session
  const { data: authData, error: authErr } = await supabaseAuth.auth.signInWithPassword({ email: 'master@niteo.com', password: 'password123' });
  if (authErr) {
    console.log('Login failed:', authErr);
    // Let's create an RPC to debug the policy
  } else {
    console.log('Logged in as:', authData.user.id);
  }
}
run();
