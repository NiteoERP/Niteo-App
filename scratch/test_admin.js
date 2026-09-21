const { createAdminClient } = require('./src/utils/supabase/admin.ts');
// wait, admin.ts is typescript. Let's see if we can check it in ts-node or just check the env vars
require('dotenv').config({ path: '.env.local' });
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
