const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/caja/[id]/page.tsx', 'utf-8');

// Fix the query to also fetch transacciones
code = code.replace(
  /\.select\('\*, sedes\(nombre_sede\)'\)\n\s*\.eq\('id', params\.id\)\n\s*\.single\(\);/,
  `.select('*, sedes(nombre_sede)')
    .eq('id', params.id)
    .single();

  const { data: transacciones } = await supabase
    .from('cierres_transacciones')
    .select('*')
    .eq('cierre_id', params.id);`
);

// Fix the NaN in totals
code = code.replace(
  /\$\{Number\(cierre\.total_esperado_usd\)\.toFixed\(2\)\}/g,
  `\${Number(cierre.sistema_total_esperado || 0).toFixed(2)}`
);

code = code.replace(
  /\$\{Number\(cierre\.total_fisico_usd\)\.toFixed\(2\)\}/g,
  `\${Number((cierre.real_efectivo_usd || 0) + (cierre.real_bancos_usd || 0) + ((cierre.real_efectivo_bs || 0) / (cierre.tasa_cambio || 1)) + ((cierre.real_bancos_bs || 0) / (cierre.tasa_cambio || 1))).toFixed(2)}`
);

// Fix the mapping logic for transacciones
code = code.replace(
  /const mFisico = cierre\.montos_fisicos \|\| \{\};\n\s*const mEsperado = cierre\.montos_esperados \|\| \{\};\n\s*const eDiferencias = cierre\.desglose_diferencias \|\| \{\};/,
  `const txs = transacciones || [];`
);

code = code.replace(
  /\{Object\.keys\(mEsperado\)\.length > 0 \? Object\.keys\(mEsperado\)\.map\(metodo => \{[\s\S]*?\n\s*\}\) : \(\n\s*<div className="p-6 text-center text-neutral-500">No hay métodos registrados<\/div>\n\s*\)\}/,
  `{txs.length > 0 ? txs.map(t => {
            return (
              <div key={t.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-200 uppercase">{t.metodo}</p>
                  <div className="flex gap-4 mt-1 text-xs">
                    <span className="text-neutral-500">
                      {t.banco && t.banco !== 'N/A' ? t.banco : ''} {t.referencia && t.referencia !== 'N/A' ? 'Ref: ' + t.referencia : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  {Number(t.monto).toFixed(2)} {t.moneda}
                </div>
              </div>
            );
          }) : (
             <div className="p-6 text-center text-neutral-500">No hay métodos registrados</div>
          )}`
);

fs.writeFileSync('src/app/dashboard/caja/[id]/page.tsx', code);
