const fs = require('fs');

let code = fs.readFileSync('src/actions/cierres-actions.ts', 'utf-8');

// Remove the admin client import
code = code.replace(/import \{ createClient as createAdminClient \} from '@supabase\/supabase-js';\n/g, '');

// Remove the admin client initialization
code = code.replace(/const supabaseAdmin = createAdminClient\(process\.env\.NEXT_PUBLIC_SUPABASE_URL!, process\.env\.SUPABASE_SERVICE_ROLE_KEY!\);\n/g, '');

// Revert supabaseAdmin back to supabase
code = code.replace(/supabaseAdmin/g, 'supabase');

fs.writeFileSync('src/actions/cierres-actions.ts', code);
