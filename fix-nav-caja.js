const fs = require('fs');
let code = fs.readFileSync('src/components/Navigation.tsx', 'utf-8');

// Change /dashboard/caja/nuevo to /dashboard/caja in SidebarNav
code = code.replace(
  /<Link href="\/dashboard\/caja\/nuevo" className=\{getLinkClass\('\/dashboard\/caja\/nuevo'\)\}>/g,
  '<Link href="/dashboard/caja" className={getLinkClass(\'/dashboard/caja\')}>'
);

// Change /dashboard/caja/nuevo to /dashboard/caja in MobileNav
code = code.replace(
  /<Link href="\/dashboard\/caja\/nuevo" onClick=\{/g,
  '<Link href="/dashboard/caja" onClick={'
);

fs.writeFileSync('src/components/Navigation.tsx', code);
