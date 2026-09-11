'use client';

import React, { useState, useTransition } from 'react';
import { upsertMetodoPago, toggleMetodoPago, eliminarMetodoPago } from './actions';
import { CreditCard, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, RefreshCw, Save, X, AlertCircle } from 'lucide-react';

const TIPOS_METODO = [
  { value: 'zelle', label: 'Zelle', icon: '💸', campos: ['email', 'titular'] },
  { value: 'binance', label: 'Binance Pay', icon: '🔶', campos: ['pay_id', 'wallet', 'qr_url'] },
  { value: 'pago_movil', label: 'Pago Móvil', icon: '📱', campos: ['banco', 'telefono', 'cedula', 'titular'] },
  { value: 'transferencia', label: 'Transferencia Bancaria', icon: '🏦', campos: ['banco', 'cuenta', 'tipo', 'rif', 'titular'] },
  { value: 'efectivo', label: 'Efectivo USD', icon: '💵', campos: ['contacto'] },
];

const CAMPO_LABELS: Record<string, string> = {
  email: 'Email / Cuenta Zelle',
  titular: 'Nombre del Titular',
  pay_id: 'Binance Pay ID',
  wallet: 'Dirección de Wallet (opcional)',
  qr_url: 'URL del QR (opcional)',
  banco: 'Banco',
  telefono: 'Teléfono (0414-XXXXXXX)',
  cedula: 'Cédula / RIF (V-XXXXXXXX)',
  cuenta: 'Número de Cuenta',
  tipo: 'Tipo de Cuenta (Corriente/Ahorro)',
  rif: 'RIF de la empresa',
  contacto: 'Email de contacto',
};

function MetodoForm({ metodo, onSave, onCancel, isPending }: {
  metodo?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const tipoInicial = metodo?.tipo || 'zelle';
  const tipoConfig = TIPOS_METODO.find(t => t.value === tipoInicial)!;

  const [tipo, setTipo] = useState(tipoInicial);
  const [nombre, setNombre] = useState(metodo?.nombre || tipoConfig.label);
  const [activo, setActivo] = useState(metodo?.activo ?? true);
  const [instrucciones, setInstrucciones] = useState(metodo?.instrucciones || '');
  const [orden, setOrden] = useState(metodo?.orden ?? 0);
  const [datos, setDatos] = useState<Record<string, string>>(metodo?.datos || {});

  const tipoActual = TIPOS_METODO.find(t => t.value === tipo)!;

  const handleTipoChange = (nuevoTipo: string) => {
    const config = TIPOS_METODO.find(t => t.value === nuevoTipo)!;
    setTipo(nuevoTipo);
    setNombre(config.label);
    setDatos({});
  };

  const handleSubmit = () => {
    onSave({
      id: metodo?.id,
      tipo,
      nombre,
      activo,
      datos,
      instrucciones,
      orden,
    });
  };

  return (
    <div className="bg-neutral-900 border border-indigo-500/30 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">{metodo ? 'Editar Método' : 'Nuevo Método de Pago'}</h3>
        <button onClick={onCancel} className="text-neutral-500 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Tipo */}
      {!metodo && (
        <div>
          <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Tipo de Método</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TIPOS_METODO.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTipoChange(t.value)}
                className={`p-3 rounded-xl border text-left text-sm transition-all ${
                  tipo === t.value
                    ? 'bg-indigo-600/15 border-indigo-500 text-white'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <span className="text-lg mr-2">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nombre visible */}
      <div>
        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Nombre visible para clientes</label>
        <input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl h-10 px-3 text-white text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Campos dinámicos del método */}
      <div>
        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Datos del método</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tipoActual.campos.map(campo => (
            <div key={campo}>
              <label className="block text-xs text-neutral-500 mb-1">{CAMPO_LABELS[campo] || campo}</label>
              <input
                value={datos[campo] || ''}
                onChange={e => setDatos(d => ({ ...d, [campo]: e.target.value }))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl h-10 px-3 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Instrucciones */}
      <div>
        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Instrucciones para el cliente</label>
        <textarea
          rows={3}
          value={instrucciones}
          onChange={e => setInstrucciones(e.target.value)}
          placeholder="Ej: Realiza tu pago por Zelle y envía el comprobante..."
          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none resize-none"
        />
      </div>

      {/* Orden y activo */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Orden de aparición</label>
          <input
            type="number"
            value={orden}
            onChange={e => setOrden(Number(e.target.value))}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl h-10 px-3 text-white text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Activo</label>
          <button
            type="button"
            onClick={() => setActivo(!activo)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
              activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-500'
            }`}
          >
            {activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {activo ? 'Activo' : 'Inactivo'}
          </button>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
      >
        {isPending ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
        Guardar Método
      </button>
    </div>
  );
}

export default function AdminMetodosPagoClient({ metodos: metodosProp }: { metodos: any[] }) {
  const [metodos, setMetodos] = useState(metodosProp);
  const [isPending, startTransition] = useTransition();
  const [alerta, setAlerta] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);
  const [editando, setEditando] = useState<any | null>(null); // null = sin editar, false = nuevo
  const [mostrarForm, setMostrarForm] = useState(false);

  const mostrarAlerta = (texto: string, tipo: 'ok' | 'error') => {
    setAlerta({ texto, tipo });
    setTimeout(() => setAlerta(null), 4000);
  };

  const handleSave = (data: any) => {
    startTransition(async () => {
      const res = await upsertMetodoPago(data);
      if (res.success) {
        mostrarAlerta('✅ Método guardado correctamente.', 'ok');
        setEditando(null);
        setMostrarForm(false);
        window.location.reload();
      } else {
        mostrarAlerta(`❌ Error: ${res.error}`, 'error');
      }
    });
  };

  const handleToggle = (id: string, activo: boolean) => {
    startTransition(async () => {
      const res = await toggleMetodoPago(id, !activo);
      if (res.success) {
        setMetodos(m => m.map(x => x.id === id ? { ...x, activo: !activo } : x));
      } else {
        mostrarAlerta(`❌ Error: ${res.error}`, 'error');
      }
    });
  };

  const handleDelete = (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el método "${nombre}"?`)) return;
    startTransition(async () => {
      const res = await eliminarMetodoPago(id);
      if (res.success) {
        setMetodos(m => m.filter(x => x.id !== id));
        mostrarAlerta('Método eliminado.', 'ok');
      } else {
        mostrarAlerta(`❌ Error: ${res.error}`, 'error');
      }
    });
  };

  const tipoConfig = (tipo: string) => TIPOS_METODO.find(t => t.value === tipo);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Métodos de Pago</h1>
          <p className="text-neutral-400 text-sm">Configura los datos de cobro que los clientes verán al pagar su suscripción.</p>
        </div>
        <button
          onClick={() => { setEditando(null); setMostrarForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-colors"
        >
          <Plus size={16} /> Nuevo Método
        </button>
      </header>

      {alerta && (
        <div className={`p-4 rounded-xl border text-sm font-medium flex items-center gap-2 ${
          alerta.tipo === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <AlertCircle size={16} /> {alerta.texto}
        </div>
      )}

      {/* Formulario nuevo */}
      {mostrarForm && !editando && (
        <MetodoForm
          onSave={handleSave}
          onCancel={() => setMostrarForm(false)}
          isPending={isPending}
        />
      )}

      {/* Lista de métodos */}
      <div className="space-y-3">
        {metodos.length === 0 && !mostrarForm && (
          <div className="text-center py-16 text-neutral-500">
            <CreditCard size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay métodos configurados</p>
            <p className="text-sm mt-1 text-neutral-600">Crea tu primer método de pago con el botón de arriba.</p>
          </div>
        )}

        {metodos.map(m => {
          const config = tipoConfig(m.tipo);
          if (editando?.id === m.id) {
            return (
              <MetodoForm
                key={m.id}
                metodo={m}
                onSave={handleSave}
                onCancel={() => setEditando(null)}
                isPending={isPending}
              />
            );
          }
          return (
            <div key={m.id} className={`bg-neutral-900 border rounded-2xl p-5 transition-all ${m.activo ? 'border-neutral-800' : 'border-neutral-800/50 opacity-60'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{config?.icon || '💳'}</div>
                  <div>
                    <p className="font-bold text-white">{m.nombre}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{m.instrucciones || 'Sin instrucciones configuradas'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(m.id, m.activo)}
                    disabled={isPending}
                    title={m.activo ? 'Desactivar' : 'Activar'}
                    className={`p-2 rounded-lg transition-colors ${m.activo ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-neutral-600 hover:bg-neutral-800'}`}
                  >
                    {m.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => setEditando(m)}
                    disabled={isPending}
                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id, m.nombre)}
                    disabled={isPending}
                    className="p-2 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Datos del método */}
              {m.datos && Object.keys(m.datos).length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(m.datos as Record<string, string>).map(([k, v]) => v && (
                    <div key={k}>
                      <p className="text-xs text-neutral-600 font-medium">{CAMPO_LABELS[k] || k}</p>
                      <p className="text-sm text-neutral-300 font-mono">{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
