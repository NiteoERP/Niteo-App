const fs = require('fs');

let content = fs.readFileSync('src/components/pos/LiveSalesFeed.tsx', 'utf-8');

// 1. Add imports
content = content.replace(
    "CreditCard, Search } from 'lucide-react'",
    "CreditCard, Search, Contact, ConciergeBell } from 'lucide-react'"
);

// 2. Add to UI
const oldHTML = `                          {sale.cliente_nombre && (
                            <span className="text-xs text-neutral-400 flex items-center gap-1">
                              <Users size={11} className="text-indigo-400" />
                              {privacyMode ? '****' : sale.cliente_nombre}
                            </span>
                          )}`;

const newHTML = `                          {sale.cliente_nombre && (
                            <span className="text-xs text-neutral-400 flex items-center gap-1">
                              <Users size={11} className="text-indigo-400" />
                              {privacyMode ? '****' : sale.cliente_nombre}
                            </span>
                          )}
                          {sale.cajero_nombre && (
                            <span className="text-xs text-neutral-400 flex items-center gap-1">
                              <Contact size={11} className="text-purple-400" />
                              {privacyMode ? '****' : sale.cajero_nombre}
                            </span>
                          )}
                          {sale.mesero_nombre && (
                            <span className="text-xs text-neutral-400 flex items-center gap-1">
                              <ConciergeBell size={11} className="text-amber-400" />
                              {privacyMode ? '****' : sale.mesero_nombre}
                            </span>
                          )}`;

content = content.replace(oldHTML, newHTML);

fs.writeFileSync('src/components/pos/LiveSalesFeed.tsx', content, 'utf-8');
console.log("Updated LiveSalesFeed.tsx");
