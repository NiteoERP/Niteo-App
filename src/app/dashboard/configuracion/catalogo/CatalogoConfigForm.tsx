'use client';

import { useState, useTransition } from 'react';
import { updateEmpresaSaaS } from '../actions';
import { 
  Globe, 
  Share2, 
  Phone, 
  ToggleLeft, 
  ToggleRight, 
  Copy, 
  Check, 
  ExternalLink, 
  Save, 
  Loader2, 
  AlertCircle, 
  MessageCircle 
} from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+58',  flag: '🇻🇪', name: 'Venezuela' },
  { code: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: '+1',   flag: '🇺🇸', name: 'Estados Unidos' },
  { code: '+52',  flag: '🇲🇽', name: 'México' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: '+51',  flag: '🇵🇪', name: 'Perú' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+507', flag: '🇵🇦', name: 'Panamá' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '+53',  flag: '🇨🇺', name: 'Cuba' },
  { code: '+1809',flag: '🇩🇴', name: 'Rep. Dominicana' },
  { code: '+34',  flag: '🇪🇸', name: 'España' },
];

interface CatalogoConfigFormProps {
  empresa: {
    id: string;
    slug_catalogo: string | null;
    catalogo_activo: boolean | null;
    whatsapp_catalogo: string | null;
  };
}

export default function CatalogoConfigForm({ empresa }: CatalogoConfigFormProps) {
  const parsePhone = (full: string) => {
    for (const c of COUNTRY_CODES) {
      if (full?.startsWith(c.code)) {
        return { prefix: c.code, number: full.slice(c.code.length).trim() };
      }
    }
    return { prefix: '+58', number: full || '' };
  };

  const parsed = parsePhone(empresa.whatsapp_catalogo || '');
  const [catalogoActivo, setCatalogoActivo] = useState(empresa.catalogo_activo ?? false);
  const [phonePrefix, setPhonePrefix] = useState(parsed.prefix);
  const [phoneNumber, setPhoneNumber] = useState(parsed.number);
  const [copied, setCopied] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const catalogUrl = typeof window !== 'undefined' && empresa.slug_catalogo
    ? `${window.location.origin}/catalogo/${empresa.slug_catalogo}`
    : `/catalogo/${empresa.slug_catalogo || ''}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(catalogUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const fullPhone = phoneNumber.trim() ? `${phonePrefix}${phoneNumber.trim()}` : '';

    startTransition(async () => {
      const res = await updateEmpresaSaaS(empresa.id, {
        catalogo_activo: catalogoActivo,
        whatsapp_catalogo: fullPhone,
      });

      if (!res.success) {
        setError('Error al guardar: ' + res.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3500);
      }
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
          <Check size={18} className="shrink-0" />
          <span>Configuración del catálogo online actualizada.</span>
        </div>
      )}

      <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="border-b border-neutral-800/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Publicación del Catálogo</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Comparte tus productos mediante un enlace público para que los clientes hagan pedidos directos.
              </p>
            </div>
          </div>
        </div>

        {/* Toggle Activar/Desactivar */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-neutral-900/60">
          <div>
            <p className="text-sm font-semibold text-white">Estado del Catálogo Online</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {catalogoActivo 
                ? 'El catálogo está público y accesible para cualquier persona con el link.'
                : 'El catálogo está desactivado y no visible para clientes externos.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCatalogoActivo(!catalogoActivo)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
              catalogoActivo
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            {catalogoActivo ? (
              <>
                <ToggleRight size={18} className="text-emerald-400" />
                <span>Activo</span>
              </>
            ) : (
              <>
                <ToggleLeft size={18} className="text-neutral-500" />
                <span>Inactivo</span>
              </>
            )}
          </button>
        </div>

        {/* Enlace Público */}
        {empresa.slug_catalogo && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Enlace Web de tu Catálogo
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-400 font-mono truncate">
                /catalogo/<span className="text-emerald-400 font-bold">{empresa.slug_catalogo}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 text-white text-xs font-semibold rounded-xl transition-all"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
                {catalogoActivo && (
                  <a
                    href={catalogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-xs font-semibold rounded-xl transition-all"
                  >
                    <ExternalLink size={14} />
                    <span>Ver</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp para Recepción de Pedidos */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <MessageCircle size={14} className="text-emerald-400" />
            WhatsApp de Recepción de Pedidos
          </label>
          <div className="flex items-center gap-2 max-w-lg">
            <select
              value={phonePrefix}
              onChange={(e) => setPhonePrefix(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors cursor-pointer shrink-0"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.name})
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 w-3.5 h-3.5 pointer-events-none" />
              <input
                type="tel"
                placeholder="4121234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>
          <p className="text-[11px] text-neutral-500">
            Los clientes enviarán el pedido con el listado de productos directamente a este chat de WhatsApp.
          </p>
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Catálogo</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
