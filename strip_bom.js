const fs = require('fs');
let content = fs.readFileSync('supabase/migrations/20261005232914_bypass_sede_check_for_pos.sql', 'utf8');
content = content.replace(/^\uFEFF/, '');
fs.writeFileSync('supabase/migrations/20261005232914_bypass_sede_check_for_pos.sql', content);
