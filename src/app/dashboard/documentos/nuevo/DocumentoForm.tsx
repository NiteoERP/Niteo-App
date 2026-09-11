'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { 
  FileText, Calendar, User, Search, Plus, Trash2, 
  Save, Printer, FileDown, Loader2 
} from 'lucide-react';
import { crearDocumentoFormal, CrearDocumentoInput } from '@/actions/documentos-actions';

interface DocumentoFormProps {
  catalogo: any[];
  sedeVirtualId: string;
  empresa: any;
  clientes: any[];
}

export default function DocumentoForm({ catalogo, sedeVirtualId, empresa, clientes }: DocumentoFormProps) {
  const [tipoDoc, setTipoDoc] = useState<'FACTURA' | 'PRESUPUESTO' | 'NOTA_ENTREGA'>('FACTURA');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  
  // Cliente
  const [clienteId, setClienteId] = useState('');
  const [clienteLibre, setClienteLibre] = useState('');

  // Notas
  const [notas, setNotas] = useState('');
  const [terminos, setTerminos] = useState('');

  // Carrito (Líneas manuales)
  const [lineas, setLineas] = useState([{ id: Date.now(), producto_id: '', nombre: '', cantidad: 1, precio_unitario: 0, descuento: 0 }]);
  
  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string; factura?: any } | null>(null);

  const agregarLinea = () => {
    setLineas([...lineas, { id: Date.now(), producto_id: '', nombre: '', cantidad: 1, precio_unitario: 0, descuento: 0 }]);
  };

  const removerLinea = (id: number) => {
    setLineas(lineas.filter(l => l.id !== id));
  };

  const actualizarLinea = (id: number, campo: string, valor: any) => {
    setLineas(lineas.map(l => {
      if (l.id !== id) return l;
      
      // Si cambia el producto_id, auto-llenar nombre y precio
      if (campo === 'producto_id') {
        const prod = catalogo.find(p => p.producto_id === valor);
        if (prod) {
          return { ...l, producto_id: valor, nombre: prod.nombre, precio_unitario: Number(prod.precio_venta) || 0 };
        }
      }
      return { ...l, [campo]: valor };
    }));
  };

  const subtotal = lineas.reduce((acc, l) => acc + (l.cantidad * l.precio_unitario), 0);
  const descuentos = lineas.reduce((acc, l) => acc + (Number(l.descuento) || 0), 0);
  const total = Math.max(0, subtotal - descuentos);

  const handleGuardar = () => {
    if (!sedeVirtualId) {
      alert("No hay sede virtual configurada para emitir documentos.");
      return;
    }

    const itemsFinales = lineas.filter(l => l.nombre.trim() !== '' && l.precio_unitario > 0);
    if (itemsFinales.length === 0) {
      alert("Debes agregar al menos un ítem válido.");
      return;
    }

    let cId = clienteId || undefined;
    let cNom = clienteLibre.trim() || undefined;

    if (clienteId) {
      const c = clientes.find(x => x.id === clienteId);
      if (c) cNom = c.razon_social;
    }

    startTransition(async () => {
      const res = await crearDocumentoFormal({
        sede_id: sedeVirtualId,
        tipo_documento: tipoDoc,
        cliente_id: cId,
        cliente_nombre: cNom,
        fecha_venta: new Date().toISOString(),
        fecha_vencimiento: fechaVencimiento ? new Date(fechaVencimiento).toISOString() : undefined,
        notas,
        terminos_condiciones: terminos,
        items: itemsFinales.map(i => ({
          producto_id: i.producto_id || '00000000-0000-0000-0000-000000000000', // UUID genérico si es manual
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          descuento: Number(i.descuento) || 0
        })),
        total,
        descuento_global: descuentos
      });

      if (res.success && res.factura) {
        setResultado({ ok: true, msg: `${tipoDoc} Creado exitosamente.`, factura: res.factura });
      } else {
        setResultado({ ok: false, msg: res.error || 'Error al guardar.' });
      }
    });
  };

  const handleImprimir = async () => {
    if (!resultado?.factura) return;
    try {
      const { generarDocumentoA4 } = await import('@/utils/pdf-generator');
      let cInfo = null;
      if (clienteId) cInfo = clientes.find(c => c.id === clienteId);
      else if (clienteLibre) cInfo = { nombre_comercial: clienteLibre };
      
      const itemsToPrint = lineas.filter(l => l.nombre.trim() !== '');
      
      generarDocumentoA4(resultado.factura, empresa, itemsToPrint, cInfo);
    } catch (err) {
      console.error(err);
      alert("Error al generar PDF");
    }
  };

  if (resultado?.ok) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px] text-center gap-6">
         <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
            <FileText size={40} />
         </div>
         <div>
            <h2 className="text-2xl font-bold text-white mb-2">{resultado.msg}</h2>
            <p className="text-neutral-400">N° de Documento: <strong className="text-white">{resultado.factura.numero_documento}</strong></p>
         </div>
         <div className="flex items-center gap-4 mt-4">
            <button 
              onClick={handleImprimir}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
            >
              <FileDown size={18} /> Descargar PDF
            </button>
            <button 
              onClick={() => {
                setLineas([{ id: Date.now(), producto_id: '', nombre: '', cantidad: 1, precio_unitario: 0, descuento: 0 }]);
                setResultado(null);
                setClienteId('');
                setClienteLibre('');
                setNotas('');
                setTerminos('');
                setFechaVencimiento('');
              }}
              className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all border border-neutral-700"
            >
              Crear Nuevo
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
       {/* HEADER */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b border-neutral-800 bg-neutral-950/50">
          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Tipo de Documento</label>
            <select 
              value={tipoDoc} 
              onChange={e => setTipoDoc(e.target.value as any)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-indigo-500"
            >
               <option value="FACTURA">Factura</option>
               <option value="PRESUPUESTO">Presupuesto / Cotización</option>
               <option value="NOTA_ENTREGA">Nota de Entrega</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Cliente (Directorio)</label>
            <select 
              value={clienteId} 
              onChange={e => { setClienteId(e.target.value); setClienteLibre(''); }}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
               <option value="">Seleccionar Cliente...</option>
               {clientes.map(c => <option key={c.id} value={c.id}>{c.razon_social} ({c.identificacion})</option>)}
            </select>
          </div>
          <div>
             <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Cliente / Empresa (Manual)</label>
             <input 
               type="text" 
               placeholder="Escribir nombre manual..."
               value={clienteLibre}
               onChange={e => { setClienteLibre(e.target.value); setClienteId(''); }}
               className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
             />
          </div>
       </div>

       {/* ITEMS */}
       <div className="p-6">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-bold text-white uppercase tracking-wider">Detalles de Facturación</h3>
             <button onClick={agregarLinea} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <Plus size={14} /> Añadir Fila
             </button>
          </div>

          <div className="space-y-3">
             {lineas.map((linea, i) => (
                <div key={linea.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-neutral-950/30 p-3 rounded-xl border border-neutral-800/50">
                   {/* Buscador Catálogo */}
                   <div className="flex-1 w-full md:w-auto relative">
                      <select 
                        value={linea.producto_id}
                        onChange={e => actualizarLinea(linea.id, 'producto_id', e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-300 focus:outline-none focus:border-indigo-500"
                      >
                         <option value="">-- Ítem libre / Buscar catálogo --</option>
                         {catalogo.map(p => <option key={p.producto_id} value={p.producto_id}>{p.nombre}</option>)}
                      </select>
                   </div>
                   
                   {/* Descripción libre si no se escoge del catálogo */}
                   {!linea.producto_id && (
                     <input 
                       type="text"
                       placeholder="Descripción"
                       value={linea.nombre}
                       onChange={e => actualizarLinea(linea.id, 'nombre', e.target.value)}
                       className="flex-1 w-full md:w-auto bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                     />
                   )}

                   {/* Cantidad y Precio */}
                   <div className="flex gap-2 w-full md:w-auto">
                      <input 
                        type="number" min="1" placeholder="Cant"
                        value={linea.cantidad}
                        onChange={e => actualizarLinea(linea.id, 'cantidad', parseFloat(e.target.value) || 0)}
                        className="w-16 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-2 text-sm text-white text-center focus:outline-none focus:border-indigo-500"
                      />
                      <div className="relative w-28">
                         <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                         <input 
                           type="number" step="0.01" placeholder="Precio"
                           value={linea.precio_unitario}
                           onChange={e => actualizarLinea(linea.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                           className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-6 pr-2 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                         />
                      </div>
                      <div className="relative w-24">
                         <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">-$</span>
                         <input 
                           type="number" step="0.01" placeholder="Desc"
                           value={linea.descuento || ''}
                           onChange={e => actualizarLinea(linea.id, 'descuento', parseFloat(e.target.value) || 0)}
                           className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-6 pr-2 py-2 text-sm text-emerald-400 focus:outline-none focus:border-emerald-500"
                         />
                      </div>
                      
                      <div className="w-24 px-3 py-2 text-right bg-neutral-900 border border-neutral-800 rounded-lg font-bold text-white text-sm">
                         ${((linea.cantidad * linea.precio_unitario) - (Number(linea.descuento) || 0)).toFixed(2)}
                      </div>

                      <button 
                        onClick={() => removerLinea(linea.id)}
                        disabled={lineas.length === 1}
                        className="p-2 text-neutral-500 hover:text-red-400 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors disabled:opacity-30"
                      >
                         <Trash2 size={16} />
                      </button>
                   </div>
                </div>
             ))}
          </div>
       </div>

       {/* FOOTER - NOTAS Y TOTALES */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 border-t border-neutral-800 bg-neutral-950/50">
          <div className="space-y-4">
             <div>
               <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Fecha de Vencimiento / Validez</label>
               <input 
                 type="date"
                 value={fechaVencimiento}
                 onChange={e => setFechaVencimiento(e.target.value)}
                 className="w-full md:w-1/2 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 color-scheme-dark"
               />
             </div>
             <div>
               <label className="block text-xs font-bold text-neutral-400 mb-1.5 uppercase tracking-wider">Términos y Condiciones</label>
               <textarea 
                 value={terminos}
                 onChange={e => setTerminos(e.target.value)}
                 placeholder="Ej. Pagos a 15 días, validez de 7 días, etc..."
                 rows={3}
                 className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
               />
             </div>
          </div>

          <div className="flex flex-col justify-end">
             <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                   <span className="text-neutral-400 font-medium">Subtotal:</span>
                   <span className="text-white">${subtotal.toFixed(2)}</span>
                </div>
                {descuentos > 0 && (
                  <div className="flex justify-between text-sm">
                     <span className="text-emerald-400 font-medium">Descuentos (-):</span>
                     <span className="text-emerald-400 font-bold">${descuentos.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-neutral-800 flex justify-between">
                   <span className="text-base text-white uppercase font-black">Total:</span>
                   <span className="text-2xl font-black text-indigo-400">${total.toFixed(2)}</span>
                </div>
             </div>

             <button
                onClick={handleGuardar}
                disabled={isPending || lineas.length === 0}
                className="w-full h-14 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.2)] disabled:opacity-50 transition-all"
             >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Guardar y Generar PDF
             </button>
          </div>
       </div>

    </div>
  );
}
