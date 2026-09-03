'use client';

import React, { useState, useEffect } from 'react';
import { getComprasMetodosPago, addCompraMetodoPago } from '@/actions/compras-actions';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Plus, Trash2, CreditCard } from 'lucide-react';

export default function MetodosComprasForm() {
  const [metodos, setMetodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    cargarMetodos();
  }, []);

  const cargarMetodos = async () => {
    setLoading(true);
    const res = await getComprasMetodosPago();
    if (res.success && res.data) {
      setMetodos(res.data);
    }
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevo.trim()) return;
    setIsAdding(true);
    const res = await addCompraMetodoPago(nuevo.trim());
    if (res.success) {
      setNuevo('');
      await cargarMetodos();
    }
    setIsAdding(false);
  };

  const handleDelete = async (id: string) => {
    // Para no romper facturas existentes, se desactivan
    const supabase = createClient();
    await supabase.from('compras_metodos_pago').update({ estado_activo: false }).eq('id', id);
    await cargarMetodos();
  };

  return (
    <section className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl mt-8">
      <div className="flex items-center gap-3 border-b border-neutral-800/50 pb-4 mb-6">
        <CreditCard className="text-orange-400" />
        <h2 className="text-lg font-medium text-white">Métodos de Pago (Compras)</h2>
      </div>
      
      <p className="text-sm text-neutral-400 mb-4">
        Estos son los métodos de pago independientes que aparecen al registrar Compras a Proveedores.
      </p>

      {loading ? (
        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-neutral-500" /></div>
      ) : (
        <div className="space-y-4">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {metodos.map((m) => (
              <li key={m.id} className="flex justify-between items-center bg-neutral-950 border border-neutral-800 p-3 rounded-lg">
                <span className="text-white text-sm font-medium">{m.nombre}</span>
                <button 
                  onClick={() => handleDelete(m.id)}
                  className="text-neutral-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
            {metodos.length === 0 && <p className="text-neutral-500 text-sm">No hay métodos registrados.</p>}
          </ul>

          <form onSubmit={handleAdd} className="flex gap-2 mt-4">
            <input 
              type="text" 
              value={nuevo}
              onChange={e => setNuevo(e.target.value)}
              placeholder="Ej. Transferencia Banco Central..."
              className="flex-1 bg-neutral-950 border border-neutral-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-orange-500"
            />
            <button 
              type="submit"
              disabled={isAdding || !nuevo.trim()}
              className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Añadir
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
