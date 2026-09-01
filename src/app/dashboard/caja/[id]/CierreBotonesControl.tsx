'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, AlertTriangle, Key, X } from 'lucide-react';
import { eliminarCierre, verifySupervisor } from '@/actions/cierres-actions';

export function CierreBotonesControl({ cierreId, isMaster }: { cierreId: string; isMaster: boolean }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setVerifying(true);
    
    const res = await verifySupervisor(password);
    if (res?.error) {
      alert(res.error);
      setVerifying(false);
      setPassword('');
    } else {
      // Permiso concedido, navegar a editar
      setShowPasswordModal(false);
      router.push(`/dashboard/caja/${cierreId}/editar`);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 relative">
      
      {/* Botón Editar para todos (Cajero o Master) */}
      {isMaster ? (
        <Link href={`/dashboard/caja/${cierreId}/editar`} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
          <Edit size={16} /> Editar
        </Link>
      ) : (
        <button 
          onClick={() => setShowPasswordModal(true)}
          className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
        >
          <Edit size={16} /> Editar
        </button>
      )}
      
      {/* Botón Eliminar (SOLO MASTER) */}
      {isMaster && (
        <button 
          onClick={() => setShowConfirm(true)}
          className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
        >
          <Trash2 size={16} /> Eliminar
        </button>
      )}

      {/* Modal de Confirmación Eliminar */}
      {showConfirm && (
        <div className="absolute right-0 top-12 z-50 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-5 w-72 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex gap-3 mb-4">
            <AlertTriangle className="text-rose-500 shrink-0" size={24} />
            <div>
              <h4 className="text-white font-bold mb-1">¿Estás seguro?</h4>
              <p className="text-xs text-neutral-400">Esta acción eliminará el cierre permanentemente. No se puede deshacer.</p>
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

      {/* Modal de Contraseña Supervisor */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-indigo-400">
                <Key size={20} />
                <h3 className="font-bold text-white">Autorización Requerida</h3>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="text-neutral-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-neutral-400 mb-6">Ingresa la contraseña del MASTER de la empresa para habilitar la edición de este cierre.</p>
            
            <form onSubmit={handleVerify}>
              <input 
                type="password" 
                autoFocus
                placeholder="Contraseña del Master..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500 mb-4"
              />
              <button 
                type="submit"
                disabled={!password || verifying}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold rounded-xl py-3 transition-colors flex justify-center"
              >
                {verifying ? 'Verificando...' : 'Autorizar Edición'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
