'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, FileText, Plus, Trash2, Save, ShoppingCart, UserPlus, Loader2, CheckCircle2, History, Search, Calendar, Edit2, X, Lock, Package, ChevronDown, ChevronUp, Clock, Users, Filter, Tag, Check, Ban } from 'lucide-react';
import { getProveedoresYProductos, crearProveedor, crearProductoBase, registrarCompraPuntual, registrarFactura, getUltimasCompras, getHistorialCompras, actualizarCompraPuntual, eliminarCompraPuntual, getTasaDelDia, } from './actions';
import MobileCompraForm from '@/components/compras/MobileCompraForm';
import { editarFacturaInsumos, getComprasMetodosPago, addCompraMetodoPago } from '@/actions/compras-actions';
import { useEmpresa } from '@/components/providers/EmpresaProvider';
import CreatableSelect from 'react-select/creatable';
import { useLiveTable } from '@/hooks/useLiveTable';
import NiteoDatePicker from '@/components/ui/NiteoDatePicker';
import NiteoDateRangePicker from '@/components/ui/NiteoDateRangePicker';
import { formatFecha } from '@/utils/date-utils';

import SedeSelector from "@/components/inventario/SedeSelector";
export default function ComprasClient({ sedes, activeSedeId, profile }: { sedes: any[], activeSedeId: string, profile: any }) {
  const { empresa, userRole, permisos } = useEmpresa();
  const roleUpper = (userRole || profile?.rol || profile?.role || '').toUpperCase();
  const hasPermisoEliminar = (Array.isArray(permisos) && (permisos.includes('eliminar_facturas') || permisos.includes('compras'))) ||
                             (Array.isArray(profile?.permisos) && (profile.permisos.includes('eliminar_facturas') || profile.permisos.includes('compras')));
  const canDeleteFactura = roleUpper === 'MASTER' ||
                           roleUpper === 'ADMINISTRADOR' ||
                           roleUpper === 'ADMIN' ||
                           roleUpper === 'COMPRADOR' ||
                           roleUpper === 'GERENTE' ||
                           hasPermisoEliminar;
  const defaultPaymentMethods = ['Efectivo USD', 'Zelle', 'Pago Móvil', 'Transferencia Bs', 'Punto de Venta'];
    const [dbMetodos, setDbMetodos] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchMetodos = async () => {
      const res = await getComprasMetodosPago();
      if (res.success && res.data) {
        setDbMetodos(res.data);
      }
    };
    fetchMetodos();
  }, []);

  const metodosPago = dbMetodos.length > 0 ? dbMetodos.map(m => m.nombre) : defaultPaymentMethods;


  const [activeTab, setActiveTab] = useState<'insumos' | 'puntual' | 'factura' | 'historial'>('insumos');

  const liveTableFilter = (empresa as any)?.id ? `id_empresa=eq.${(empresa as any).id}` : undefined;

  useLiveTable('compras_puntuales', () => {
    if (activeTab === 'historial') {
      cargarHistorialCompleto();
    } else if (activeTab === 'puntual' || activeTab === 'insumos') {
      getUltimasCompras().then(res => {
        if (res.success) setUltimasCompras(res.compras || []);
      });
    }
  }, liveTableFilter);
  
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
    const editId = params.get('edit');
    if (editId && tab === 'historial') {
      // Small timeout to allow historial to load
      setTimeout(() => {
        getHistorialCompras().then(res => {
          if (res.success && res.compras) {
            const target = res.compras.find(c => c.id === editId);
            if (target) {
              let parsed = null;
              let txt = target.raw_detalles || target.detalles || '';
              if (txt.startsWith('{')) {
                try { parsed = JSON.parse(txt); if(parsed.is_insumos) txt = parsed.texto; }catch(e){}
              }
              setEditingRow({...target, parsed_detalles: parsed, edit_items: parsed?.items ? JSON.parse(JSON.stringify(parsed.items)) : []}); 
              setIsEditModalOpen(true);
            }
          }
        });
      }, 500);
    }
  }, []);
  const [isLoadingDatos, setIsLoadingDatos] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ text: '', type: '' });

  const rsStyles = {
    control: (base: any) => ({
      ...base,
      background: 'rgba(0,0,0,0.5)',
      borderColor: '#262626',
      minHeight: '3.5rem',
      borderRadius: '0.75rem',
    }),
    menu: (base: any) => ({ ...base, background: '#171717', border: '1px solid #262626' }),
    option: (base: any, state: any) => ({ ...base, background: state.isFocused ? '#262626' : 'transparent', color: 'white' }),
    singleValue: (base: any) => ({ ...base, color: 'white' }),
    input: (base: any) => ({ ...base, color: 'white' })
  };


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

  // Estados interactivos para el historial rediseñado (estilo Historial de Ventas)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INSUMOS' | 'PUNTUAL'>('TODOS');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('TODOS');

  // Métodos de pago únicos detectados en el historial
  const metodosDisponiblesHistorial = useMemo(() => {
    const set = new Set<string>();
    historialCompleto.forEach((c: any) => {
      if (c.metodo_pago && typeof c.metodo_pago === 'string' && c.metodo_pago.trim()) {
        set.add(c.metodo_pago.trim());
      }
    });
    return Array.from(set);
  }, [historialCompleto]);

  // Lista filtrada reactiva de compras
  const filtradasHistorial = useMemo(() => {
    return historialCompleto.filter((compra: any) => {
      // 1. Búsqueda por texto (proveedor, concepto, insumos, operador, método)
      if (filtros.busqueda.trim()) {
        const b = filtros.busqueda.toLowerCase().trim();
        const prov = (compra.proveedor || '').toLowerCase();
        const det = (compra.detalles || '').toLowerCase();
        const op = (compra.operador || '').toLowerCase();
        const met = (compra.metodo_pago || '').toLowerCase();
        const raw = (compra.raw_detalles || '').toLowerCase();
        if (!prov.includes(b) && !det.includes(b) && !op.includes(b) && !met.includes(b) && !raw.includes(b)) {
          return false;
        }
      }

      // 2. Filtro de tipo (Insumos vs Gastos Operativos)
      const isIns = Boolean(
        compra.is_insumos ||
        compra.parsed_detalles?.is_insumos ||
        (typeof compra.raw_detalles === 'string' && compra.raw_detalles.includes('"is_insumos":true')) ||
        (typeof compra.detalles === 'string' && compra.detalles.toLowerCase().includes('insumo'))
      );

      if (filtroTipo === 'INSUMOS' && !isIns) return false;
      if (filtroTipo === 'PUNTUAL' && isIns) return false;

      // 3. Filtro por método de pago
      if (filtroMetodo !== 'TODOS') {
        if ((compra.metodo_pago || '').toLowerCase() !== filtroMetodo.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [historialCompleto, filtros.busqueda, filtroTipo, filtroMetodo]);

  // KPIs Totales calculados dinámicamente sobre la lista filtrada
  const totalHistorialUSD = useMemo(() => {
    return filtradasHistorial.reduce((acc: number, c: any) => acc + (Number(c.monto_divisas) || 0), 0);
  }, [filtradasHistorial]);

  const totalHistorialBs = useMemo(() => {
    return filtradasHistorial.reduce((acc: number, c: any) => acc + (Number(c.monto_bs) || 0), 0);
  }, [filtradasHistorial]);

  // Modal de Edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [addEditInsumoSearch, setAddEditInsumoSearch] = useState('');
  const [addEditIsNew, setAddEditIsNew] = useState(false);
  const [addEditNombreNuevo, setAddEditNombreNuevo] = useState('');
  const [addEditUnidad, setAddEditUnidad] = useState('Kg');
  const [addEditCantidad, setAddEditCantidad] = useState('');
  const [addEditTotal, setAddEditTotal] = useState('');

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
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
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
      openPrompt('Ingresa el nombre del nuevo producto base:', '', (nombre) => {
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
              mostrarAlerta(res.error || 'Error', 'error');
            }
            setIsSubmitting(false);
          });
        }
      });
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
          descripcion: editingRow.detalles,
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
    openPrompt('Ingresa el nombre del nuevo proveedor (y RIF opcional separados por guión):', '', async (nombre) => {
      if (nombre && nombre.trim()) {
        setIsSubmitting(true);
        const res = await crearProveedor(nombre.trim());
        if (res.success && res.proveedor) {
          setProveedoresDb(prev => [...prev, res.proveedor]);
          setFactura(prev => ({ ...prev, proveedor: res.proveedor.id?.toString() || '' }));
          mostrarAlerta('Proveedor creado.', 'success');
        } else {
          mostrarAlerta('Error al crear proveedor.', 'error');
        }
        setIsSubmitting(false);
      }
    });
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

        <div className="flex flex-wrap gap-2 md:gap-4 p-1 bg-transparent max-w-full">
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
              <input type="text" value={gasto.proveedor} onChange={e => setGasto({...gasto, proveedor: e.target.value})} placeholder="Ej: Ferretería EPA" className="w-full h-14 bg-black/50 border border-neutral-800 text-white text-base rounded-xl px-4 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Fecha *</label>
              <NiteoDatePicker value={gasto.fechaRegistro} onChange={val => setGasto({...gasto, fechaRegistro: val})} className="w-full" />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Monto y Moneda *</label>
              <div className="flex gap-2">
                <input type="number" inputMode="decimal" value={monedaGasto === 'USD' ? gasto.montoDivisas : gasto.montoBs} onChange={e => handleMontoChange(e.target.value)} placeholder="0.00" className="flex-1 h-14 bg-black/50 border border-neutral-800 text-white text-base rounded-xl px-4 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <select value={monedaGasto} onChange={e => handleMonedaChange(e.target.value as 'USD'|'VES')} className="w-24 h-14 bg-black/50 border border-neutral-800 text-white text-base rounded-xl px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none text-center">
                  <option value="USD">USD</option>
                  <option value="VES">VES</option>
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
              <input type="number" inputMode="decimal" value={gasto.tasaCambio} onChange={e => handleTasaChange(e.target.value)} placeholder="Ej: 36.50" className="w-full h-14 bg-indigo-900/10 border border-indigo-500/30 text-indigo-200 text-base rounded-xl px-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors" />
            </div>

            <div className="hidden lg:block">
              {/* Spacer para mantener el grid alineado (ocupaba la 3ra columna) */}
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Detalles del Gasto</label>
              <textarea rows={3} value={gasto.detalles} onChange={e => setGasto({...gasto, detalles: e.target.value})} placeholder="Detalles de compra..." className="w-full bg-black/50 border border-neutral-800 text-white text-base rounded-xl px-4 py-3.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Método de Pago</label>
              <CreatableSelect
    options={metodosPago.map((m) => ({ value: m, label: m }))}
    value={{ value: gasto.metodoPago, label: gasto.metodoPago }}
    onChange={(selected) => setGasto({...gasto, metodoPago: selected ? selected.value : ''})}
    onCreateOption={async (inputValue) => {
      const res = await addCompraMetodoPago(inputValue);
      if (res.success && res.data) {
        setDbMetodos([...dbMetodos, res.data]);
        setGasto({...gasto, metodoPago: res.data.nombre});
      }
    }}
    styles={rsStyles}
    placeholder="Selecciona o escribe..."
    formatCreateLabel={(val) => `Usar "${val}"`}
  />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Nº Documento / Referencia</label>
              <input type="text" value={gasto.documentoExterno} onChange={e => setGasto({...gasto, documentoExterno: e.target.value})} placeholder="(Opcional)" className="w-full h-14 bg-black/50 border border-neutral-800 text-white text-base rounded-xl px-4 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button onClick={handleRegistrarGasto} disabled={isSubmitting} className="w-full md:w-auto h-14 md:h-auto md:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 disabled:opacity-50">
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
                      <td className="py-4 px-6 whitespace-nowrap">{formatFecha(compra.fecha_registro || compra.fecha)}</td>
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
                      <p className="text-xs text-neutral-500">{formatFecha(compra.fecha_registro || compra.fecha)}</p>
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
                <NiteoDatePicker value={factura.fechaRegistro} onChange={val => setFactura({...factura, fechaRegistro: val})} className="w-full" />
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

      {/* VISTA 3: HISTORIAL COMPLETO Y BUSCADOR (REDISEÑO ESTILO HISTORIAL DE VENTAS) */}
      {activeTab === 'historial' && (
        <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-4">

          {/* Barra de Filtros y Búsqueda Interactiva */}
          <div className="bg-neutral-900 border border-neutral-800 p-3 sm:p-4 rounded-2xl space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 sm:gap-3">
              
              {/* Buscador */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por proveedor, concepto, insumo u operador..."
                  value={filtros.busqueda}
                  onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && cargarHistorialCompleto()}
                  className="w-full bg-neutral-950 sm:bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {filtros.busqueda && (
                  <button
                    onClick={() => setFiltros({ ...filtros, busqueda: '' })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs p-1 rounded-md"
                    title="Borrar búsqueda"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro por Tipo de Compra */}
              <div className="relative min-w-[150px]">
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value as any)}
                  className="w-full bg-neutral-950 sm:bg-neutral-900 border border-neutral-800 rounded-xl pl-3 pr-8 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
                >
                  <option value="TODOS">📑 Todos los tipos</option>
                  <option value="INSUMOS">📦 Solo Insumos</option>
                  <option value="PUNTUAL">💼 Gastos Operativos</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>

              {/* Filtro por Método de Pago */}
              <div className="relative min-w-[170px]">
                <select
                  value={filtroMetodo}
                  onChange={(e) => setFiltroMetodo(e.target.value)}
                  className="w-full bg-neutral-950 sm:bg-neutral-900 border border-neutral-800 rounded-xl pl-3 pr-8 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
                >
                  <option value="TODOS">💳 Todos los métodos</option>
                  {metodosDisponiblesHistorial.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>

              {/* Rango de Fechas */}
              <div className="w-full md:w-auto">
                <NiteoDateRangePicker
                  startDate={filtros.fechaInicio}
                  endDate={filtros.fechaFin}
                  onChange={(s, e) => setFiltros({ ...filtros, fechaInicio: s, fechaFin: e })}
                  align="right"
                  className="w-full md:w-auto"
                />
              </div>

              {/* Botón Buscar en Servidor */}
              <button
                onClick={cargarHistorialCompleto}
                disabled={isSearching}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 shrink-0"
              >
                {isSearching ? <Loader2 className="animate-spin" size={15} /> : <Search size={15} />}
                <span>Filtrar</span>
              </button>
            </div>
          </div>

          {/* Resumen de Resultados Filtrados (KPI Bar - Idéntico al Historial de Ventas) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3.5 bg-neutral-900 border border-neutral-800 rounded-2xl text-xs">
            <div className="flex items-center justify-between sm:justify-start gap-2 text-neutral-400 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm">
                  Mostrando <strong className="text-white font-bold">{filtradasHistorial.length}</strong> {filtradasHistorial.length === 1 ? 'compra' : 'compras'}
                </span>
                {filtroTipo === 'INSUMOS' && (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    📦 Solo Insumos
                  </span>
                )}
                {filtroTipo === 'PUNTUAL' && (
                  <span className="flex items-center gap-1 text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    💼 Gastos Operativos
                  </span>
                )}
                {filtroMetodo !== 'TODOS' && (
                  <span className="flex items-center gap-1 text-indigo-300 font-medium bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/30">
                    💳 {filtroMetodo}
                  </span>
                )}
                {(filtros.fechaInicio || filtros.fechaFin) && (
                  <span className="flex items-center gap-1 text-neutral-300 bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-700">
                    📅 {filtros.fechaInicio || 'Inicio'} → {filtros.fechaFin || 'Hoy'}
                  </span>
                )}
              </div>

              {(filtros.busqueda || filtroTipo !== 'TODOS' || filtroMetodo !== 'TODOS' || filtros.fechaInicio || filtros.fechaFin) && (
                <button
                  onClick={() => {
                    setFiltros({ busqueda: '', fechaInicio: '', fechaFin: '' });
                    setFiltroTipo('TODOS');
                    setFiltroMetodo('TODOS');
                  }}
                  className="text-xs text-neutral-400 hover:text-white underline ml-1 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Total acumulado en USD y Bs para los filtros activos */}
            <div className="flex items-center gap-3 self-end sm:self-auto bg-black/40 px-3 py-1.5 rounded-xl border border-neutral-800">
              <div className="text-right">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-semibold">Total Filtrado</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-extrabold text-emerald-400">
                    {formatCurrency(totalHistorialUSD)}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    ≈ Bs. {Number(totalHistorialBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Listado de Tarjetas de Compra (Diseño y Ergonomía del Historial de Ventas) */}
          {isSearching ? (
            <div className="flex justify-center p-12 text-indigo-400 animate-pulse text-sm">
              <Loader2 className="animate-spin mr-2" size={18} /> Cargando compras...
            </div>
          ) : filtradasHistorial.length === 0 ? (
            <div className="text-center p-8 sm:p-12 text-neutral-500 border border-neutral-800 border-dashed rounded-2xl text-sm">
              <History size={40} className="mx-auto mb-3 opacity-20" />
              No hay compras registradas con los filtros seleccionados.
            </div>
          ) : (
            <div className="space-y-3.5">
              {filtradasHistorial.map((compra) => {
                const isExpanded = expandedId === compra.id;
                const isOwner = compra.usuario_id === (profile?.id);
                const canDeleteThis = canDeleteFactura || isOwner;

                // Detectar si es compra de insumos
                let parsedItems: any[] = [];
                let isCompraInsumos = Boolean(compra.is_insumos || compra.parsed_detalles?.is_insumos);

                if (compra.items && Array.isArray(compra.items)) {
                  parsedItems = compra.items;
                  isCompraInsumos = true;
                } else if (compra.parsed_detalles?.items && Array.isArray(compra.parsed_detalles.items)) {
                  parsedItems = compra.parsed_detalles.items;
                  isCompraInsumos = true;
                } else if (typeof compra.raw_detalles === 'string' && compra.raw_detalles.startsWith('{')) {
                  try {
                    const p = JSON.parse(compra.raw_detalles);
                    if (p.is_insumos && Array.isArray(p.items)) {
                      parsedItems = p.items;
                      isCompraInsumos = true;
                    }
                  } catch (e) {}
                }

                const accentBorderClass = compra.modificado
                  ? 'border-l-4 border-l-amber-500'
                  : isCompraInsumos
                  ? 'border-l-4 border-l-emerald-500'
                  : 'border-l-4 border-l-indigo-500';

                return (
                  <div
                    key={compra.id}
                    className={`bg-neutral-900 border ${accentBorderClass} border-neutral-800 rounded-2xl overflow-hidden shadow-lg shadow-black/40 transition-all hover:border-neutral-700`}
                  >
                    {/* Cabecera y Resumen de la Tarjeta (Click para desplegar) */}
                    <div
                      className="cursor-pointer select-none"
                      onClick={() => setExpandedId(isExpanded ? null : compra.id)}
                    >
                      <div className="p-3.5 sm:p-4 space-y-2.5">
                        
                        {/* Fila 1: Proveedor + Badges | Total USD + Botón Desplegar */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                            {/* Badge de tipo */}
                            {isCompraInsumos ? (
                              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-bold uppercase shrink-0 flex items-center gap-1">
                                <Package size={12} /> Insumos
                              </span>
                            ) : (
                              <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-bold uppercase shrink-0 flex items-center gap-1">
                                <Receipt size={12} /> Gasto
                              </span>
                            )}

                            {/* Nombre del Proveedor */}
                            <span className="font-bold text-white text-sm sm:text-base tracking-tight truncate">
                              {compra.proveedor}
                            </span>

                            {/* Badge Modificada */}
                            {compra.modificado && (
                              <span
                                className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0"
                                title={`Modificada por: ${compra.modificado_por || 'Usuario'}`}
                              >
                                Mod.
                              </span>
                            )}
                          </div>

                          {/* Total en USD y botón de desplegar */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-sm sm:text-base font-extrabold whitespace-nowrap px-2.5 py-0.5 rounded-md text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 block">
                                {formatCurrency(compra.monto_divisas)}
                              </span>
                              <span className="text-[11px] text-neutral-400 font-mono whitespace-nowrap mt-0.5 block" title={`Tasa: Bs. ${compra.tasa_cambio}`}>
                                Bs. {Number(compra.monto_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700/70 flex items-center justify-center text-neutral-300 shrink-0">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </div>

                        {/* Fila 2: Metadatos (Fecha, Método de Pago, Operador) */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-xs flex-wrap">
                          <div className="flex items-center gap-1.5 text-neutral-400 whitespace-nowrap shrink-0">
                            <Clock size={12} className="text-indigo-400/80 shrink-0" />
                            <span>{formatFecha(compra.fecha_registro || compra.fecha, { includeTime: true })}</span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Método de pago */}
                            <span className="text-[11px] text-indigo-200 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-md font-semibold truncate max-w-[140px]">
                              {compra.metodo_pago || 'Sin especificar'}
                            </span>

                            {/* Operador / Comprador */}
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-300 bg-neutral-800/80 px-2 py-0.5 rounded-md border border-neutral-700/70">
                              <div className="w-3.5 h-3.5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-[9px] font-bold">
                                {(compra.operador || 'C').charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[110px]">{compra.operador}</span>
                            </div>
                          </div>
                        </div>

                        {/* Fila 3: Concepto y Botones de Acción */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <div className="text-xs text-neutral-300 min-w-0 flex-1">
                            <p className="truncate font-medium">{compra.detalles || 'Sin detalles'}</p>
                            {isCompraInsumos && parsedItems.length > 0 && (
                              <p className="text-[11px] text-emerald-400/80 mt-0.5 font-medium">
                                ▾ Contiene {parsedItems.length} {parsedItems.length === 1 ? 'insumo' : 'insumos'} (Toca para ver desglose)
                              </p>
                            )}
                          </div>

                          {/* Botones de Acción directos */}
                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Botón Editar */}
                            <button
                              onClick={() => {
                                let parsed = null;
                                let txt = compra.raw_detalles || compra.detalles || '';
                                if (txt.startsWith('{')) {
                                  try { parsed = JSON.parse(txt); if (parsed.is_insumos) txt = parsed.texto; } catch (e) {}
                                }
                                setEditingRow({
                                  ...compra,
                                  parsed_detalles: parsed,
                                  edit_items: parsed?.items ? JSON.parse(JSON.stringify(parsed.items)) : (parsedItems.length > 0 ? JSON.parse(JSON.stringify(parsedItems)) : [])
                                });
                                setIsEditModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Editar compra"
                            >
                              <Edit2 size={13} />
                              <span>Editar</span>
                            </button>

                            {/* Botón Eliminar (Permitido a Comprador, Owner y Administradores) */}
                            {canDeleteThis && (
                              <button
                                onClick={() => handleEliminarCompra(compra.id)}
                                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Eliminar compra por completo"
                              >
                                <Trash2 size={13} />
                                <span>Eliminar</span>
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Desglose Expandible (Acordeón como en Historial de Ventas) */}
                    {isExpanded && (
                      <div className="border-t border-neutral-800 bg-black/40 p-3.5 sm:p-5 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        {isCompraInsumos && parsedItems.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Package size={14} className="text-emerald-400" />
                              Desglose de Insumos Comprados ({parsedItems.length})
                            </h4>

                            <div className="bg-neutral-950 rounded-xl border border-neutral-800/80 overflow-hidden">
                              <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-bold text-neutral-500 uppercase border-b border-neutral-800">
                                <div className="col-span-5">Insumo</div>
                                <div className="col-span-2 text-center">Cantidad</div>
                                <div className="col-span-2 text-right">P. Unitario</div>
                                <div className="col-span-3 text-right">Subtotal</div>
                              </div>

                              <div className="divide-y divide-neutral-800/60">
                                {parsedItems.map((it: any, idx: number) => {
                                  const name = it.nombre_nuevo || it.nombre || 'Insumo';
                                  const unit = it.unidad_nueva || it.unidad_compra || it.unidad_medida || 'Und';
                                  const qty = Number(it.cantidad || 1);
                                  const total = Number(it.costoTotal || 0);
                                  const unitPrice = qty > 0 ? total / qty : total;
                                  const mon = it.monedaItem || 'USD';

                                  return (
                                    <div key={idx} className="p-2.5 sm:px-3 sm:py-2 text-xs flex flex-col sm:grid sm:grid-cols-12 gap-1 sm:gap-2 items-start sm:items-center">
                                      <div className="sm:col-span-5 font-medium text-white flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                        <span>{name}</span>
                                      </div>
                                      <div className="sm:col-span-2 text-neutral-300 sm:text-center text-[11px]">
                                        <span className="sm:hidden text-neutral-500 mr-1">Cant:</span>
                                        <strong>{qty}</strong> {unit}
                                      </div>
                                      <div className="sm:col-span-2 text-neutral-400 sm:text-right text-[11px]">
                                        <span className="sm:hidden text-neutral-500 mr-1">P.Unit:</span>
                                        {mon === 'VES' ? `Bs. ${unitPrice.toFixed(2)}` : `$${unitPrice.toFixed(2)}`}
                                      </div>
                                      <div className="sm:col-span-3 text-emerald-400 font-bold sm:text-right text-xs">
                                        <span className="sm:hidden text-neutral-500 mr-1 font-normal">Total:</span>
                                        {mon === 'VES' ? `Bs. ${total.toFixed(2)}` : `$${total.toFixed(2)}`}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-neutral-400 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Detalles de Operación</span>
                            <p className="text-neutral-300 font-medium">{compra.detalles || 'Sin observaciones'}</p>
                          </div>
                        )}

                        {/* Pie de detalles con tasa e historial de modificación */}
                        <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                          <span className="flex items-center gap-1 font-mono">
                            💱 Tasa de cambio: Bs. {compra.tasa_cambio}
                          </span>
                          {compra.modificado && (
                            <span className="text-amber-400/90 text-[11px]">
                              Modificado por: <strong>{compra.modificado_por || 'Usuario'}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* MODAL DE EDICIÓN */}
      {isEditModalOpen && editingRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={(e) => { e.preventDefault(); handleGuardarEdicion(); }} className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between p-6 border-b border-neutral-800">
              <h3 className="text-xl font-semibold text-white">Editar Compra Operativa</h3>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-neutral-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
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
                  </>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Concepto / Detalles</label>
                  <textarea rows={2} value={editingRow.detalles} onChange={e => setEditingRow({...editingRow, detalles: e.target.value})} className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500" />
                </div>

                {editingRow.parsed_detalles?.is_insumos && (
                  <div className="col-span-2">
                     <label className="block text-sm font-medium text-emerald-400 mb-3">Insumos Comprados (El inventario se actualizará auto)</label>
                                          {/* Column headers */}
                     <div className="hidden sm:grid grid-cols-12 gap-2 px-3 pb-1 text-xs font-medium text-neutral-500 uppercase tracking-wide">
                       <div className="col-span-4">Insumo</div>
                       <div className="col-span-2 text-center">Cantidad</div>
                       <div className="col-span-2 text-center">P. Unit.</div>
                       <div className="col-span-2 text-center">Total</div>
                       <div className="col-span-1 text-center">Moneda</div>
                       <div className="col-span-1"></div>
                     </div>
                     <div className="space-y-2 bg-black/20 p-3 rounded-xl border border-neutral-800">
                        {editingRow.edit_items?.map((it:any, idx:number) => {
                          const precioUnit = it.cantidad > 0 ? (it.costoTotal / it.cantidad) : 0;
                          const monedaBadge = it.monedaItem === 'VES' ? 'VES' : 'USD';
                          return (
                           <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                              {/* Nombre y botón eliminar en móvil */}
                              <div className="col-span-12 sm:col-span-4 flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-semibold text-white">{it.nombre_nuevo}</span>
                                  <p className="text-xs text-neutral-500 sm:hidden">{monedaBadge} · {it.cantidad} × {precioUnit.toFixed(2)} = {it.costoTotal.toFixed(2)}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const n = editingRow.edit_items.filter((_:any, i:number) => i !== idx);
                                    setEditingRow({...editingRow, edit_items: n});
                                  }}
                                  className="sm:hidden p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                  title="Eliminar insumo"
                                >
                                  <Trash2 size={15}/> Quitar
                                </button>
                              </div>
                              {/* Cantidad */}
                              <div className="col-span-4 sm:col-span-2">
                                <label className="text-xs text-neutral-500 sm:hidden mb-0.5 block">Cant.</label>
                                <input type="number" min="0.01" step="any" value={it.cantidad} onChange={e => {
                                    const n = [...editingRow.edit_items];
                                    n[idx].cantidad = Number(e.target.value);
                                    setEditingRow({...editingRow, edit_items: n});
                                 }} className="w-full bg-black/50 border border-neutral-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-center" />
                              </div>
                              {/* Precio unit (read-only computed) */}
                              <div className="col-span-4 sm:col-span-2">
                                <label className="text-xs text-neutral-500 sm:hidden mb-0.5 block">P.Unit.</label>
                                <div className="w-full bg-neutral-950/50 border border-neutral-800 text-neutral-400 text-sm rounded-lg px-2 py-1.5 text-center">
                                  {precioUnit.toFixed(2)}
                                </div>
                              </div>
                              {/* Total */}
                              <div className="col-span-4 sm:col-span-2">
                                <label className="text-xs text-neutral-500 sm:hidden mb-0.5 block">Total</label>
                                <input type="number" min="0" step="any" value={it.costoTotal} onChange={e => {
                                    const n = [...editingRow.edit_items];
                                    n[idx].costoTotal = Number(e.target.value);
                                    setEditingRow({...editingRow, edit_items: n});
                                 }} className="w-full bg-black/50 border border-neutral-700 text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-center" />
                              </div>
                              {/* Moneda badge */}
                              <div className="hidden sm:flex col-span-1 justify-center">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${monedaBadge === 'USD' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{monedaBadge}</span>
                              </div>
                              {/* Delete desktop */}
                              <div className="hidden sm:flex col-span-1 justify-center">
                                <button onClick={() => {
                                    const n = editingRow.edit_items.filter((_:any, i:number) => i !== idx);
                                    setEditingRow({...editingRow, edit_items: n});
                                 }} className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Eliminar insumo"><Trash2 size={16}/></button>
                              </div>
                           </div>
                          );
                        })}

                        {/* FORMULARIO PARA AGREGAR NUEVO INSUMO A ESTA COMPRA */}
                        <div className="mt-4 p-3 bg-neutral-950/80 rounded-xl border border-indigo-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                              <Plus size={14} /> Agregar Producto / Insumo a la Factura
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setAddEditIsNew(!addEditIsNew);
                                setAddEditInsumoSearch('');
                                setAddEditNombreNuevo('');
                              }}
                              className="text-xs text-neutral-400 hover:text-white underline"
                            >
                              {addEditIsNew ? 'Seleccionar existente' : '+ Crear nuevo'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                            {addEditIsNew ? (
                              <>
                                <div className="sm:col-span-4">
                                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">Nombre Insumo</label>
                                  <input
                                    type="text"
                                    value={addEditNombreNuevo}
                                    onChange={e => setAddEditNombreNuevo(e.target.value)}
                                    placeholder="Ej. Harina de Trigo"
                                    className="w-full bg-black/50 border border-neutral-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">Unidad</label>
                                  <select
                                    value={addEditUnidad}
                                    onChange={e => setAddEditUnidad(e.target.value)}
                                    className="w-full bg-black/50 border border-neutral-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                                  >
                                    {['Kg', 'Gr', 'Lt', 'Ml', 'Und', 'Cajas', 'Paquetes'].map(u => (
                                      <option key={u} value={u} className="bg-neutral-900">{u}</option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            ) : (
                              <div className="sm:col-span-6">
                                <label className="block text-[11px] font-medium text-neutral-400 mb-1">Insumo</label>
                                <select
                                  value={addEditInsumoSearch}
                                  onChange={e => setAddEditInsumoSearch(e.target.value)}
                                  className="w-full bg-black/50 border border-neutral-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="">Selecciona un insumo...</option>
                                  {productosDb.map(p => (
                                    <option key={p.id} value={p.id} className="bg-neutral-900">
                                      {p.nombre_producto || p.nombre}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Cantidad</label>
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                placeholder="0.00"
                                value={addEditCantidad}
                                onChange={e => setAddEditCantidad(e.target.value)}
                                className="w-full bg-black/50 border border-neutral-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-center"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-medium text-neutral-400 mb-1">Total ($)</label>
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                placeholder="0.00"
                                value={addEditTotal}
                                onChange={e => setAddEditTotal(e.target.value)}
                                className="w-full bg-black/50 border border-neutral-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-center"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const qty = Number(addEditCantidad);
                                  const cost = Number(addEditTotal);
                                  if (!qty || qty <= 0 || !cost || cost <= 0) return;

                                  let newItem: any = null;
                                  if (addEditIsNew) {
                                    if (!addEditNombreNuevo.trim()) return;
                                    newItem = {
                                      id: Math.random().toString(),
                                      insumo_id: null,
                                      is_new: true,
                                      nombre_nuevo: addEditNombreNuevo.trim(),
                                      unidad_nueva: addEditUnidad || 'Und',
                                      cantidad: qty,
                                      costoTotal: cost,
                                      monedaItem: 'USD'
                                    };
                                  } else {
                                    if (!addEditInsumoSearch) return;
                                    const found = productosDb.find(p => p.id === addEditInsumoSearch);
                                    newItem = {
                                      id: Math.random().toString(),
                                      insumo_id: addEditInsumoSearch,
                                      is_new: false,
                                      nombre_nuevo: found?.nombre_producto || found?.nombre || 'Insumo',
                                      unidad_nueva: found?.unidad_medida || 'Und',
                                      cantidad: qty,
                                      costoTotal: cost,
                                      monedaItem: 'USD'
                                    };
                                  }

                                  setEditingRow({
                                    ...editingRow,
                                    edit_items: [...(editingRow.edit_items || []), newItem]
                                  });

                                  setAddEditInsumoSearch('');
                                  setAddEditNombreNuevo('');
                                  setAddEditIsNew(false);
                                  setAddEditCantidad('');
                                  setAddEditTotal('');
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                              >
                                <Plus size={14} /> Añadir
                              </button>
                            </div>
                          </div>
                        </div>
                     </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Método de Pago</label>
                  <CreatableSelect
    options={metodosPago.map((m) => ({ value: m, label: m }))}
    value={{ value: editingRow.metodo_pago, label: editingRow.metodo_pago }}
    onChange={(selected) => setEditingRow({...editingRow, metodo_pago: selected ? selected.value : ''})}
    onCreateOption={async (inputValue) => {
      const res = await addCompraMetodoPago(inputValue);
      if (res.success && res.data) {
        setDbMetodos([...dbMetodos, res.data]);
        setEditingRow({...editingRow, metodo_pago: res.data.nombre});
      }
    }}
    styles={rsStyles}
    placeholder="Selecciona o escribe..."
    formatCreateLabel={(val) => `Usar "${val}"`}
  />
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
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 rounded-xl font-medium text-neutral-300 hover:bg-neutral-800 transition-colors">Cancelar</button>
              <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex items-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}





