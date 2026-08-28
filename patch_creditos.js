const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/creditos/page.tsx', 'utf8');

code = code.replace(
  'import { Calendar as CalendarIcon, Store, Wallet, Search, Check, FileText, ShoppingCart, User, Users, PlusCircle, X, Download } from "lucide-react";',
  'import { Calendar as CalendarIcon, Store, Wallet, Search, Check, FileText, ShoppingCart, User, Users, PlusCircle, X, Download, Hash } from "lucide-react";'
);

const oldTitle = '<h3 className="font-bold text-white">Factura {fac.numero_documento}</h3>';
const newTitle = '<h3 className="font-bold text-white">Factura {fac.numero_documento}</h3>\n                            {fac.numero_orden && (<span className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded border border-indigo-500/30"><Hash size={12} /> {fac.numero_orden}</span>)}';

code = code.replace(oldTitle, newTitle);

fs.writeFileSync('src/app/dashboard/creditos/page.tsx', code, 'utf8');
