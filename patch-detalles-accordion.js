const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/page.tsx', 'utf-8');

// Ensure ChevronDown is imported
if (!code.includes('ChevronDown')) {
  code = code.replace(
    /import \{ ArrowLeft, Edit, Wallet, Calendar, MapPin, CheckCircle, XCircle \} from 'lucide-react';/,
    "import { ArrowLeft, Edit, Wallet, Calendar, MapPin, CheckCircle, XCircle, ChevronDown } from 'lucide-react';"
  );
}

// Replace the flat list rendering
const oldList = `<div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
          <h3 className="font-bold text-white">Desglose por M\\u011b\\u011b\\u011b... // whatever mojibake is there
        </div>`;
        
// I'll just use regex to replace the entire Desglose div.
const desgloseStart = `<div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">`;
let dIdx = code.indexOf(desgloseStart);
if (dIdx === -1) {
    console.log("Could not find desglose block!");
} else {
    // Find the end of the desglose block.
    // It's followed by {cierre.observaciones && (
    let endIdx = code.indexOf("{cierre.observaciones && (");
    if (endIdx === -1) endIdx = code.indexOf("    </div>\n  );\n}");
    
    if (endIdx !== -1) {
        const replacement = `{/* DESGLOSE AGRUPADO POR MTODO */}
      <div className="space-y-3">
        <h3 className="font-bold text-white mb-4">Desglose por Métodos de Pago</h3>
        {txs.length > 0 ? (
          Object.entries(
            txs.reduce((acc, t) => {
              if (!acc[t.metodo]) acc[t.metodo] = { moneda: t.moneda, total: 0, pagos: [] };
              acc[t.metodo].pagos.push(t);
              acc[t.metodo].total += Number(t.monto);
              return acc;
            }, {} as Record<string, { moneda: string, total: number, pagos: any[] }>)
          ).map(([metodo, data]) => (
            <details key={metodo} className="group bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
              <summary className="p-4 flex items-center justify-between cursor-pointer bg-neutral-900/50 hover:bg-neutral-800/50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white uppercase">{metodo}</span>
                  <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded-md">{data.pagos.length} pagos</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-emerald-400">{data.total.toFixed(2)} {data.moneda}</span>
                  <ChevronDown className="text-neutral-500 group-open:rotate-180 transition-transform" size={18} />
                </div>
              </summary>
              <div className="divide-y divide-neutral-800/50 border-t border-neutral-800">
                {data.pagos.map((t: any) => (
                  <div key={t.id} className="p-4 flex items-center justify-between bg-neutral-950/30 pl-8">
                    <div>
                      <p className="font-medium text-neutral-300 text-sm">{t.banco && t.banco !== 'N/A' ? t.banco : 'Sin banco/referencia'}</p>
                      {t.referencia && t.referencia !== 'N/A' && <p className="text-xs text-neutral-500 mt-0.5">Ref: {t.referencia}</p>}
                    </div>
                    <span className="font-bold text-emerald-400/80 text-sm">{Number(t.monto).toFixed(2)} {t.moneda}</span>
                  </div>
                ))}
              </div>
            </details>
          ))
        ) : (
          <div className="p-6 text-center text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-2xl">
            No hay métodos registrados
          </div>
        )}
      </div>\n\n      `;
        
        code = code.slice(0, dIdx) + replacement + code.slice(endIdx);
    }
}

fs.writeFileSync('src/app/dashboard/caja/[id]/page.tsx', code);
