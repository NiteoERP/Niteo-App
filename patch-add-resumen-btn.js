const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/page.tsx', 'utf-8');

// Ensure FileOutput or BarChart icon is imported
if (!code.includes('BarChart2')) {
  code = code.replace(
    /import \{ Plus, Search, Calendar, MapPin, DollarSign, Wallet \} from 'lucide-react';/,
    "import { Plus, Search, Calendar, MapPin, DollarSign, Wallet, BarChart2 } from 'lucide-react';"
  );
}

const buttonsStart = `<div className="flex items-center gap-3 w-full md:w-auto">`;
const buttonsReplacement = `<div className="flex items-center gap-3 w-full md:w-auto">
          <Link 
            href="/dashboard/caja/resumen" 
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <BarChart2 size={18} />
            <span>Resumen</span>
          </Link>`;

code = code.replace(buttonsStart, buttonsReplacement);

fs.writeFileSync('src/app/dashboard/caja/page.tsx', code);
