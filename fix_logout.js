const fs = require('fs');

let content = fs.readFileSync('src/components/LogoutButton.tsx', 'utf-8');

content = content.replace(
    "await supabase.auth.signOut({ scope: 'local' });",
    "await supabase.auth.signOut({ scope: 'local' });\n    if (typeof window !== 'undefined') {\n      localStorage.clear();\n    }"
);

fs.writeFileSync('src/components/LogoutButton.tsx', content, 'utf-8');
console.log("Updated LogoutButton.tsx");
