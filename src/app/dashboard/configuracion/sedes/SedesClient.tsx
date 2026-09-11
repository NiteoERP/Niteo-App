'use client';

import React, { useState, useTransition } from 'react';
import { Sede, generarMasterKey, crearSede, eliminarSede, activarSede } from '@/actions/sedes-actions';
import { Key, Plus, MapPin, MonitorSmartphone, CheckCircle2, Clock, AlertCircle, Trash2, Power } from 'lucide-react';

export default function SedesClient({ initialSedes }: { initialSedes: Sede[] }) {
  const [isPending, startTransition] = useTransition();
  const [newKeyVisible, setNewKeyVisible] = useState<{ id: string, key: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleGenerateKey = async (sedeId: string) => {
    

    startTransition(async () => {
      const result = await generarMasterKey(sedeId);
      if (result.success && result.key) {
        setNewKeyVisible({ id: sedeId, key: result.key });
      } else {
        alert(result.error || 'Ocurrió un error.');
      }
    });
  };

  const handleDelete = (sedeId: string, nombreSede: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar la sede "${nombreSede}"?`)) {
      startTransition(async () => {
        const res = await eliminarSede(sedeId);
        if (res.error) {
          alert(res.error);
        } else {
          alert(res.message);
        }
      });
    }
  };

  const handleActivar = (sedeId: string, nombreSede: string) => {
    if (confirm(`Deseas reactivar la sede "${nombreSede}"?`)) {
      startTransition(async () => {
        const res = await activarSede(sedeId);
        if (res.error) {
          alert(res.error);
        } else {
          alert(res.message);
        }
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Lista de Sedes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {initialSedes.map((sede) => (
          <div key={sede.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors flex flex-col h-full relative overflow-hidden">
            <div className="flex gap-4 items-start mb-6">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 mt-1">
                {sede.tipo_sede === 'VIRTUAL' ? <MonitorSmartphone size={24} /> : <MapPin size={24} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{sede.nombre_sede}</h3>
                    <p className="text-sm text-neutral-400 truncate">{sede.direccion || 'Sin dirección registrada'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sede.estado_activo ? (
                      <>
                        <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                          Activa
                        </span>
                        <button
                          onClick={() => handleDelete(sede.id, sede.nombre_sede)}
                          disabled={isPending}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar o desactivar sede"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="px-2.5 py-1 text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700 rounded-lg">
                          Inactiva
                        </span>
                        <button
                          onClick={() => handleActivar(sede.id, sede.nombre_sede)}
                          disabled={isPending}
                          className="p-1.5 text-neutral-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Activar sede"
                        >
                          <Power size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold rounded-md border uppercase tracking-wider ${
                    sede.tipo_sede === 'VIRTUAL' 
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}>
                    {sede.tipo_sede === 'VIRTUAL' ? <MonitorSmartphone size={12} /> : <MapPin size={12} />}
                    Sede {sede.tipo_sede}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-neutral-800/50 mt-auto">
              {sede.tipo_sede === 'FISICA' ? (
                <>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1 truncate">Emparejamiento</p>
                    {sede.master_key ? (
                      <div className="flex items-center gap-2 text-sm text-neutral-300">
                        <Key size={14} className="text-indigo-400 shrink-0" />
                        <span className="truncate">Configurada</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-amber-400">
                        <AlertCircle size={14} className="shrink-0" />
                        <span className="truncate">Sin vincular</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1 truncate">Sincronización</p>
                    <div className="flex items-center gap-2 text-sm text-neutral-300">
                      <Clock size={14} className="shrink-0" />
                      <span className="truncate">{sede.ultima_sincronizacion ? new Date(sede.ultima_sincronizacion).toLocaleString() : 'Nunca'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1 truncate">Tecnología</p>
                    <div className="flex items-center gap-2 text-sm text-purple-300">
                      <MonitorSmartphone size={14} className="shrink-0" />
                      <span className="truncate">Terminal Nativo</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1 truncate">Sincronización</p>
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span className="truncate">En tiempo real</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {sede.tipo_sede === 'FISICA' && (
              <div className="pt-4 border-t border-neutral-800/50">
                {newKeyVisible?.id === sede.id ? (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center space-y-2 animate-in fade-in zoom-in duration-200">
                    <p className="text-sm text-indigo-200">Pairing Code generado:</p>
                    <p className="text-2xl font-mono font-bold text-white tracking-widest">{newKeyVisible.key}</p>
                    <p className="text-[10px] text-indigo-300">Ingresa esto en Niteo Sync. Desaparecerá al recargar.</p>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleGenerateKey(sede.id)}
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    <MonitorSmartphone size={16} />
                    {isPending ? 'Generando...' : 'Generar Pairing Code'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formulario Nueva Sede */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 md:p-8">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Plus size={18} className="text-indigo-400" />
            Añadir Nueva Sucursal
          </h3>
          <p className="text-sm text-neutral-400 mt-1">
            Crea una nueva sede en tu cuenta para poder gestionar su inventario y vincular sus cajas.
          </p>
        </div>

        <form ref={formRef} action={async (formData) => {
          const res = await crearSede(formData);
          if (res?.error) {
            alert(res.error);
          } else {
            setSuccessMsg('Sucursal creada exitosamente.');
            formRef.current?.reset();
            setTimeout(() => setSuccessMsg(''), 3000);
          }
        }} className="max-w-xl space-y-4">
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400 text-sm mb-4">
              {successMsg}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Nombre de la Sede</label>
              <input 
                type="text" 
                name="nombre_sede" 
                required
                placeholder="Ej. Sucursal Norte"
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-300">Dirección (Opcional)</label>
              <input 
                type="text" 
                name="direccion" 
                placeholder="Ej. Av. Principal 123"
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-neutral-300">Tipo de Sede</label>
              <select 
                name="tipo_sede" 
                defaultValue="FISICA"
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              >
                <option value="FISICA">Sede Física (Con Aronium POS)</option>
                <option value="VIRTUAL">Sede Virtual (Niteo Terminal POS)</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                La Sede Virtual permite registrar ventas directamente desde Niteo Web sin necesidad de un sistema POS físico.
              </p>
            </div>
          </div>
          
          <div className="pt-2">
            <button 
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition-colors"
            >
              Crear Sucursal
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
