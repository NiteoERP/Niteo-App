'use client';

import React, { useOptimistic, useTransition, useState } from 'react';
import { createInsumo, deleteInsumo, ajustarInventarioBatch } from './actions';
import { PackageOpen, Plus, Trash2, Loader2, AlertCircle, FileText, Download, Save, X, Edit3 } from 'lucide-react';

export default function InsumosManager({ initialInsumos, empresaId, sedeId }: { initialInsumos: any[], empresaId: string, sedeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('Kg');
  const [costo, setCosto] = useState('');
  const [stock, setStock] = useState('');

  // Modals state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustData, setAdjustData] = useState<Record<string, string>>({});
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Optimistic UI state
  const [optimisticInsumos, addOptimisticInsumo] = useOptimistic(
    initialInsumos,
    (state, newAction: { type: 'add' | 'delete' | 'update', payload: any }) => {
      if (newAction.type === 'add') {
        return [{ ...newAction.payload, id: Math.random().toString(), isOptimistic: true }, ...state];
      } else if (newAction.type === 'delete') {
        return state.filter(i => i.id !== newAction.payload);
      } else if (newAction.type === 'update') {
        return state.map(i => {
          const adj = newAction.payload.find((a: any) => a.id === i.id);
          if (adj) return { ...i, cantidad_actual: adj.cantidad_actual };
          return i;
        });
      }
      return state;
    }
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !costo || !stock) return;
    
    setError('');
    
    const newInsumo = {
      empresa_id: empresaId,
      nombre,
      unidad_medida: unidad,
      costo_promedio: parseFloat(costo),
      cantidad_actual: parseFloat(stock)
    };

    // Reset form immediately
    setNombre(''); setCosto(''); setStock('');

    startTransition(async () => {
      addOptimisticInsumo({ type: 'add', payload: newInsumo });
      const res = await createInsumo(empresaId, sedeId, newInsumo.nombre, newInsumo.unidad_medida, newInsumo.costo_promedio, newInsumo.cantidad_actual);
      if (!res.success) {
        setError(res.error || 'Error desconocido');
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este insumo?')) return;
    
    startTransition(async () => {
      addOptimisticInsumo({ type: 'delete', payload: id });
      const res = await deleteInsumo(id);
      if (!res.success) {
        alert(res.error);
      }
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let rowsHtml = '';
    optimisticInsumos.forEach((insumo, idx) => {
      rowsHtml += `
        <tr>
          <td>${idx + 1}</td>
          <td>${insumo.nombre}</td>
          <td>${insumo.cantidad_actual} ${insumo.unidad_medida}</td>
          <td></td>
        </tr>
      `;
    });

    const html = `
      <html>
        <head>
          <title>Reporte de Inventario</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #000; }
            h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body onload="window.print()">
          <h1>Reporte de Inventario (Físico)</h1>
          <p>Fecha de impresión: ${new Date().toLocaleDateString('es-VE')} - ${new Date().toLocaleTimeString('es-VE')}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 45%;">Nombre del Insumo / Producto</th>
                <th style="width: 25%;">Existencia en Sistema</th>
                <th style="width: 25%;">Existencia Física Real (Anotar)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    import('xlsx').then(XLSX => {
      const data = optimisticInsumos.map((i, idx) => ({
        '#': idx + 1,
        'Nombre del Insumo': i.nombre,
        'Unidad de Medida': i.unidad_medida,
        'Existencia en Sistema': i.cantidad_actual,
        'Existencia Física Real (Anotar)': ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{wch: 5}, {wch: 40}, {wch: 20}, {wch: 25}, {wch: 30}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario Físico");
      XLSX.writeFile(wb, `Inventario_Fisico_${new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}.xlsx`);
    });
  };

  const openAdjustModal = () => {
    const data: Record<string, string> = {};
    optimisticInsumos.forEach(i => {
      data[i.id] = i.cantidad_actual.toString();
    });
    setAdjustData(data);
    setShowAdjustModal(true);
  };

  const handleSaveAdjustments = async () => {
    const changes: { id: string, cantidad_actual: number }[] = [];
    
    optimisticInsumos.forEach(i => {
      const newValStr = adjustData[i.id];
      const newVal = parseFloat(newValStr);
      if (!isNaN(newVal) && newVal !== i.cantidad_actual) {
        changes.push({ id: i.id, cantidad_actual: newVal });
      }
    });

    if (changes.length === 0) {
      setShowAdjustModal(false);
      return;
    }

    setIsAdjusting(true);
    startTransition(async () => {
      addOptimisticInsumo({ type: 'update', payload: changes });
      const res = await ajustarInventarioBatch(empresaId, sedeId, changes);
      setIsAdjusting(false);
      if (res.success) {
        setShowAdjustModal(false);
      } else {
        alert('Hubo un error al ajustar existencias');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <PackageOpen className="text-emerald-400" /> Control de Insumos Base
        </h2>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button onClick={handlePrint} className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap">
            <FileText size={16} /> Imprimir (PDF)
          </button>
          <button onClick={handleExportExcel} className="bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap">
            <Download size={16} /> Exportar (Excel)
          </button>
          <button onClick={openAdjustModal} className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap">
            <Edit3 size={16} /> Ajustar Existencias
          </button>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-medium text-neutral-400 mb-4">Registrar Nuevo Insumo</h3>
        <form onSubmit={handleCreate} className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Nombre del Insumo / Materia Prima</label>
            <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Harina de Trigo, Queso Mozzarella..." className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="w-full lg:w-48">
            <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Unidad de Medida</label>
            <select value={unidad} onChange={e => setUnidad(e.target.value)} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none">
              <option value="Kg">Kilogramos (Kg)</option>
              <option value="Gr">Gramos (Gr)</option>
              <option value="Lt">Litros (Lt)</option>
              <option value="Ml">Mililitros (Ml)</option>
              <option value="Und">Unidades (Und)</option>
              <option value="Cajas">Cajas</option>
              <option value="Paquetes">Paquetes</option>
            </select>
          </div>
          <div className="w-full lg:w-32">
            <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Existencia Base</label>
            <input required type="number" step="0.01" min="0" value={stock} onChange={e => setStock(e.target.value)} placeholder="0.00" className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="w-full lg:w-32">
            <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wider">Costo ($)</label>
            <input required type="number" step="0.01" min="0" value={costo} onChange={e => setCosto(e.target.value)} placeholder="0.00" className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <button type="submit" disabled={isPending} className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-emerald-900/20 flex justify-center items-center gap-2">
            {isPending ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />} Registrar
          </button>
        </form>
        {error && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-black/40 border-b border-neutral-800 text-neutral-400">
                <th className="py-4 px-6 font-medium">Insumo / Materia Prima</th>
                <th className="py-4 px-6 font-medium">Unidad</th>
                <th className="py-4 px-6 font-medium">Costo Promedio</th>
                <th className="py-4 px-6 font-medium">Existencia Actual</th>
                <th className="py-4 px-6 font-medium text-right">Valor Total ($)</th>
                <th className="py-4 px-6 text-center w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {optimisticInsumos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    No hay insumos registrados. Agrega el primero arriba.
                  </td>
                </tr>
              ) : optimisticInsumos.map((insumo: any) => (
                <tr key={insumo.id} className="hover:bg-white/5 transition-colors text-neutral-300">
                  <td className="py-4 px-6 font-medium text-neutral-200">
                    {insumo.nombre}
                    {insumo.isOptimistic && <span className="ml-2 text-xs text-emerald-400 opacity-70">(Guardando...)</span>}
                  </td>
                  <td className="py-4 px-6"><span className="bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-md text-xs font-medium border border-neutral-700">{insumo.unidad_medida}</span></td>
                  <td className="py-4 px-6"></td>
                  <td className="py-4 px-6 font-bold text-white">{insumo.cantidad_actual}</td>
                  <td className="py-4 px-6 text-right text-emerald-400 font-medium"></td>
                  <td className="py-4 px-6 text-center">
                    <button onClick={() => handleDelete(insumo.id)} disabled={insumo.isOptimistic} className="text-neutral-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors disabled:opacity-50">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] flex flex-col">
            <button onClick={() => setShowAdjustModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <Edit3 className="text-indigo-400" /> Ajustar Existencias Físicas
            </h2>
            <p className="text-sm text-neutral-400 mb-6">Actualiza las cantidades reales luego de haber hecho tu verificación física de inventario.</p>
            
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-3">
              {optimisticInsumos.map(insumo => (
                <div key={insumo.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{insumo.nombre}</p>
                    <p className="text-xs text-neutral-500">Unidad: {insumo.unidad_medida} | Sistema: {insumo.cantidad_actual}</p>
                  </div>
                  <div className="w-full sm:w-32 shrink-0">
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01" 
                        value={adjustData[insumo.id] || ''} 
                        onChange={e => setAdjustData(prev => ({...prev, [insumo.id]: e.target.value}))}
                        className="w-full bg-indigo-900/20 border border-indigo-500/30 text-white rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-neutral-800">
              <button onClick={() => setShowAdjustModal(false)} className="px-5 py-2.5 text-sm font-medium text-neutral-300 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveAdjustments} disabled={isAdjusting} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-900/20 flex items-center gap-2">
                {isAdjusting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar Ajustes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
