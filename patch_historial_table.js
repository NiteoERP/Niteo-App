const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', 'utf8');

const oldHistorialStart = code.indexOf(`{vistaActual === 'historial' && (`);
const nextSection = code.indexOf(`{vistaActual === 'cierres' &&`);

if (oldHistorialStart === -1 || nextSection === -1) {
    console.error("Could not find blocks");
    process.exit(1);
}

const newHistorialCode = `{vistaActual === 'historial' && (
           <div className="flex-1 flex flex-col bg-[#111111] overflow-hidden">
             
             {/* TOP TOOLBAR */}
             <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3 bg-neutral-900 border-b border-neutral-800 p-2">
               <div className="flex flex-wrap items-center gap-4">
                 <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider hidden md:block px-2">Historial de ventas</h3>
                 <div className="flex bg-neutral-950 rounded border border-neutral-800">
                    <button onClick={() => setModoHistorial('local')} className={\`px-3 py-1.5 text-xs font-bold transition-colors \${modoHistorial === 'local' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'}\`}>Esta Caja</button>
                    <button onClick={() => setModoHistorial('sede')} className={\`px-3 py-1.5 text-xs font-bold transition-colors \${modoHistorial === 'sede' ? 'bg-emerald-600 text-white' : 'text-neutral-400 hover:text-white'}\`}>Todas las cajas</button>
                 </div>
                 
                 <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1">
                   <Calendar size={14} className="text-neutral-500" />
                   <input 
                     type="date" 
                     value={fechaInicioHistorial} 
                     onChange={e => setFechaInicioHistorial(e.target.value)} 
                     className="bg-transparent text-xs text-neutral-300 outline-none"
                   />
                   <span className="text-neutral-600">-</span>
                   <input 
                     type="date" 
                     value={fechaFinHistorial} 
                     onChange={e => setFechaFinHistorial(e.target.value)} 
                     className="bg-transparent text-xs text-neutral-300 outline-none"
                   />
                 </div>
                 <button onClick={() => cargarHistorial(modoHistorial, fechaInicioHistorial, fechaFinHistorial)} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white px-2 py-1.5 transition-colors">
                   <RefreshCw size={14} /> Refrescar
                 </button>
               </div>
               
               <div className="flex items-center gap-1 border-l border-neutral-800 pl-2">
                 <button className="flex flex-col items-center justify-center gap-1 text-[10px] text-neutral-400 hover:text-white px-2 py-1 transition-colors" title="Asignar Cliente">
                   <Users size={16} /> Cliente
                 </button>
                 <button className="flex flex-col items-center justify-center gap-1 text-[10px] text-neutral-400 hover:text-white px-2 py-1 transition-colors" title="Imprimir Factura A4">
                   <Printer size={16} /> Imprimir
                 </button>
                 <button className="flex flex-col items-center justify-center gap-1 text-[10px] text-neutral-400 hover:text-white px-2 py-1 transition-colors" title="Guardar Factura como PDF">
                   <FileText size={16} /> PDF
                 </button>
                 <button onClick={() => reimprimirVenta()} disabled={!historialSeleccionadoID} className="flex flex-col items-center justify-center gap-1 text-[10px] text-neutral-400 hover:text-emerald-400 disabled:opacity-30 disabled:hover:text-neutral-400 px-2 py-1 transition-colors" title="Imprimir Ticket Térmico">
                   <Receipt size={16} /> Recibo
                 </button>
                 <button onClick={() => { if(historialSeleccionadoID) alert("Reembolso en desarrollo"); }} disabled={!historialSeleccionadoID} className="flex flex-col items-center justify-center gap-1 text-[10px] text-neutral-400 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-neutral-400 px-2 py-1 transition-colors">
                   <Undo2 size={16} /> Reembolso
                 </button>
               </div>
             </div>

             {/* MASTER TABLE (Ventas) */}
             <div className="flex-1 flex flex-col border-b border-neutral-800 overflow-hidden bg-neutral-950">
                <div className="bg-neutral-900 border-b border-neutral-800 px-3 py-1 shrink-0">
                  <span className="text-xs font-bold text-neutral-400">Documentos</span>
                </div>
                <div className="flex-1 overflow-auto">
                   <table className="w-full text-left text-xs whitespace-nowrap">
                     <thead className="sticky top-0 bg-neutral-900 text-neutral-400 border-b border-neutral-800">
                       <tr>
                         <th className="px-3 py-2 font-semibold">ID</th>
                         <th className="px-3 py-2 font-semibold">Tipo</th>
                         <th className="px-3 py-2 font-semibold">Usuario (Cajero)</th>
                         <th className="px-3 py-2 font-semibold">Cliente</th>
                         <th className="px-3 py-2 font-semibold">Fecha</th>
                         <th className="px-3 py-2 font-semibold">Tipo de pago</th>
                         <th className="px-3 py-2 font-semibold text-right">Total Bs</th>
                         <th className="px-3 py-2 font-semibold text-right">Total USD</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-neutral-900/50">
                       {listaHistorial.length === 0 && (
                         <tr><td colSpan={8} className="text-center py-8 text-neutral-600">Sin documentos</td></tr>
                       )}
                       {listaHistorial.map(v => {
                         const isSelected = v.id === historialSeleccionadoID;
                         return (
                           <tr 
                             key={v.id} 
                             onClick={() => verDetalleVenta(v)}
                             className={\`cursor-pointer transition-colors \${isSelected ? 'bg-sky-600/30 text-white' : 'text-neutral-300 hover:bg-neutral-800/50'}\`}
                           >
                             <td className="px-3 py-1.5 font-mono text-[10px]">{v.id.slice(0, 8).toUpperCase()}</td>
                             <td className="px-3 py-1.5">Venta</td>
                             <td className="px-3 py-1.5 truncate max-w-[120px]">{v.cajero_nombre || 'Desconocido'}</td>
                             <td className="px-3 py-1.5 truncate max-w-[120px]">{v.nombre_eventual || 'Desconocido'}</td>
                             <td className="px-3 py-1.5">{new Date(v.fecha_creacion).toLocaleString()}</td>
                             <td className="px-3 py-1.5 truncate max-w-[120px]">{v.metodos_pago ? v.metodos_pago.join(', ') : 'N/A'}</td>
                             <td className="px-3 py-1.5 text-right font-mono">{(Number(v.total) * (v.tasa_bcv || tasaEfectiva)).toFixed(2)}</td>
                             <td className="px-3 py-1.5 text-right font-mono">{Number(v.total).toFixed(2)}</td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                </div>
             </div>

             {/* DETAIL TABLE (Items) */}
             <div className="h-64 flex flex-col bg-neutral-950 shrink-0">
                <div className="bg-neutral-900 border-b border-neutral-800 px-3 py-1 shrink-0 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400">Artículos del documento</span>
                  {cargandoDetalles && <RefreshCw size={12} className="animate-spin text-neutral-500" />}
                </div>
                <div className="flex-1 overflow-auto">
                   <table className="w-full text-left text-xs whitespace-nowrap">
                     <thead className="sticky top-0 bg-neutral-900 text-neutral-400 border-b border-neutral-800">
                       <tr>
                         <th className="px-3 py-2 font-semibold">ID</th>
                         <th className="px-3 py-2 font-semibold">Nombre</th>
                         <th className="px-3 py-2 font-semibold text-right">Cantidad</th>
                         <th className="px-3 py-2 font-semibold text-right">Precio Unit.</th>
                         <th className="px-3 py-2 font-semibold text-right">Total</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-neutral-900/50">
                       {!historialSeleccionadoID && (
                         <tr><td colSpan={5} className="text-center py-6 text-neutral-600">Seleccione un documento para ver sus artículos</td></tr>
                       )}
                       {historialSeleccionadoID && detallesVenta.length === 0 && !cargandoDetalles && (
                         <tr><td colSpan={5} className="text-center py-6 text-neutral-600">Sin artículos</td></tr>
                       )}
                       {detallesVenta.map((item, idx) => (
                         <tr key={idx} className="text-neutral-300 hover:bg-neutral-800/30">
                           <td className="px-3 py-1.5 font-mono text-[10px]">{item.producto_id ? item.producto_id.slice(0, 8).toUpperCase() : 'N/A'}</td>
                           <td className="px-3 py-1.5">{item.nombre}</td>
                           <td className="px-3 py-1.5 text-right font-mono">{Number(item.cantidad).toFixed(4)}</td>
                           <td className="px-3 py-1.5 text-right font-mono">{Number(item.precio_unitario).toFixed(2)}</td>
                           <td className="px-3 py-1.5 text-right font-mono">{(Number(item.cantidad) * Number(item.precio_unitario)).toFixed(2)}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
                
                {/* FOOTER STATS */}
                <div className="bg-neutral-900 border-t border-neutral-800 p-2 text-xs text-neutral-400 flex flex-col justify-end h-16 shrink-0">
                  <div>Recuento de documentos: <span className="font-bold text-white">{listaHistorial.length}</span></div>
                  <div>Cantidad total (USD): <span className="font-bold text-white">{listaHistorial.reduce((acc, curr) => acc + Number(curr.total), 0).toFixed(2)}</span></div>
                </div>
             </div>

           </div>
        )}
`;

code = code.substring(0, oldHistorialStart) + newHistorialCode + "\n\n        " + code.substring(nextSection);

fs.writeFileSync('c:/Users/Usuario/Documents/Niteo App/niteo-pos/frontend/src/TerminalPOS.tsx', code);
console.log("Patched Data Table Historial");
