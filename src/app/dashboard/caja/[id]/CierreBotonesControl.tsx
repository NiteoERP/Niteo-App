'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, AlertTriangle, X } from 'lucide-react';
import { eliminarCierre } from '@/actions/cierres-actions';

export function CierreBotonesControl({ cierreId, isMaster }: { cierreId: string; isMaster: boolean }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isMaster) {
    return null; // Si no es MASTER, no se muestran ni Editar ni Eliminar (temporalmente hasta implementar override)
  }

  const handleDelete = async () => {
    setDeleting(true);
    const res = await eliminarCierre(cierreId);
    if (res?.error) {
      alert(res.error);
      setDeleting(false);
      setShowConfirm(false);
    } else {
      alert('Cierre eliminado permanentemente.');
      router.push('/dashboard/caja');
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 relative">
      <Link href={`/dashboard/caja/${cierreId}/editar`} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
        <Edit size={16} /> Editar
      </Link>
      
      <button 
        onClick={() => setShowConfirm(true)}
        className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
      >
        <Trash2 size={16} /> Eliminar
      </button>

      {/* Modal de Confirmación Ligero */}
      {showConfirm && (
        <div className="absolute right-0 top-12 z-50 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-5 w-72 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-3 mb-4">
            <AlertTriangle className="text-rose-500 shrink-0" size={24} />
            <div>
              <h4 className="text-white font-bold mb-1">¿Estás seguro?</h4>
              <p className="text-xs text-neutral-400">Esta acción eliminará el cierre y sus transacciones de forma permanente. No se puede deshacer.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowConfirm(false)}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              disabled={deleting}
            >
              Cancelar
            </button>
            <button 
              onClick={handleDelete}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg py-2 text-sm font-medium transition-colors flex justify-center items-center"
              disabled={deleting}
            >
              {deleting ? 'Borrando...' : 'Sí, Eliminar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
