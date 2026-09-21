'use client';

import { useState, useTransition } from 'react';
import { updateEmpresaSaaS } from './actions';
import { Building2, Save, Loader2, AlertCircle, Globe, DollarSign, Calculator, Package, FlaskConical, Info, X, Share2, Phone, ToggleLeft, ToggleRight, Copy, Check, ExternalLink } from 'lucide-react';

// Prefijos telefónicos por país (prioritario Venezuela)
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
  { code: '+1809',flag: '🇩🇴', name: 'República Dominicana' },
  { code: '+34',  flag: '🇪🇸', name: 'España' },
  { code: '+44',  flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+55',  flag: '🇧🇷', name: 'Brasil' },
  { code: '+49',  flag: '🇩🇪', name: 'Alemania' },
  { code: '+33',  flag: '🇫🇷', name: 'Francia' },
];

export default function SettingsForm({ empresa }: { empresa: any }) {
  const initialMetodos: string[] = Array.isArray(empresa.metodos_pago) ? empresa.metodos_pago : [];
  const hasCortesia = initialMetodos.some(m => m.toLowerCase().includes('cortes'));
  const standardizedMetodos = hasCortesia ? initialMetodos : [...initialMetodos, 'Cortesía'];

  const [formData, setFormData] = useState({
    nombre_comercial: empresa.nombre_comercial || '',
    moneda: empresa.moneda || 'USD',
    simbolo_moneda: empresa.simbolo_moneda || '$',
    zona_horaria: empresa.zona_horaria || 'America/Caracas',
    metodo_costeo_despachos: empresa.metodo_costeo_despachos || 'PROMEDIO',
    metodos_pago: standardizedMetodos,
    metodo_costeo_inventario: empresa.metodo_costeo_inventario || 'MOVIL',
    costeo_promedio_n: empresa.costeo_promedio_n || 3,
    // Catálogo público
    catalogo_activo: empresa.catalogo_activo ?? false,
    whatsapp_catalogo: empresa.whatsapp_catalogo || '',
  });

  // Para el campo de teléfono: separar prefijo del número
  const parsePhone = (full: string) => {
    for (const c of COUNTRY_CODES) {
      if (full?.startsWith(c.code)) {
        return { prefix: c.code, number: full.slice(c.code.length).trim() };
      }
    }
    return { prefix: '+58', number: full || '' };
  };
  const parsed = parsePhone(empresa.whatsapp_catalogo || '');
  const [phonePrefix, setPhonePrefix] = useState(parsed.prefix);
  const [phoneNumber, setPhoneNumber] = useState(parsed.number);
  const [copied, setCopied] = useState(false);

  const catalogUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/catalogo/${empresa.slug_catalogo || ''}`
    : `/catalogo/${empresa.slug_catalogo || ''}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(catalogUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    const fullPhone = phoneNumber.trim() ? `${phonePrefix}${phoneNumber.trim()}` : '';
    startTransition(async () => {
      const res = await updateEmpresaSaaS(empresa.id, {
        ...formData,
        whatsapp_catalogo: fullPhone,
      });
      if (!res.success) {
        setError('Error al guardar: ' + res.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };

  const METODO_INFO: Record<string, string> = {
    MOVIL: 'P = (Valor en stock + Valor comprado) / Cantidad total. El costo se recalcula con cada compra.',
    PROMEDIO_N: 'Promedio simple del precio unitario de las últimas N compras registradas.',
    ULTIMO: 'El costo promedio se reemplaza por el precio unitario de la última compra.',
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* --- Perfil general --- */}
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Nombre Comercial</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
              <input type="text" value={formData.nombre_comercial}
                onChange={(e) => setFormData({...formData, nombre_comercial: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Zona Horaria</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
              <select value={formData.zona_horaria} onChange={(e) => setFormData({...formData, zona_horaria: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none">
                <option value="America/Caracas">America/Caracas</option>
                <option value="America/Bogota">America/Bogota</option>
                <option value="America/Lima">America/Lima</option>
                <option value="America/Mexico_City">America/Mexico_City</option>
                <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires</option>
                <option value="America/Santiago">America/Santiago</option>
                <option value="Europe/Madrid">Europe/Madrid</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Moneda Base ISO</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
              <select value={formData.moneda} onChange={(e) => setFormData({...formData, moneda: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none">
                <option value="USD">Dólar Estadounidense (USD)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="COP">Peso Colombiano (COP)</option>
                <option value="MXN">Peso Mexicano (MXN)</option>
                <option value="ARS">Peso Argentino (ARS)</option>
                <option value="CLP">Peso Chileno (CLP)</option>
                <option value="PEN">Sol Peruano (PEN)</option>
                <option value="VES">Bolívar Soberano (VES)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Símbolo de la Moneda</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold w-5 h-5 flex items-center justify-center">S/</span>
              <input type="text" value={formData.simbolo_moneda}
                onChange={(e) => setFormData({...formData, simbolo_moneda: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Método de Costeo (Despachos)</label>
            <div className="relative">
              <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
              <select value={formData.metodo_costeo_despachos} onChange={(e) => setFormData({...formData, metodo_costeo_despachos: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none">
                <option value="PROMEDIO">Costo Promedio Ponderado</option>
                <option value="ULTIMO">Último Costo</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">Métodos de Pago Disponibles</label>
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                   {formData.metodos_pago.map((metodo: string, idx: number) => {
                      const isCortesia = metodo.toLowerCase().includes('cortes') || metodo.toLowerCase().includes('regal');
                      return (
                         <div 
                            key={idx} 
                            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border ${
                               isCortesia 
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                            }`}
                         >
                            <span>{metodo}</span>
                            {isCortesia ? (
                               <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1" title="Método estándar fijo del sistema">
                                  Fijo
                               </span>
                            ) : (
                               <button 
                                  type="button" 
                                  onClick={() => setFormData({...formData, metodos_pago: formData.metodos_pago.filter((_: string, i: number) => i !== idx)})}
                                  className="text-indigo-400 hover:text-red-400 p-0.5 transition-colors"
                                  title="Eliminar método"
                               >
                                  <X size={14} />
                               </button>
                            )}
                         </div>
                      );
                   })}
                </div>
                <div className="flex items-center gap-2 max-w-sm">
                   <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                      <input 
                         type="text" 
                         placeholder="Añadir método (ej. Zelle)"
                         id="nuevoMetodoInput"
                         onKeyDown={e => {
                            if (e.key === 'Enter') {
                               e.preventDefault();
                               const val = e.currentTarget.value.trim();
                               if (val && !formData.metodos_pago.some((m: string) => m.toLowerCase() === val.toLowerCase())) {
                                  setFormData({...formData, metodos_pago: [...formData.metodos_pago, val]});
                                  e.currentTarget.value = '';
                               }
                            }
                         }}
                         className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors" 
                      />
                   </div>
                   <button 
                      type="button"
                      onClick={() => {
                         const input = document.getElementById('nuevoMetodoInput') as HTMLInputElement;
                         const val = input?.value.trim();
                         if (val && !formData.metodos_pago.some((m: string) => m.toLowerCase() === val.toLowerCase())) {
                            setFormData({...formData, metodos_pago: [...formData.metodos_pago, val]});
                            if (input) input.value = '';
                         }
                      }}
                      className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors border border-neutral-700"
                   >
                      Añadir
                   </button>
                </div>
                <p className="text-xs text-neutral-500 mt-3">Presiona <kbd className="bg-neutral-800 border border-neutral-700 px-1 py-0.5 rounded text-[10px]">Enter</kbd> para agregar. Si quieres permitir ventas a crédito, añade <strong>Crédito</strong> a la lista.</p>

                {/* Tarjeta explicativa sobre el método Cortesía / Regalía */}
                <div className="mt-4 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                   <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                   <div className="text-xs space-y-1">
                      <p className="font-semibold text-amber-300">Método Estandarizado: Cortesía / Regalía</p>
                      <p className="text-neutral-400 leading-relaxed">
                         El método <strong>Cortesía</strong> está activo de forma fija en todas las empresas para evitar inconsistencias. Los consumos bonificados al 100% <strong>no se computan en los ingresos percibidos de ventas</strong> ni cierres de caja (dinero real), sino que se auditan de forma exclusiva en el informe de <strong>Mermas y Regalías</strong> con el producto entregado, destinatario, costo unitario y precio venta.
                      </p>
                   </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- NUEVA SECCIÓN: PRODUCTOS → COMPRAS E INVENTARIO --- */}
      <div className="border-t border-neutral-800 pt-7">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Package size={16} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Productos</h3>
            <p className="text-xs text-neutral-500">Compras e Inventario</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
              <FlaskConical size={15} className="text-indigo-400" />
              Método de valoración del costo de inventario
            </label>

            <div className="space-y-3">
              {/* Opción 1: Precio Promedio Móvil */}
              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                formData.metodo_costeo_inventario === 'MOVIL'
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}>
                <input type="radio" name="metodo_costeo" value="MOVIL"
                  checked={formData.metodo_costeo_inventario === 'MOVIL'}
                  onChange={() => setFormData({...formData, metodo_costeo_inventario: 'MOVIL'})}
                  className="mt-0.5 accent-indigo-500" />
                <div>
                  <p className="text-white text-sm font-medium">Precio Promedio Móvil <span className="text-xs text-indigo-400 ml-1">(Recomendado)</span></p>
                  <p className="text-neutral-500 text-xs mt-0.5">P = (Valor en stock + Valor comprado) / Cantidad total — se recalcula con cada compra.</p>
                </div>
              </label>

              {/* Opción 2: Promedio N últimas compras */}
              <div>
                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  formData.metodo_costeo_inventario === 'PROMEDIO_N'
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}>
                  <input type="radio" name="metodo_costeo" value="PROMEDIO_N"
                    checked={formData.metodo_costeo_inventario === 'PROMEDIO_N'}
                    onChange={() => setFormData({...formData, metodo_costeo_inventario: 'PROMEDIO_N'})}
                    className="mt-0.5 accent-indigo-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">Precio Promedio de las últimas N compras</p>
                    <p className="text-neutral-500 text-xs mt-0.5">Promedio simple del precio unitario de las últimas N compras.</p>
                    {formData.metodo_costeo_inventario === 'PROMEDIO_N' && (
                      <div className="mt-3 flex items-center gap-3">
                        <label className="text-xs text-neutral-400 whitespace-nowrap">Número de compras (N):</label>
                        <div className="flex items-center gap-2">
                          {[2, 3, 5, 10].map(n => (
                            <button key={n} type="button"
                              onClick={() => setFormData({...formData, costeo_promedio_n: n})}
                              className={`w-10 h-8 rounded-lg text-sm font-bold transition-all ${
                                formData.costeo_promedio_n === n
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                              }`}>{n}
                            </button>
                          ))}
                          <input type="number" min={1} max={50} value={formData.costeo_promedio_n}
                            onChange={e => setFormData({...formData, costeo_promedio_n: parseInt(e.target.value) || 3})}
                            className="w-16 bg-neutral-950 border border-neutral-700 text-white rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-indigo-500" />
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Opción 3: Último precio */}
              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                formData.metodo_costeo_inventario === 'ULTIMO'
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}>
                <input type="radio" name="metodo_costeo" value="ULTIMO"
                  checked={formData.metodo_costeo_inventario === 'ULTIMO'}
                  onChange={() => setFormData({...formData, metodo_costeo_inventario: 'ULTIMO'})}
                  className="mt-0.5 accent-indigo-500" />
                <div>
                  <p className="text-white text-sm font-medium">Último precio de compra</p>
                  <p className="text-neutral-500 text-xs mt-0.5">El costo promedio se reemplaza por el precio unitario de la compra más reciente.</p>
                </div>
              </label>
            </div>

            {/* Información del método seleccionado */}
            <div className="mt-3 flex items-start gap-2 p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <Info size={14} className="text-neutral-500 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-500">{METODO_INFO[formData.metodo_costeo_inventario]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- SECCIÓN: CATÁLOGO PÚBLICO --- */}
      <div className="border-t border-neutral-800 pt-7">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Share2 size={16} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Catálogo Público</h3>
            <p className="text-xs text-neutral-500">Comparte tu catálogo con clientes sin que inicien sesión</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Toggle activar/desactivar */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-neutral-950">
            <div>
              <p className="text-sm font-medium text-white">Catálogo activo</p>
              <p className="text-xs text-neutral-500 mt-0.5">Cuando está activo, los clientes pueden ver y pedir productos</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, catalogo_activo: !formData.catalogo_activo })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                formData.catalogo_activo
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {formData.catalogo_activo
                ? <><ToggleRight size={18} /> Activo</>
                : <><ToggleLeft size={18} /> Inactivo</>}
            </button>
          </div>

          {/* Link público */}
          {empresa.slug_catalogo && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Link del catálogo</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-neutral-400 font-mono truncate">
                  /catalogo/<span className="text-emerald-400">{empresa.slug_catalogo}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-sm rounded-lg transition-all shrink-0"
                >
                  {copied ? <><Check size={14} className="text-emerald-400" /> Copiado</> : <><Copy size={14} /> Copiar</>}
                </button>
                {formData.catalogo_activo && (
                  <a
                    href={catalogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-sm rounded-lg transition-all shrink-0"
                  >
                    <ExternalLink size={14} /> Ver
                  </a>
                )}
              </div>
            </div>
          )}

          {/* WhatsApp para pedidos */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5 flex items-center gap-2">
              <Phone size={14} className="text-emerald-400" />
              Número para catálogo (WhatsApp)
            </label>
            <p className="text-xs text-neutral-500 mb-2">Los pedidos del catálogo llegarán a este número de WhatsApp</p>
            <div className="flex gap-2">
              {/* Selector de código de país */}
              <select
                value={phonePrefix}
                onChange={(e) => setPhonePrefix(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-white rounded-lg px-2 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shrink-0"
                style={{ minWidth: '140px' }}
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code} {c.name}
                  </option>
                ))}
              </select>
              {/* Número local */}
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="4141234567"
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
            {phoneNumber && (
              <p className="text-xs text-emerald-400/70 mt-1.5">
                Número completo: <span className="font-mono">{phonePrefix}{phoneNumber}</span>
              </p>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
            <Info size={14} className="text-neutral-500 shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-500">
              Solo se mostrarán los productos con <strong className="text-neutral-400">estado activo</strong> y que tengan <strong className="text-neutral-400">existencia en inventario</strong>. Los cambios se reflejan en tiempo real.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
      
      {success && (
        <p className="text-emerald-400 text-sm font-medium">¡Configuración guardada exitosamente! Recarga la página para aplicar la zona horaria en los reportes.</p>
      )}

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={isPending}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20">
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar Configuración
        </button>
      </div>
    </form>
  );
}
