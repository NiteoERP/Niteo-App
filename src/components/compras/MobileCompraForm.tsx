'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getInsumos, getTasaDelDia, registrarFacturaInsumos, getComprasMetodosPago, addCompraMetodoPago, getTiendasFrecuentes } from '@/actions/compras-actions';
import { Loader2, CheckCircle2, ShoppingCart, Search, Plus, Trash2, Building2, Camera } from 'lucide-react';
import CreatableSelect from 'react-select/creatable';

type Insumo = {
  id: string;
  nombre: string;
  unidad_medida: string;
};

type CartItem = {
  id: string;
  insumo_id: string | null;
  is_new: boolean;
  nombre_nuevo: string;
  unidad_nueva: string;
  cantidad: number;
  unidad_compra: string;
  factor_compra: number;
  cantidad_base: number;
  costoTotal: number;
  monedaItem: 'USD' | 'VES';
};

export default function MobileCompraForm() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [tasaDelDia, setTasaDelDia] = useState<number>(36.5);

  // ── Cabecera de factura ──────────────────────────────────────────────────
  const [proveedor, setProveedor] = useState('');
  const [monedaGlobal, setMonedaGlobal] = useState<'USD' | 'VES'>('USD');
  const [metodoPago, setMetodoPago] = useState('Efectivo USD');
  const [montoAbonado, setMontoAbonado] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [descuento, setDescuento] = useState('');
  const [iva, setIva] = useState('');

  // ── Métodos de pago y tiendas frecuentes ────────────────────────────────
  const [dbMetodos, setDbMetodos] = useState<any[]>([]);
  const [tiendasFrecuentes, setTiendasFrecuentes] = useState<string[]>([]);

  // ── Escaneo con IA ───────────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleScanInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Str = (reader.result as string).split(',')[1];
        const { scanInvoice } = await import('@/actions/ai-actions');

        // Le pasamos el inventario completo para que la IA lo compare
        const invContext = insumos.map(i => ({ id: i.id, nombre: i.nombre, unidad_medida: i.unidad_medida }));
        const res = await scanInvoice(base64Str, file.type, invContext);

        if (res.error) {
          alert(res.error);
        } else if (res.data) {
          const d = res.data;

          // Rellenar cabecera con lo que la IA detectó
          if (d.moneda === 'VES' || d.moneda === 'USD') setMonedaGlobal(d.moneda);
          if (d.proveedor_nombre && d.proveedor_nombre !== 'Desconocido') setProveedor(d.proveedor_nombre);
          if (d.descuento_total) setDescuento(d.descuento_total.toString());
          if (d.monto_iva) setIva(d.monto_iva.toString());

          // Construir los items del carrito a partir de lo que la IA extrajo.
          // Si la IA no encontró match en el inventario (is_new=true), el item
          // se marcará como NUEVO y el usuario puede editarlo antes de guardar.
          const newCart: CartItem[] = (d.items || []).map((item: any, i: number) => {
            const isNew = !item.insumo_id_recomendado;
            const factor = item.es_bulto ? (item.unidades_por_bulto_estimado || 1) : 1;
            const qty = item.cantidad || 1;
            const costo = item.precio_total ?? ((item.precio_unitario ?? 0) * qty);
            return {
              id: Date.now().toString() + i,
              insumo_id: item.insumo_id_recomendado || null,
              is_new: isNew,
              // Si el nombre está marcado como ilegible, lo dejamos en blanco
              // para que aparezca el badge rojo y el usuario lo complete
              nombre_nuevo: isNew ? (item.nombre_original_factura || '') : '',
              unidad_nueva: isNew ? (item.es_bulto ? 'Bulto' : (item.unidad_medida_sugerida || 'Unidad')) : '',
              cantidad: qty,
              unidad_compra: item.es_bulto ? 'Bulto' : 'Unidad',
              factor_compra: factor,
              cantidad_base: qty * factor,
              costoTotal: costo,
              monedaItem: d.moneda,
            };
          });

          setCart(prev => [...prev, ...newCart]);
        }
        setIsScanning(false);
        // Resetear el input para que el usuario pueda escanear otra foto
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error en escaneo IA:', err);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const fetchM = async () => {
      const [resMetodos, resTiendas] = await Promise.all([
        getComprasMetodosPago(),
        getTiendasFrecuentes(),
      ]);
      if (resMetodos.success && resMetodos.data) setDbMetodos(resMetodos.data);
      if (resTiendas.success && resTiendas.data) setTiendasFrecuentes(resTiendas.data);
    };
    fetchM();
  }, []);

  useEffect(() => {
    const initData = async () => {
      const [data, tasa] = await Promise.all([getInsumos(), getTasaDelDia()]);
      setInsumos(data);
      setTasaDelDia(tasa);
    };
    initData();
  }, []);

  const metodosDisponibles = dbMetodos.length > 0
    ? dbMetodos.map(m => m.nombre)
    : ['Efectivo USD', 'Efectivo Bs', 'Pago Móvil', 'Zelle', 'Punto de Venta'];

  // ── Formulario de ítem individual ────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [isNewInsumo, setIsNewInsumo] = useState(false);
  const [newInsumoName, setNewInsumoName] = useState('');
  const [newInsumoUnit, setNewInsumoUnit] = useState('Kg');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [unidadCompra, setUnidadCompra] = useState('Und');
  const [factorCompra, setFactorCompra] = useState('1');

  const filteredInsumos = insumos.filter(i =>
    i.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const exactMatchExists = insumos.some(
    i => i.nombre.toLowerCase() === searchTerm.toLowerCase().trim()
  );

  const handleCantidadChange = (val: string) => {
    setCantidad(val);
    const c = parseFloat(val);
    const cu = parseFloat(costoUnitario);
    if (!isNaN(c) && !isNaN(cu) && c > 0) setCostoTotal((c * cu).toFixed(2));
  };

  const handleCostoUnitarioChange = (val: string) => {
    setCostoUnitario(val);
    const c = parseFloat(cantidad);
    const cu = parseFloat(val);
    if (!isNaN(c) && !isNaN(cu) && c > 0) setCostoTotal((c * cu).toFixed(2));
  };

  const handleCostoTotalChange = (val: string) => {
    setCostoTotal(val);
    const c = parseFloat(cantidad);
    const ct = parseFloat(val);
    if (!isNaN(c) && !isNaN(ct) && c > 0) setCostoUnitario((ct / c).toFixed(2));
  };

  // ── Carrito ──────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddToCart = () => {
    if (!cantidad || !costoTotal || (!selectedInsumo && !isNewInsumo)) {
      setErrorMsg('Por favor completa la cantidad, el costo total y selecciona un insumo.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    if (isNewInsumo && !newInsumoName) return;

    const finalCostoTotal = parseFloat(costoTotal);
    const qty = parseFloat(cantidad);
    const factor = parseFloat(factorCompra) || 1;
    const baseUnit = isNewInsumo ? newInsumoUnit : selectedInsumo!.unidad_medida;

    const newItem: CartItem = {
      id: Math.random().toString(),
      insumo_id: isNewInsumo ? null : selectedInsumo!.id,
      is_new: isNewInsumo,
      nombre_nuevo: isNewInsumo ? newInsumoName : selectedInsumo!.nombre,
      unidad_nueva: baseUnit,
      cantidad: qty,
      unidad_compra: unidadCompra === 'Base' ? baseUnit : unidadCompra,
      factor_compra: factor,
      cantidad_base: qty * factor,
      costoTotal: finalCostoTotal,
      monedaItem: monedaGlobal,
    };

    setCart([...cart, newItem]);

    // Limpiar formulario de ítem
    setSearchTerm('');
    setSelectedInsumo(null);
    setIsNewInsumo(false);
    setCantidad('');
    setCostoUnitario('');
    setCostoTotal('');
    setFactorCompra('1');
    setUnidadCompra('Und');
  };

  const removeFromCart = (id: string) => setCart(cart.filter(item => item.id !== id));

  // Calcula el total global aplicando descuento e IVA
  const getTotalGlobal = () => {
    let usd = 0;
    cart.forEach(item => {
      if (item.monedaItem === 'USD') usd += item.costoTotal;
      else usd += item.costoTotal / tasaDelDia;
    });
    const base = monedaGlobal === 'USD' ? usd : usd * tasaDelDia;
    return (base - (Number(descuento) || 0) + (Number(iva) || 0)).toFixed(2);
  };

  const handleRegistrarFactura = () => {
    if (cart.length === 0) return;
    setErrorMsg('');

    startTransition(async () => {
      // Normalizar costos a la moneda global antes de enviar al servidor
      const normalizedItems = cart.map(item => {
        let costoUSD = item.monedaItem === 'VES'
          ? item.costoTotal / tasaDelDia
          : item.costoTotal;
        const finalCosto = monedaGlobal === 'VES' ? costoUSD * tasaDelDia : costoUSD;
        return { ...item, costoTotal: finalCosto, cantidad: item.cantidad_base };
      });

      const res = await registrarFacturaInsumos({
        proveedor: proveedor || 'Proveedor General',
        moneda: monedaGlobal,
        tasa: tasaDelDia,
        metodo_pago: metodoPago,
        descripcion: descripcion,
        es_compra_rapida: true,
        descuento: Number(descuento) || 0,
        iva: Number(iva) || 0,
        items: normalizedItems,
      } as any);

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccess(true);
        setCart([]);
        setProveedor('');
        setDescripcion('');
        setDescuento('');
        setIva('');
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };

  // ── Estilos reutilizables para CreatableSelect ───────────────────────────
  const selectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: '#171717',
      borderColor: '#262626',
      borderRadius: '0.75rem',
      padding: '2px',
      color: 'white',
      boxShadow: 'none',
      '&:hover': { borderColor: '#4F46E5' },
    }),
    singleValue: (base: any) => ({ ...base, color: 'white' }),
    input: (base: any) => ({ ...base, color: 'white' }),
    menu: (base: any) => ({ ...base, backgroundColor: '#171717', border: '1px solid #262626', zIndex: 50 }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? '#262626' : '#171717',
      color: 'white',
      '&:active': { backgroundColor: '#4F46E5' },
    }),
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-8 max-w-4xl mx-auto shadow-2xl relative">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-500/30">
            <ShoppingCart className="text-indigo-400" size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Factura de Compra</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Input oculto para seleccionar imagen */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleScanInvoice}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-3 py-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
            title="Autocompletar con Foto (IA)"
          >
            {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            <span className="hidden sm:inline font-medium text-sm">
              {isScanning ? 'Analizando...' : 'Escanear Foto'}
            </span>
          </button>
        </div>
      </div>

      {/* Vista de éxito */}
      {success ? (
        <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Factura Procesada</h3>
          <p className="text-neutral-400 text-center mb-6">Los insumos han ingresado al inventario.</p>
          <button
            onClick={() => setSuccess(false)}
            className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-2 rounded-xl font-medium"
          >
            Nueva Compra
          </button>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Error global */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-sm">
              {errorMsg}
            </div>
          )}

          {/* ── Cabecera de la factura ───────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/50">
            <div className="sm:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-400 mb-1">
                <Building2 size={16} className="text-neutral-500" /> Proveedor / Tienda
              </label>
              <CreatableSelect
                options={tiendasFrecuentes.map(t => ({ value: t, label: t }))}
                value={proveedor ? { value: proveedor, label: proveedor } : null}
                onChange={(s) => setProveedor(s ? s.value : '')}
                formatCreateLabel={(val) => `Usar "${val}"`}
                placeholder="Escribe o selecciona..."
                styles={selectStyles}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Concepto / Descripción (Opcional)
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Compra semanal..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-400 mb-1">Moneda Global</label>
              <select
                value={monedaGlobal}
                onChange={(e) => setMonedaGlobal(e.target.value as 'USD' | 'VES')}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500"
              >
                <option value="USD">USD</option>
                <option value="VES">VES</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-400 mb-1">Método de Pago</label>
              <CreatableSelect
                options={metodosDisponibles.map(m => ({ value: m, label: m }))}
                value={{ value: metodoPago, label: metodoPago }}
                onChange={(s) => setMetodoPago(s ? s.value : '')}
                onCreateOption={async (val) => {
                  const res = await addCompraMetodoPago(val);
                  if (res.success && res.data) {
                    setDbMetodos([...dbMetodos, res.data]);
                    setMetodoPago(res.data.nombre);
                  }
                }}
                placeholder="Selecciona o crea..."
                styles={selectStyles}
              />
            </div>
          </div>

          <hr className="border-neutral-800" />

          {/* ── Formulario para agregar ítem ─────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Agregar Insumos</h3>

            {/* Buscador de insumos con autocomplete */}
            <div className="relative">
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

              {/* Dropdown de sugerencias */}
              {isDropdownOpen && searchTerm && !selectedInsumo && !isNewInsumo && (
                <div className="absolute z-10 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {filteredInsumos.map(ins => (
                    <button
                      key={ins.id}
                      onClick={() => {
                        setSelectedInsumo(ins);
                        setSearchTerm(ins.nombre);
                        setIsDropdownOpen(false);
                        setUnidadCompra('Base');
                        setFactorCompra('1');
                      }}
                      className="w-full text-left px-4 py-3 text-white hover:bg-neutral-700 flex justify-between items-center"
                    >
                      <span>{ins.nombre}</span>
                      <span className="text-xs text-neutral-400 bg-neutral-900 px-2 py-1 rounded">
                        {ins.unidad_medida}
                      </span>
                    </button>
                  ))}

                  {/* Opción de crear nuevo */}
                  {!exactMatchExists && searchTerm.length > 1 && (
                    <button
                      onClick={() => {
                        setIsNewInsumo(true);
                        setNewInsumoName(searchTerm);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-indigo-400 hover:bg-neutral-700 border-t border-neutral-700 flex items-center gap-2"
                    >
                      <Plus size={16} /> Crear nuevo &ldquo;{searchTerm}&rdquo;
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Formulario de nuevo insumo */}
            {isNewInsumo && (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 animate-in fade-in">
                <p className="text-sm text-indigo-300 font-medium mb-3">Estás creando un nuevo insumo</p>
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
                      <option value="Kg">Kilogramos (Kg)</option>
                      <option value="Gr">Gramos (Gr)</option>
                      <option value="Lt">Litros (Lt)</option>
                      <option value="Ml">Mililitros (Ml)</option>
                      <option value="Und">Unidades (Und)</option>
                      <option value="Paquetes">Paquetes</option>
                      <option value="Cajas">Cajas</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Selector de unidad de compra (bulto, caja, etc.) */}
            {(selectedInsumo || isNewInsumo) && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1">Unidad Compra</label>
                    <select
                      value={unidadCompra}
                      onChange={e => setUnidadCompra(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500"
                    >
                      <option value="Base">
                        {isNewInsumo ? newInsumoUnit : selectedInsumo?.unidad_medida} (Und. Base)
                      </option>
                      <option value="Bulto">Bulto</option>
                      <option value="Caja">Caja</option>
                      <option value="Paquete">Paquete</option>
                      <option value="Saco">Saco</option>
                      <option value="Galon">Galón</option>
                    </select>
                  </div>
                  {unidadCompra !== 'Base' && (
                    <div className="animate-in fade-in flex flex-col justify-end">
                      <label className="block text-[13px] font-medium text-indigo-400 mb-1 truncate">
                        ¿Cuántos {isNewInsumo ? newInsumoUnit : selectedInsumo?.unidad_medida} trae?
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={factorCompra}
                        onChange={e => setFactorCompra(e.target.value)}
                        className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
                {unidadCompra !== 'Base' && parseFloat(factorCompra) > 0 && parseFloat(cantidad) > 0 && (
                  <p className="mt-3 text-xs text-indigo-300 bg-indigo-500/10 p-2 rounded-lg">
                    El sistema sumará{' '}
                    <strong>
                      {(parseFloat(cantidad) * parseFloat(factorCompra)).toFixed(2)}{' '}
                      {isNewInsumo ? newInsumoUnit : selectedInsumo?.unidad_medida}
                    </strong>{' '}
                    a tu inventario.
                  </p>
                )}
              </div>
            )}

            {/* Cantidad y costos */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={cantidad}
                    onChange={e => handleCantidadChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Costo Unit.</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={costoUnitario}
                    onChange={e => handleCostoUnitarioChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Costo Total</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={costoTotal}
                    onChange={e => handleCostoTotalChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Moneda</label>
                  <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-neutral-500 cursor-not-allowed">
                    {monedaGlobal === 'USD' ? '$ USD' : 'Bs VES'}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Añadir a la Lista
            </button>
          </div>

          {/* ── Carrito ──────────────────────────────────────────────────── */}
          {cart.length > 0 && (
            <div className="mt-6">
              <h4 className="text-neutral-400 text-sm mb-3">Insumos en esta factura:</h4>
              <div className="space-y-2 mb-4">
                {cart.map(item => (
                  <div
                    key={item.id}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-white font-medium text-sm flex items-center gap-1.5">
                        {/* Badge NUEVO si el insumo no existía en inventario */}
                        {item.is_new && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">
                            NUEVO
                          </span>
                        )}
                        {/* Badge rojo si la IA no pudo leer el nombre */}
                        {(!item.nombre_nuevo || item.nombre_nuevo.includes('Ilegible')) ? (
                          <span className="text-rose-400 text-xs border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 rounded">
                            ⚠️ Nombre no identificado — edita antes de guardar
                          </span>
                        ) : (
                          item.nombre_nuevo
                        )}
                      </p>
                      <p className="text-neutral-500 text-xs">
                        {item.cantidad} {item.unidad_compra}
                        {item.unidad_compra !== item.unidad_nueva &&
                          ` (Ingresa: ${item.cantidad_base.toFixed(2)} ${item.unidad_nueva}) `}
                        {' '}•{' '}
                        {/* Badge rojo si el precio fue ilegible (costoTotal = 0) */}
                        {item.costoTotal > 0 ? (
                          <>{item.monedaItem} {item.costoTotal.toFixed(2)} Total{' '}
                            <span className="text-[10px] opacity-60">
                              ({(item.costoTotal / (item.cantidad_base || 1)).toFixed(2)} c/{item.unidad_nueva})
                            </span>
                          </>
                        ) : (
                          <span className="text-rose-400 text-xs border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 rounded">
                            ⚠️ Precio ilegible — completa manualmente
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-rose-400 hover:bg-rose-500/20 p-2 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* ── Resumen: subtotal, descuento, IVA, total ──────────── */}
              <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-xl p-4 flex flex-col gap-3 mb-6">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-indigo-200/70">Subtotal Items:</span>
                  <span className="text-white">
                    {monedaGlobal === 'USD' ? '$' : 'Bs'}{' '}
                    {cart
                      .reduce((acc, i) => {
                        const val =
                          i.monedaItem === monedaGlobal
                            ? i.costoTotal
                            : monedaGlobal === 'USD'
                            ? i.costoTotal / tasaDelDia
                            : i.costoTotal * tasaDelDia;
                        return acc + val;
                      }, 0)
                      .toFixed(2)}
                  </span>
                </div>

                {/* Descuento */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-indigo-200/70">Descuento:</span>
                  <div className="flex items-center gap-1 w-28">
                    <span className="text-neutral-500 text-xs">{monedaGlobal === 'VES' ? 'Bs.' : '$'}</span>
                    <input
                      type="number"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-right text-rose-400 focus:border-indigo-500 outline-none"
                      value={descuento}
                      onChange={e => setDescuento(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* IVA */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-indigo-200/70">IVA / Impuestos:</span>
                  <div className="flex items-center gap-1 w-28">
                    <span className="text-neutral-500 text-xs">{monedaGlobal === 'VES' ? 'Bs.' : '$'}</span>
                    <input
                      type="number"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-right text-amber-400 focus:border-indigo-500 outline-none"
                      value={iva}
                      onChange={e => setIva(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="h-px bg-indigo-500/20 w-full" />

                {/* Total final */}
                <div className="flex justify-between items-center">
                  <span className="text-indigo-200 font-medium">Total a Pagar:</span>
                  <span className="text-2xl font-bold text-white">
                    {monedaGlobal === 'USD' ? '$' : 'Bs'} {getTotalGlobal()}
                  </span>
                </div>
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
