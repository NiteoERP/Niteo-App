const fs = require('fs');
let file = 'src/components/Navigation.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { LayoutDashboard", "import { LayoutDashboard, TrendingUp");

let desktopTarget =         {hasPerm('reportes') && (
          <Link href="/dashboard/informes" className={getLinkClass('/dashboard/informes')}>
            <FileText size={20} />
            <span className="text-sm font-medium">Informes</span>
          </Link>
        )};
let desktopReplacement = desktopTarget + 
        {hasPerm('reportes') && (
          <Link href="/dashboard/finanzas" className={getLinkClass('/dashboard/finanzas')}>
            <TrendingUp size={20} />
            <span className="text-sm font-medium">Finanzas</span>
          </Link>
        )};
content = content.replace(desktopTarget, desktopReplacement);

let mobileTarget =               {hasPerm('reportes') && (
                <Link href="/dashboard/informes" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/informes')}>
                  <FileText size={20} /> Informes
                </Link>
              )};
let mobileReplacement = mobileTarget + 
              {hasPerm('reportes') && (
                <Link href="/dashboard/finanzas" onClick={() => setMenuOpen(false)} className={getMenuItemClass('/dashboard/finanzas')}>
                  <TrendingUp size={20} /> Finanzas
                </Link>
              )};
content = content.replace(mobileTarget, mobileReplacement);

fs.writeFileSync(file, content);
