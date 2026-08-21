'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getInsumos, getTasaDelDia } from '@/actions/compras-actions';
import { registrarFacturaInsumos } from '@/actions/compras-actions';
import { Loader2, CheckCircle2, ShoppingCart, Search, Plus, Trash2, Building2 } from 'lucide-react';

type Insumo = {
  id: string;
  nombre: string;
  unidad_medida: string;
};

type CartItem = {
  id: string; // temp id for UI
  insumo_id: string | null;
  is_new: boolean;
  nombre_nuevo: string;
  unidad_nueva: string;
  cantidad: number;
  costoTotal: number;
  monedaItem: 'USD' | 'VES';
};

export default function MobileCompraForm() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [tasaDelDia, setTasaDelDia] = useState<number>(36.5);
  
  // Header
  const [proveedor, setProveedor] = useState('');
  const [monedaGlobal, setMonedaGlobal] = useState<'USD'|'VES'>('USD');
  
  // Add Item Form
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [isNewInsumo, setIsNewInsumo] = useState(false);
  const [newInsumoName, setNewInsumoName] = useState('');
  const [newInsumoUnit, setNewInsumoUnit] = useState('KG');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [cantidad, setCantidad] = useState('');
  const [costo, setCosto] = useState('');
  const [tipoCosto, setTipoCosto] = useState<'total' | 'unitario'>('total');
  const [monedaInput, setMonedaInput] = useState<'USD'|'VES'>('USD');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const initData = async () => {
      const [data, tasa] = await Promise.all([getInsumos(), getTasaDelDia()]);
      setInsumos(data);
      setTasaDelDia(tasa);
    };
    initData();
  }, []);

  const filteredInsumos = insumos.filter(i => 
    i.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const exactMatchExists = insumos.some(i => i.nombre.toLowerCase() === searchTerm.toLowerCase().trim());

  const handleAddToCart = () => {
    if (!cantidad || !costo) return;
    if (isNewInsumo && !newInsumoName) return;
    if (!isNewInsumo && !selectedInsumo) return;

    const c = parseFloat(costo);
    const qty = parseFloat(cantidad);
    const finalCostoTotal = tipoCosto === 'total' ? c : c * qty;

    const newItem: CartItem = {
      id: Math.random().toString(),
      insumo_id: isNewInsumo ? null : selectedInsumo!.id,
      is_new: isNewInsumo,
      nombre_nuevo: isNewInsumo ? newInsumoName : selectedInsumo!.nombre,
      unidad_nueva: isNewInsumo ? newInsumoUnit : selectedInsumo!.unidad_medida,
      cantidad: qty,
      costoTotal: finalCostoTotal,
      monedaItem: monedaInput
    };

    setCart([...cart, newItem]);

    // Reset add form
    setSearchTerm('');
    setSelectedInsumo(null);
    setIsNewInsumo(false);
    setNewInsumoName('');
    setCantidad('');
    setCosto('');
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleRegistrarFactura = () => {
    if (cart.length === 0) return;
    setErrorMsg('');
    
    startTransition(async () => {
      // Normalizamos todo a la moneda global elegida o se lo pasamos y que el server asuma que cada item es de esa moneda
      // Wait, let's normalize everything to the item's declared currency here so we only send the cost in the Global currency
      const normalizedItems = cart.map(item => {
        let costoUSD = item.costoTotal;
        if (item.monedaItem === 'VES') costoUSD = item.costoTotal / tasaDelDia;
        else costoUSD = item.costoTotal;

        // Convert back to Global if needed
        let finalCosto = costoUSD;
        if (monedaGlobal === 'VES') finalCosto = costoUSD * tasaDelDia;

        return {
          ...item,
          costoTotal: finalCosto
        };
      });

      const res = await registrarFacturaInsumos({
        proveedor: proveedor || 'Proveedor General',
        moneda: monedaGlobal,
        tasa: tasaDelDia,
        items: normalizedItems
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccess(true);
        setCart([]);
        setProveedor('');
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };

  const getTotalGlobal = () => {
    let usd = 0;
    cart.forEach(item => {
      if (item.monedaItem === 'USD') usd += item.costoTotal;
      else usd += item.costoTotal / tasaDelDia;
    });
    if (monedaGlobal === 'USD') return usd.toFixed(2);
    return (usd * tasaDelDia).toFixed(2);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-8 max-w-2xl mx-auto shadow-2xl relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-500/30">
            <ShoppingCart className="text-indigo-400" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Factura de Compra</h2>
        </div>
        <div className="bg-neutral-950 px-4 py-2 rounded-xl border border-neutral-800 flex items-center gap-2">
          <span className="text-neutral-400 text-sm">Tasa BCV:</span>
          <span className="text-emerald-400 font-bold">{tasaDelDia.toFixed(2)} Bs</span>
        </div>
      </div>

      {success ? (
        <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Factura Procesada</h3>
          <p className="text-neutral-400 text-center mb-6">Los insumos han ingresado al inventario.</p>
          <button onClick={() => setSuccess(false)} className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2 rounded-xl font-medium">
            Nueva Compra
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Factura Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/50">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Proveedor / Tienda</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input 
                  type="text" 
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  placeholder="Ej. Distribuidora XYZ"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Medio / Moneda de Pago</label>
              <select 
                value={monedaGlobal}
                onChange={(e) => setMonedaGlobal(e.target.value as 'USD'|'VES')}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
              >
                <option value="USD">DÃ³lares (USD)</option>
                <option value="VES">BolÃ­vares (VES)</option>
              </select>
            </div>
          </div>

          <hr className="border-neutral-800" />

          {/* Add Item Form */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Agregar Insumos</h3>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Insumo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-neutral-500" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar insumo..."
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500"
                  value={searchTerm}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                    setSelectedInsumo(null);
                    setIsNewInsumo(false);
                  }}
                />
              </div>

              {/* Autocomplete Dropdown */}
              {isDropdownOpen && searchTerm && !selectedInsumo && !isNewInsumo && (
                <div className="absolute z-10 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {filteredInsumos.map(ins => (
                    <button
                      key={ins.id}
                      onClick={() => {
                        setSelectedInsumo(ins);
                        setSearchTerm(ins.nombre);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-white hover:bg-neutral-700 flex justify-between items-center"
                    >
                      <span>{ins.nombre}</span>
                      <span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-1 rounded">{ins.unidad_medida}</span>
                    </button>
                  ))}

                  {/* Option to create new */}
                  {!exactMatchExists && searchTerm.length > 1 && (
                    <button
                      onClick={() => {
                        setIsNewInsumo(true);
                        setNewInsumoName(searchTerm);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-indigo-400 hover:bg-neutral-700 border-t border-neutral-700 flex items-center gap-2"
                    >
                      <Plus size={16} /> Crear nuevo "{searchTerm}"
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* If New Insumo */}
            {isNewInsumo && (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 animate-in fade-in">
                <p className="text-sm text-indigo-300 font-medium mb-3">EstÃ¡s creando un nuevo insumo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Nombre</label>
                    <input 
                      type="text" 
                      value={newInsumoName}
                      onChange={e => setNewInsumoName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Unidad Medida</label>
                    <select 
                      value={newInsumoUnit}
                      onChange={e => setNewInsumoUnit(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="KG">Kilogramos (KG)</option>
                      <option value="LT">Litros (LT)</option>
                      <option value="UND">Unidades (UND)</option>
                      <option value="GR">Gramos (GR)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Cantidad</label>
                <input 
                  type="number" 
                  min="0.01" step="0.01"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-neutral-400">
                    {tipoCosto === 'total' ? 'Costo Total' : 'Costo Unit.'}
                  </label>
                  <button 
                    type="button"
                    onClick={() => setTipoCosto(tipoCosto === 'total' ? 'unitario' : 'total')}
                    className="text-[10px] bg-neutral-800 text-neutral-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    Usar {tipoCosto === 'total' ? 'Unitario' : 'Total'}
                  </button>
                </div>
                <input 
                  type="number" 
                  min="0.01" step="0.01"
                  value={costo}
                  onChange={e => setCosto(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Moneda</label>
                <select 
                  value={monedaInput}
                  onChange={e => setMonedaInput(e.target.value as 'USD'|'VES')}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white"
                >
                  <option value="USD">$</option>
                  <option value="VES">Bs</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleAddToCart}
              disabled={!cantidad || !costo || (!selectedInsumo && !isNewInsumo)}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus size={18} /> Añadir a la Lista
            </button>
          </div>

          {/* Cart List */}
          {cart.length > 0 && (
            <div className="mt-6">
              <h4 className="text-neutral-400 text-sm mb-3">Insumos en esta factura:</h4>
              <div className="space-y-2 mb-4">
                {cart.map(item => (
                  <div key={item.id} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium text-sm">{item.nombre_nuevo} {item.is_new && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded ml-1">NUEVO</span>}</p>
                      <p className="text-neutral-500 text-xs">{item.cantidad} {item.unidad_nueva} • {item.monedaItem} {item.costoTotal.toFixed(2)} Total <span className="text-[10px] opacity-60">({(item.costoTotal / item.cantidad).toFixed(2)} c/u)</span></p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-rose-400 hover:bg-rose-500/20 p-2 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-xl p-4 flex justify-between items-center mb-6">
                <span className="text-indigo-200 font-medium">Total Factura:</span>
                <span className="text-2xl font-bold text-white">
                  {monedaGlobal === 'USD' ? '$' : 'Bs'} {getTotalGlobal()}
                </span>
              </div>

              <button
                onClick={handleRegistrarFactura}
                disabled={isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-lg"
              >
                {isPending ? <><Loader2 className="animate-spin" /> Procesando...</> : 'Procesar Factura'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


