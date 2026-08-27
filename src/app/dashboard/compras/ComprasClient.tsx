'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, FileText, Plus, Trash2, Save, ShoppingCart, UserPlus, Loader2, CheckCircle2, History, Search, Calendar, Edit2, X, Lock, Package } from 'lucide-react';
import { getProveedoresYProductos, crearProveedor, crearProductoBase, registrarCompraPuntual, registrarFactura, getUltimasCompras, getHistorialCompras, actualizarCompraPuntual, eliminarCompraPuntual, getTasaDelDia, } from './actions';
import MobileCompraForm from '@/components/compras/MobileCompraForm';
import { editarFacturaInsumos } from '@/actions/compras-actions';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import { useLiveTable } from '@/hooks/useLiveTable';

import SedeSelector from "@/components/inventario/SedeSelector";
export default function ComprasClient({ sedes, activeSedeId, profile }: { sedes: any[], activeSedeId: string, profile: any }) {
  const { empresa } = useEmpresa();
  const defaultPaymentMethods = ['Efectivo USD', 'Zelle', 'Pago Móvil', 'Transferencia Bs', 'Punto de Venta'];
  const metodosPago = empresa?.metodos_pago && empresa.metodos_pago.length > 0 ? empresa.metodos_pago : defaultPaymentMethods;

  const [activeTab, setActiveTab] = useState<'insumos' | 'puntual' | 'factura' | 'historial'>('insumos');

  useLiveTable('compras_facturas', () => {
    if (activeTab === 'historial') {
      cargarHistorialCompleto();
    }
  });

  useLiveTable('compras_mercancia', () => {
    if (activeTab === 'puntual') {
      getUltimasCompras().then(res => {
        if (res.success) setUltimasCompras(res.compras || []);
      });
    }
  });
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'factura' || tab === 'insumos' || tab === 'puntual' || tab === 'historial') {
      setActiveTab(tab);
    }
    const prov = params.get('prov');
    if (prov) {
      setFactura(f => ({...f, proveedor: prov}));
    }
  }, []);
  const [isLoadingDatos, setIsLoadingDatos] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

  // --- ESTADO MODAL PROMPT ---
  const [promptModal, setPromptModal] = useState({
    isOpen: false,
    title: '',
    placeholder: '',
    value: '',
    onSubmit: (val: string) => {}
  });

  const openPrompt = (title: string, placeholder: string, onSubmit: (val: string) => void) => {
    setPromptModal({ isOpen: true, title, placeholder, value: '', onSubmit });
  };
  
  const closePrompt = () => {
    setPromptModal(prev => ({...prev, isOpen: false}));
  };

  // Listas desde BD
  const [proveedoresDb, setProveedoresDb] = useState<any[]>([]);
  const [productosDb, setProductosDb] = useState<any[]>([]);
  const [ultimasCompras, setUltimasCompras] = useState<any[]>([]);
  
  // Historial Completo
  const [historialCompleto, setHistorialCompleto] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    fechaInicio: '',
    fechaFin: ''
  });

  // Modal de Edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);

  useEffect(() => {
    cargarDatosGatillo();
  }, []);

  useEffect(() => {
    if (activeTab === 'historial') {
      cargarHistorialCompleto();
    }
  }, [activeTab]);

  const cargarDatosGatillo = async () => {
    const [resListas, resCompras, resTasa] = await Promise.all([
      getProveedoresYProductos(),
      getUltimasCompras(),
      getTasaDelDia()
    ]);

    if (resListas.success) {
      setProveedoresDb(resListas.proveedores || []);
      setProductosDb(resListas.productos || []);
    }
    
    if (resCompras.success) {
      setUltimasCompras(resCompras.compras || []);
    }

    if (resTasa.success && resTasa.tasa > 0) {
      setGasto(prev => ({ ...prev, tasaCambio: resTasa.tasa.toString() }));
    }

    setIsLoadingDatos(false);
  };

  const cargarHistorialCompleto = async () => {
    setIsSearching(true);
    const res = await getHistorialCompras(filtros.busqueda, filtros.fechaInicio, filtros.fechaFin);
    if (res.success) {
      setHistorialCompleto(res.compras || []);
    }
    setIsSearching(false);
  };

  // --- ESTADOS: COMPRA PUNTUAL ---
  const todayStr = new Date().toISOString().split('T')[0];
  const initialGasto = { proveedor: '', montoDivisas: '', montoBs: '', tasaCambio: '', detalles: '', metodoPago: metodosPago[0] || 'Efectivo USD', documentoExterno: '', fechaRegistro: todayStr };
  const [gasto, setGasto] = useState(initialGasto);
  const [monedaGasto, setMonedaGasto] = useState<'USD'|'VES'>('USD');
  
  // Lógica Matemática Bidireccional
  const handleMontoChange = (val: string) => {
    const num = Number(val) || 0;
    const numTasa = Number(gasto.tasaCambio) || 0;
    
    if (monedaGasto === 'USD') {
      const numBs = num * numTasa;
      setGasto({ ...gasto, montoDivisas: val, montoBs: num > 0 ? numBs.toFixed(2) : '' });
    } else {
      const numDiv = numTasa > 0 ? (num / numTasa) : 0;
      setGasto({ ...gasto, montoBs: val, montoDivisas: num > 0 ? numDiv.toFixed(2) : '' });
    }
  };

  const handleMonedaChange = (nuevaMoneda: 'USD' | 'VES') => {
    setMonedaGasto(nuevaMoneda);
  };

  const handleTasaChange = (val: string) => {
    const numTasa = Number(val) || 0;
    if (monedaGasto === 'USD') {
      const numDiv = Number(gasto.montoDivisas) || 0;
      setGasto({ ...gasto, tasaCambio: val, montoBs: numDiv > 0 ? (numDiv * numTasa).toFixed(2) : '' });
    } else {
      const numBs = Number(gasto.montoBs) || 0;
      const numDiv = numTasa > 0 ? (numBs / numTasa) : 0;
      setGasto({ ...gasto, tasaCambio: val, montoDivisas: numBs > 0 ? numDiv.toFixed(2) : '' });
    }
  };

  // --- ESTADOS: FACTURA ---
  const initialFactura = { proveedor: '', nroFactura: '', fechaRegistro: todayStr };
  const [factura, setFactura] = useState(initialFactura);
  const [productos, setProductos] = useState([{ rowId: Date.now(), id_producto: '', cantidad: 1, precio: '', total: '' }]);
  const totalFactura = productos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);

  // Funciones Tabla Factura
  const addProducto = () => setProductos([...productos, { rowId: Date.now(), id_producto: '', cantidad: 1, precio: '', total: '' }]);
  const removeProducto = (rowId: number) => { if (productos.length > 1) setProductos(productos.filter(p => p.rowId !== rowId)); };
  
  const handleProductoChange = (rowId: number, field: string, value: string) => {
    if (field === 'id_producto' && value === 'NEW_PRODUCT') {
      const nombre = prompt('Ingresa el nombre del nuevo producto base:');
      if (nombre && nombre.trim()) {
        setIsSubmitting(true);
        crearProductoBase(nombre.trim()).then(res => {
          if (res.success) {
            setProductosDb(prev => [...prev, res.producto!]);
            mostrarAlerta('Producto creado.', 'success');
            setProductos(prev => prev.map(p => {
              if (p.rowId === rowId) {
                return { ...p, id_producto: res.producto!.id, precio: '0', total: '0' };
              }
              return p;
            }));
          } else {
            mostrarAlerta(res.error, 'error');
          }
          setIsSubmitting(false);
        });
      }
      return;
    }

    setProductos(productos.map(p => {
      if (p.rowId === rowId) {
        let newP = { ...p, [field]: value };
        if (field === 'id_producto') {
          const prodDb = productosDb.find(x => x.id.toString() === value);
          if (prodDb && prodDb.costo) {
            newP.precio = prodDb.costo.toString();
            newP.total = (Number(newP.cantidad) * Number(prodDb.costo)).toString();
          }
        }
        const numVal = Number(value);
        if (field === 'cantidad' || field === 'precio') {
          const qty = field === 'cantidad' ? numVal : Number(newP.cantidad);
          const price = field === 'precio' ? numVal : Number(newP.precio);
          if (!isNaN(qty) && !isNaN(price)) newP.total = (qty * price).toString();
        } else if (field === 'total') {
          const qty = Number(newP.cantidad);
          if (qty > 0 && !isNaN(numVal)) newP.precio = (numVal / qty).toString();
        }
        return newP;
      }
      return p;
    }));
  };

  // Handlers Submits
  const handleRegistrarGasto = async () => {
    if (!gasto.proveedor || !gasto.montoDivisas || !gasto.tasaCambio) {
      mostrarAlerta('Llena los campos obligatorios.', 'error'); return;
    }
    setIsSubmitting(true);
    const res = await registrarCompraPuntual({ ...gasto, url_capture: gasto.documentoExterno });
    if (res.success) {
      mostrarAlerta('Gasto registrado exitosamente.', 'success');
      setGasto(initialGasto);
      const comprasRes = await getUltimasCompras();
      if (comprasRes.success) setUltimasCompras(comprasRes.compras || []);
    } else {
      mostrarAlerta(res.error, 'error');
    }
    setIsSubmitting(false);
  };

  const handleGuardarFactura = async () => {
    if (!factura.proveedor || !factura.nroFactura) {
      mostrarAlerta('Selecciona proveedor y Nro de Factura.', 'error'); return;
    }
    const productosValidos = productos.filter(p => p.id_producto !== '' && Number(p.total) > 0);
    if (productosValidos.length === 0) {
      mostrarAlerta('Debes añadir al menos un producto válido a la factura.', 'error'); return;
    }
    setIsSubmitting(true);
    const res = await registrarFactura(factura.proveedor, factura.nroFactura, productosValidos, factura.fechaRegistro);
    setIsSubmitting(false);
    if (res.success) {
      mostrarAlerta('Factura registrada y costos actualizados.', 'success');
      setFactura(initialFactura);
      setProductos([{ rowId: Date.now(), id_producto: '', cantidad: 1, precio: '', total: '' }]);
    } else {
      mostrarAlerta(res.error, 'error');
    }
  };

  const handleGuardarEdicion = async () => {
    setIsSubmitting(true);
    let res: any;

    if (editingRow.parsed_detalles?.is_insumos) {
      res = await editarFacturaInsumos(editingRow.id, {
        proveedor: editingRow.proveedor,
        moneda: 'USD',
        tasa: editingRow.tasa_cambio,
        metodo_pago: editingRow.metodo_pago || editingRow.modalidad_pago,
        items_viejos: editingRow.parsed_detalles.items,
        items_nuevos: editingRow.edit_items
      });
    } else {
      const payload = {
        comercio_lugar: editingRow.proveedor,
        descripcion_gasto: editingRow.detalles,
        monto_divisas: editingRow.monto_divisas,
        tasa_cambio: editingRow.tasa_cambio,
        modalidad_pago: editingRow.metodo_pago || editingRow.modalidad_pago,
        url_capture: editingRow.id
      };
      res = await actualizarCompraPuntual(editingRow.id, payload);
    }

    setIsSubmitting(false);
    
    if (res.success) {
      mostrarAlerta('Compra actualizada correctamente', 'success');
      setIsEditModalOpen(false);
      cargarHistorialCompleto();
      // Refrescar recuadros recientes si se cambiaron a tab 1 luego
      const comprasRes = await getUltimasCompras();
      if (comprasRes.success) setUltimasCompras(comprasRes.compras || []);
    } else {
      mostrarAlerta(res.error, 'error');
    }
  };

  const handleEliminarCompra = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      const res = await eliminarCompraPuntual(id);
      if (res.success) {
        mostrarAlerta('Registro eliminado', 'success');
        cargarHistorialCompleto();
        const comprasRes = await getUltimasCompras();
        if (comprasRes.success) setUltimasCompras(comprasRes.compras || []);
      } else {
        mostrarAlerta(res.error, 'error');
      }
    }
  };

  const handleCrearProveedorRapido = async () => {
    const nombre = prompt('Ingresa el nombre del nuevo proveedor (y RIF opcional separados por guión):');
    if (nombre && nombre.trim()) {
      setIsSubmitting(true);
      const res = await crearProveedor(nombre.trim());
      if (res.success) {
        setProveedoresDb([...proveedoresDb, res.proveedor]);
        setFactura({...factura, proveedor: res.proveedor?.id?.toString() || ''});
        mostrarAlerta('Proveedor creado.', 'success');
      }
      setIsSubmitting(false);
    }
  };

  const mostrarAlerta = (text: string, type: string) => {
    setAlertMsg({ text, type });
    setTimeout(() => setAlertMsg({ text: '', type: '' }), 4000);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' USD';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* PROMPT MODAL PROPIO */}
      {promptModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-900/50">
              <h3 className="text-lg font-medium text-white">{promptModal.title}</h3>
              <button onClick={closePrompt} className="text-neutral-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <input 
                type="text" 
                autoFocus
                value={promptModal.value} 
                onChange={e => setPromptModal(prev => ({...prev, value: e.target.value}))} 
                onKeyDown={e => {
                  if(e.key === 'Enter') {
                    closePrompt();
                    promptModal.onSubmit(promptModal.value);
                  }
                }}
                placeholder={promptModal.placeholder} 
                className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
              />
              <div className="flex gap-3 mt-8">
                <button onClick={closePrompt} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2.5 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={() => { closePrompt(); promptModal.onSubmit(promptModal.value); }} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition-colors">
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALERTA FLOTANTE */}
      {alertMsg.text && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right text-white font-medium ${alertMsg.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          <CheckCircle2 size={20} /> {alertMsg.text}
        </div>
      )}

      {/* CABECERA Y TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-indigo-400" size={28} />
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Gestión de Compras
            </h1>
          </div>
          <p className="text-neutral-400 text-xs md:text-sm mt-1">Registra gastos, ingresos de mercancía y audita el historial</p></div>{profile?.rol === "MASTER" && activeSedeId && (<div className="mt-4 md:mt-0"><SedeSelector sedes={sedes} activeSedeId={activeSedeId} /></div>)}

        <div className="flex p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto hide-scrollbar max-w-full">
          <button onClick={() => setActiveTab('insumos')} className={`flex items-center whitespace-nowrap gap-2 px-4 h-14 rounded-lg text-sm font-medium transition-all ${activeTab === 'insumos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-200'}`}>
            <Package size={16} /> Compra Insumos (Móvil)
          </button>
          <button onClick={() => setActiveTab('puntual')} className={`flex items-center whitespace-nowrap gap-2 px-4 h-14 rounded-lg text-sm font-medium transition-all ${activeTab === 'puntual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-200'}`}>
            <Receipt size={16} /> Gastos Operativos
          </button>
          <button onClick={() => setActiveTab('factura')} className={`flex items-center whitespace-nowrap gap-2 px-4 h-14 rounded-lg text-sm font-medium transition-all ${activeTab === 'factura' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-200'}`}>
            <FileText size={16} /> Factura Proveedor
          </button>
          <button onClick={() => setActiveTab('historial')} className={`flex items-center whitespace-nowrap gap-2 px-4 h-14 rounded-lg text-sm font-medium transition-all ${activeTab === 'historial' ? 'bg-indigo-600 text-white shadow-lg' : 'text-neutral-400 hover:text-neutral-200'}`}>
            <History size={16} /> Historial
          </button>
        </div>
      </div>

      {isLoadingDatos && (
        <div className="flex justify-center p-8 text-indigo-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      )}

      {/* VISTA 0: COMPRA INSUMOS (MÓVIL) */}
      {activeTab === 'insumos' && !isLoadingDatos && (
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          <MobileCompraForm />
        </div>
      )}

      {/* VISTA 1: COMPRA PUNTUAL */}
      {activeTab === 'puntual' && !isLoadingDatos && (
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl mb-8 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
          <h2 className="text-lg font-medium text-white mb-6">Registrar Gasto Operativo</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Comercio / Beneficiario *</label>
              <input type="text" value={gasto.proveedor} onChange={e => setGasto({...gasto, proveedor: e.target.value})} placeholder="Ej: Ferretería EPA" className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Fecha *</label>
              <input type="date" value={gasto.fechaRegistro} onChange={e => setGasto({...gasto, fechaRegistro: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Monto y Moneda *</label>
              <div className="flex gap-2">
                <input type="number" value={monedaGasto === 'USD' ? gasto.montoDivisas : gasto.montoBs} onChange={e => handleMontoChange(e.target.value)} placeholder="0.00" className="flex-1 bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <select value={monedaGasto} onChange={e => handleMonedaChange(e.target.value as 'USD'|'VES')} className="w-28 bg-black/50 border border-neutral-800 text-white rounded-xl px-2 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none text-center">
                  <option value="USD">USD</option>
                  <option value="VES">Bs</option>
                </select>
              </div>
              <p className="text-xs text-neutral-500 mt-1 pl-1">
                ≈ {monedaGasto === 'USD' ? (gasto.montoBs ? Number(gasto.montoBs).toLocaleString('es-VE') + ' Bs' : '0.00 Bs') : (gasto.montoDivisas ? '$' + Number(gasto.montoDivisas).toLocaleString('en-US') : '$0.00')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5 flex items-center justify-between">
                Tasa de Cambio (Bs) * 
                <Lock size={12} className="text-indigo-400" />
              </label>
              <input type="number" value={gasto.tasaCambio} onChange={e => handleTasaChange(e.target.value)} placeholder="Ej: 36.50" className="w-full bg-indigo-900/10 border border-indigo-500/30 text-indigo-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>

            <div className="hidden lg:block">
              {/* Spacer para mantener el grid alineado (ocupaba la 3ra columna) */}
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Detalles del Gasto</label>
              <textarea rows={3} value={gasto.detalles} onChange={e => setGasto({...gasto, detalles: e.target.value})} placeholder="Detalles de compra..." className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Método de Pago</label>
              <select value={gasto.metodoPago} onChange={e => setGasto({...gasto, metodoPago: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none">
                {metodosPago.map((metodo: string) => <option key={metodo} value={metodo}>{metodo}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Nº Documento / Referencia</label>
              <input type="text" value={gasto.documentoExterno} onChange={e => setGasto({...gasto, documentoExterno: e.target.value})} placeholder="(Opcional)" className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button onClick={handleRegistrarGasto} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center gap-2 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Registrar Gasto
            </button>
          </div>
        </div>
      )}

      {/* HISTORIAL RECIENTE COMPACTO (SÓLO EN COMPRA PUNTUAL) */}
      {!isLoadingDatos && activeTab === 'puntual' && (
        <div className="mt-12 pt-8 border-t border-neutral-800 animate-in fade-in duration-700">
          <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2"><History className="text-indigo-400" size={20} /> Últimos Movimientos Operativos</h3>
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="hidden md:table w-full text-left border-collapse text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-black/40 border-b border-neutral-800 text-neutral-400">
                    <th className="py-4 px-6 font-medium">Fecha</th>
                    <th className="py-4 px-6 font-medium">Proveedor / Comercio</th>
                    <th className="py-4 px-6 font-medium text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {ultimasCompras.map(compra => (
                    <tr key={compra.id} className="hover:bg-white/5 transition-colors text-neutral-300">
                      <td className="py-4 px-6 whitespace-nowrap">{new Date(compra.fecha_registro || compra.fecha).toLocaleDateString('es-VE')}</td>
                      <td className="py-4 px-6 font-medium text-neutral-200">{compra.proveedor}</td>
                      <td className="py-4 px-6 text-right font-medium text-white flex flex-col items-end">
                        <span>{formatCurrency(compra.monto_divisas)}</span>
                        <span className="text-xs text-neutral-500">Bs. {Number(compra.monto_bs || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>
                      </td>
                    </tr>
                  ))}
                  {ultimasCompras.length === 0 && (
                    <tr><td colSpan={3} className="py-12 text-center text-neutral-500">No hay movimientos.</td></tr>
                  )}
                </tbody>
              </table>

              <div className="md:hidden flex flex-col divide-y divide-neutral-800/50">
                {ultimasCompras.length === 0 && (
                  <div className="p-8 text-center text-neutral-500">No hay movimientos.</div>
                )}
                {ultimasCompras.map(compra => (
                  <div key={compra.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-neutral-200">{compra.proveedor}</p>
                      <p className="text-xs text-neutral-500">{new Date(compra.fecha_registro || compra.fecha).toLocaleDateString('es-VE')}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-white">{formatCurrency(compra.monto_divisas)}</span>
                      <span className="text-xs text-neutral-500">Bs. {Number(compra.monto_bs || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: FACTURA DE PROVEEDOR */}
      {activeTab === 'factura' && !isLoadingDatos && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col">
          <div className="p-6 border-b border-neutral-800 bg-neutral-900/80">
            <h2 className="text-lg font-medium text-white mb-6">Ingreso de Mercancía de Proveedor</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Proveedor Oficial</label>
                <div className="flex gap-2">
                  <select value={factura.proveedor} onChange={e => setFactura({...factura, proveedor: e.target.value})} className="flex-1 bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none">
                    <option value="">Selecciona un proveedor de BD...</option>
                    {proveedoresDb.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
                  </select>
                  <button onClick={handleCrearProveedorRapido} className="bg-neutral-800 hover:bg-neutral-700 text-white p-2.5 rounded-xl transition-colors border border-neutral-700 flex items-center justify-center"><UserPlus size={18} /></button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Fecha *</label>
                <input type="date" value={factura.fechaRegistro} onChange={e => setFactura({...factura, fechaRegistro: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Número de Factura Física</label>
                <input type="text" value={factura.nroFactura} onChange={e => setFactura({...factura, nroFactura: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
          <div className="p-6 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="text-neutral-400 text-sm border-b border-neutral-800">
                  <th className="pb-3 font-medium w-[40%]">Producto Base (Catálogo)</th>
                  <th className="pb-3 font-medium w-[15%]">Cantidad</th>
                  <th className="pb-3 font-medium w-[20%]">Costo Unit. ($)</th>
                  <th className="pb-3 font-medium w-[20%]">Total ($)</th>
                  <th className="pb-3 font-medium text-right w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {productos.map((prod) => (
                  <tr key={prod.rowId} className="group">
                    <td className="py-4 pr-4">
                      <select value={prod.id_producto} onChange={(e) => handleProductoChange(prod.rowId, 'id_producto', e.target.value)} className="w-full bg-black/30 border border-neutral-800 rounded-lg text-white px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors">
                        <option value="">(Selecciona Producto)</option>
                          <option value="NEW_PRODUCT">+ Crear Nuevo Producto...</option>
                        {productosDb.map(pDb => (<option key={pDb.id} value={pDb.id}>{pDb.nombre_producto || pDb.nombre}</option>))}
                      </select>
                    </td>
                    <td className="py-4 pr-4"><input type="number" min="1" value={prod.cantidad} onChange={(e) => handleProductoChange(prod.rowId, 'cantidad', e.target.value)} className="w-full bg-black/30 border border-neutral-800 rounded-lg text-white px-3 py-1.5" /></td>
                    <td className="py-4 pr-4"><input type="number" placeholder="0.00" value={prod.precio} onChange={(e) => handleProductoChange(prod.rowId, 'precio', e.target.value)} className="w-full bg-black/30 border border-neutral-800 rounded-lg text-white px-3 py-1.5" /></td>
                    <td className="py-4 pr-4"><input type="number" placeholder="0.00" value={prod.total} onChange={(e) => handleProductoChange(prod.rowId, 'total', e.target.value)} className="w-full bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-300 px-3 py-1.5" /></td>
                    <td className="py-4 text-right"><button onClick={() => removeProducto(prod.rowId)} className="text-neutral-500 hover:text-rose-400 p-1.5"><Trash2 size={18} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addProducto} className="mt-4 flex items-center gap-2 text-sm text-indigo-400 font-medium hover:text-indigo-300 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-500/10"><Plus size={16} /> Agregar línea</button>
          </div>
          <div className="p-6 bg-black/20 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div><p className="text-neutral-400 text-sm">Costo Total Factura</p><p className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totalFactura)}</p></div>
            <button onClick={handleGuardarFactura} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-8 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)] flex gap-2">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Guardar Factura
            </button>
          </div>
        </div>
      )}

      {/* VISTA 3: HISTORIAL COMPLETO Y BUSCADOR */}
      {activeTab === 'historial' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-6">
          
          {/* Filtros */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Buscar (Proveedor o Concepto)</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input type="text" value={filtros.busqueda} onChange={e => setFiltros({...filtros, busqueda: e.target.value})} onKeyDown={e => e.key === 'Enter' && cargarHistorialCompleto()} placeholder="Escribe para buscar..." className="w-full h-14 bg-black/50 border border-neutral-800 text-white rounded-xl pl-9 pr-4 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="w-full md:w-auto">
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Fecha Inicio</label>
              <input type="date" value={filtros.fechaInicio} onChange={e => setFiltros({...filtros, fechaInicio: e.target.value})} className="w-full h-14 bg-black/50 border border-neutral-800 text-white rounded-xl px-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]" />
            </div>
            <div className="w-full md:w-auto">
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Fecha Fin</label>
              <input type="date" value={filtros.fechaFin} onChange={e => setFiltros({...filtros, fechaFin: e.target.value})} className="w-full h-14 bg-black/50 border border-neutral-800 text-white rounded-xl px-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]" />
            </div>
            <button onClick={cargarHistorialCompleto} disabled={isSearching} className="w-full h-14 md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 rounded-xl flex items-center justify-center gap-2">
              {isSearching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />} Filtrar
            </button>
          </div>

          {/* Tabla de Historial */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="hidden md:table w-full text-left border-collapse text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-black/40 border-b border-neutral-800 text-neutral-400">
                    <th className="py-4 px-6 font-medium">Fecha</th>
                    <th className="py-4 px-6 font-medium">Proveedor</th>
                      <th className="py-4 px-6 font-medium">Concepto</th>
                      <th className="py-4 px-6 font-medium">Operador</th>
                      <th className="py-4 px-6 font-medium">Ref / Doc</th>
                    <th className="py-4 px-6 font-medium text-right">Monto ($)</th>
                    <th className="py-4 px-6 font-medium text-center w-[120px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {historialCompleto.map(compra => (
                    <tr key={compra.id} className="hover:bg-white/5 transition-colors text-neutral-300">
                      <td className="py-4 px-6 whitespace-nowrap">{new Date(compra.fecha_registro || compra.fecha).toLocaleString('es-VE')}</td>
                      <td className="py-4 px-6 font-medium text-neutral-200">{compra.proveedor}</td>
                      <td className="py-4 px-6 text-neutral-400 truncate max-w-xs">{compra.detalles || '-'}</td>
                      <td className="py-4 px-6 text-neutral-400 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                            {(compra.operador || 'D').charAt(0).toUpperCase()}
                          </div>
                          {compra.operador}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-neutral-400">{compra.metodo_pago || '-'}</td>
                      <td className="py-4 px-6 text-right font-medium text-white flex flex-col items-end">
                        <span>{formatCurrency(compra.monto_divisas)}</span>
                        <span className="text-xs text-neutral-500" title={`Tasa de cambio: Bs. ${compra.tasa_cambio}`}>Bs. {Number(compra.monto_bs || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>
                      </td>
                      <td className="py-4 px-6 text-center space-x-2">
                        <button onClick={() => { 
                          let parsed = null;
                          let txt = compra.detalles || '';
                          if (txt.startsWith('{')) {
                            try { parsed = JSON.parse(txt); if(parsed.is_insumos) txt = parsed.texto; }catch(e){}
                          }
                          setEditingRow({...compra, parsed_detalles: parsed, edit_items: parsed?.items ? JSON.parse(JSON.stringify(parsed.items)) : []}); 
                          setIsEditModalOpen(true); 
                        }} className="text-indigo-400 hover:text-indigo-300 p-1"><Edit2 size={16}/></button>
                        <button onClick={() => handleEliminarCompra(compra.id)} className="text-neutral-500 hover:text-rose-400 p-1"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                  {historialCompleto.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-neutral-500">
                        <History size={48} className="mx-auto mb-4 opacity-20" />
                        No se encontraron registros para los filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="md:hidden flex flex-col divide-y divide-neutral-800/50">
                {historialCompleto.length === 0 && (
                  <div className="p-8 text-center text-neutral-500">No se encontraron registros para estos filtros.</div>
                )}
                {historialCompleto.map(compra => (
                  <div key={compra.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-neutral-200">{compra.proveedor}</p>
                        <p className="text-xs text-neutral-500">{new Date(compra.fecha_registro || compra.fecha).toLocaleString('es-VE')}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-white">{formatCurrency(compra.monto_divisas)}</span>
                        <span className="text-xs text-neutral-500" title={`Tasa de cambio: Bs. ${compra.tasa_cambio}`}>Bs. {Number(compra.monto_bs || 0).toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>
                      </div>
                    </div>
                    {compra.detalles && (
                      <div className="text-sm text-neutral-400">{compra.detalles}</div>
                    )}
                    <div className="flex justify-between items-center mt-2 border-t border-neutral-800/50 pt-3">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs px-2 py-1 bg-neutral-800 rounded-md text-neutral-400">{compra.metodo_pago || 'N/A'}</span>
                        <span className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">{compra.operador}</span>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => { 
                          let parsed = null;
                          let txt = compra.detalles || '';
                          if (txt.startsWith('{')) {
                            try { parsed = JSON.parse(txt); if(parsed.is_insumos) txt = parsed.texto; }catch(e){}
                          }
                          setEditingRow({...compra, parsed_detalles: parsed, edit_items: parsed?.items ? JSON.parse(JSON.stringify(parsed.items)) : []}); 
                          setIsEditModalOpen(true); 
                        }} className="text-indigo-400 hover:text-indigo-300 p-2"><Edit2 size={18}/></button>
                        <button onClick={() => handleEliminarCompra(compra.id)} className="text-neutral-500 hover:text-rose-400 p-2"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN */}
      {isEditModalOpen && editingRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h3 className="text-xl font-semibold text-white">Editar Compra Operativa</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Proveedor / Comercio</label>
                  <input type="text" value={editingRow.proveedor} onChange={e => setEditingRow({...editingRow, proveedor: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                </div>
                
                {!editingRow.parsed_detalles?.is_insumos && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1.5">Monto ($)</label>
                      <input type="number" value={editingRow.monto_divisas} onChange={e => setEditingRow({...editingRow, monto_divisas: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1.5">Tasa de Cambio</label>
                      <input type="number" value={editingRow.tasa_cambio} onChange={e => setEditingRow({...editingRow, tasa_cambio: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-neutral-400 mb-1.5">Concepto / Detalles</label>
                      <textarea rows={2} value={editingRow.detalles} onChange={e => setEditingRow({...editingRow, detalles: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                    </div>
                  </>
                )}

                {editingRow.parsed_detalles?.is_insumos && (
                  <div className="col-span-2">
                     <label className="block text-sm font-medium text-emerald-400 mb-3">Insumos Comprados (El inventario se actualizará auto)</label>
                     <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-neutral-800">
                        {editingRow.edit_items?.map((it:any, idx:number) => (
                           <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                              <span className="flex-1 text-sm font-medium text-white">{it.nombre_nuevo}</span>
                              <div className="flex gap-2 w-full sm:w-auto">
                                 <input type="number" value={it.cantidad} onChange={e => {
                                    const n = [...editingRow.edit_items];
                                    n[idx].cantidad = Number(e.target.value);
                                    setEditingRow({...editingRow, edit_items: n});
                                 }} className="w-24 bg-black/50 border border-neutral-800 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500" title="Cantidad" />
                                 
                                 <div className="relative">
                                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                                   <input type="number" value={it.costoTotal} onChange={e => {
                                      const n = [...editingRow.edit_items];
                                      n[idx].costoTotal = Number(e.target.value);
                                      setEditingRow({...editingRow, edit_items: n});
                                   }} className="w-24 bg-black/50 border border-neutral-800 text-white text-sm rounded-lg pl-6 pr-3 py-1.5 focus:outline-none focus:border-indigo-500" title="Costo Total" />
                                 </div>
                                 <button onClick={() => {
                                    const n = editingRow.edit_items.filter((_:any, i:number) => i !== idx);
                                    setEditingRow({...editingRow, edit_items: n});
                                 }} className="p-1.5 text-neutral-500 hover:text-rose-400"><Trash2 size={16}/></button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Método de Pago</label>
                  <select value={editingRow.metodo_pago} onChange={e => setEditingRow({...editingRow, metodo_pago: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 appearance-none">
                    {metodosPago.map((metodo: string) => <option key={metodo} value={metodo}>{metodo}</option>)}
                  </select>
                </div>
                {!editingRow.parsed_detalles?.is_insumos && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1.5">Ref / Documento</label>
                    <input type="text" value={editingRow.id || ''} onChange={e => setEditingRow({...editingRow, documento_externo: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 rounded-xl font-medium text-neutral-300 hover:bg-neutral-800 transition-colors">Cancelar</button>
              <button onClick={handleGuardarEdicion} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}





