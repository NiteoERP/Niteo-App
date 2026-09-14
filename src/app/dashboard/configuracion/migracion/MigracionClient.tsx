'use client';

import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, Loader2, Database, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import initSqlJs from 'sql.js';
import { createClient } from '@/utils/supabase/client';
import { procesarImportacionGenerica } from '@/actions/migracion-actions';

type TabType = 'excel' | 'aronium';

export default function MigracionClient({ sedes }: { sedes: any[] }) {
  const [activeTab, setActiveTab] = useState<TabType>('excel');
  const [selectedSede, setSelectedSede] = useState(sedes[0]?.id || '');
  
  // Excel states
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importingExcel, setImportingExcel] = useState(false);
  
  // DB states
  const [dbFile, setDbFile] = useState<File | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [dbParsedData, setDbParsedData] = useState<any[]>([]);
  const [dbEntitiesData, setDbEntitiesData] = useState<any>(null);
  const [importingDb, setImportingDb] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState('');

  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  const supabase = createClient();

  const targetFields = [
    { key: 'nombre', label: 'Nombre del Producto (Requerido)' },
    { key: 'codigo_barras', label: 'Código de Barras' },
    { key: 'precio_venta', label: 'Precio de Venta' },
    { key: 'costo', label: 'Costo' }
  ];

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const headers = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] as string[];
        setExcelHeaders(headers || []);
        setExcelData(XLSX.utils.sheet_to_json(ws));
        const autoMap: Record<string, string> = {};
        headers.forEach(h => {
           const lowH = h.toLowerCase();
           if (lowH.includes('nombre') || lowH.includes('name') || lowH.includes('producto')) autoMap['nombre'] = h;
           else if (lowH.includes('precio') || lowH.includes('price')) autoMap['precio_venta'] = h;
           else if (lowH.includes('costo') || lowH.includes('cost')) autoMap['costo'] = h;
           else if (lowH.includes('codigo') || lowH.includes('sku') || lowH.includes('barras')) autoMap['codigo_barras'] = h;
        });
        setColumnMapping(autoMap);
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message });
      }
    };
    reader.readAsBinaryString(file);
  };

  const executeExcelImport = async () => {
    if (!columnMapping['nombre']) return setMessage({ type: 'error', text: 'Mapea el nombre obligatoriamente.' });
    setImportingExcel(true);
    try {
      const mapped = excelData.map(row => ({
        nombre: row[columnMapping['nombre']],
        codigo_barras: columnMapping['codigo_barras'] ? row[columnMapping['codigo_barras']] : '',
        precio_venta: columnMapping['precio_venta'] ? parseFloat(row[columnMapping['precio_venta']]) : 0,
        costo: columnMapping['costo'] ? parseFloat(row[columnMapping['costo']]) : 0,
        unidad_medida: 'unidades',
        precio_modificable: false
      })).filter(p => p.nombre);
      const res = await procesarImportacionGenerica(mapped, selectedSede);
      if (res.success) {
        setMessage({ type: 'success', text: `¡Se importaron ${res.count} productos exitosamente!` });
        setExcelFile(null);
      } else setMessage({ type: 'error', text: res.error || 'Error en la importación' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setImportingExcel(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      "Nombre del Producto": "Coca Cola 2L",
      "Codigo de Barras": "759123456789",
      "Precio Venta": 2.50,
      "Costo": 1.50
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Niteo");
    XLSX.writeFile(wb, "Niteo_Plantilla_Inventario.xlsx");
  };

  const handleDbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDbFile(file);
    setDbLoading(true);
    setMessage(null);

    try {
      const SQL = await initSqlJs({ locateFile: file => "/assets/sql-wasm.wasm" });
      const buffer = await file.arrayBuffer();
      const db = new SQL.Database(new Uint8Array(buffer));

      const prodRes = db.exec("SELECT Id, Name, Barcode, Price, Cost FROM Product");
      const catRes = db.exec("SELECT Id, Name FROM ProductGroup");
      const payRes = db.exec("SELECT Id, Name FROM PaymentType");
      
      let custRes: any = [];
      try { custRes = db.exec("SELECT Id, Name, Email, PhoneNumber FROM Customer"); } catch (e) {}
      
      const productos = prodRes.length > 0 ? prodRes[0].values.map(v => ({ Id: v[0], Name: v[1], Barcode: v[2], Price: v[3], Cost: v[4] })) : [];
      const categorias = catRes.length > 0 ? catRes[0].values.map(v => ({ Id: v[0], Name: v[1] })) : [];
      const metodos = payRes.length > 0 ? payRes[0].values.map(v => ({ Id: v[0], Name: v[1] })) : [];
      const clientes = custRes.length > 0 ? custRes[0].values.map((v: any) => ({ Id: v[0], Name: v[1], Email: v[2], Phone: v[3] })) : [];
      
      setDbEntitiesData({ productos, categorias, metodos, clientes });

      const docsResult = db.exec(`
        SELECT d.Id as docId, d.Date as date, d.Total as total, d.Discount as discount, d.DocumentTypeId as docType, d.Number as number, d.CustomerId as customerId, d.PaidStatus as paidStatus, di.Quantity as quantity, di.Price as price, p.Name as productName
        FROM Document d
        LEFT JOIN DocumentItem di ON d.Id = di.DocumentId
        LEFT JOIN Product p ON di.ProductId = p.Id
        WHERE d.DocumentTypeId IN (2, 5)
        ORDER BY d.Id
      `);
      
      let facturasMap = new Map<number, any>();
      let ventas = 0; let compras = 0;

      if (docsResult.length > 0) {
        const columns = docsResult[0].columns;
        const rows = docsResult[0].values;
        const colIdx = columns.reduce((acc, col, idx) => ({ ...acc, [col]: idx }), {} as Record<string, number>);

        for (const row of rows) {
          const docId = row[colIdx.docId] as number;
          const docType = row[colIdx.docType] as number;
          
          if (!facturasMap.has(docId)) {
            if (docType === 2) ventas++;
            if (docType === 5) compras++;
            facturasMap.set(docId, {
              fecha: row[colIdx.date],
              total: row[colIdx.total],
              descuento: row[colIdx.discount],
              tipo: docType === 2 ? 'venta' : 'compra',
              nombre_eventual: 'Ref Aronium: ' + row[colIdx.number],
              customerId: row[colIdx.customerId] || null,
              paidStatus: row[colIdx.paidStatus],
              items: []
            });
          }
          const productName = row[colIdx.productName];
          if (productName !== null && productName !== undefined) {
             facturasMap.get(docId).items.push({
               nombre: productName,
               cantidad: row[colIdx.quantity] || 0,
               precio: row[colIdx.price] || 0
             });
          }
        }
      }

      setDbStats({ ventas, compras, prodCount: productos.length, catCount: categorias.length, custCount: clientes.length });
      setDbParsedData(Array.from(facturasMap.values()));
      
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error procesando .db: ' + err.message });
    } finally {
      setDbLoading(false);
    }
  };

  const executeDbImportDirect = async () => {
    setImportingDb(true);
    setMessage(null);
    setImportProgress(0);
    
    try {
      setImportStatusText('Autenticando...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No estás autenticado');
      
      const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
      if (!perfil) throw new Error('No se encontró tu perfil de empresa');
      const empresaId = perfil.empresa_id;

      setImportStatusText('Creando Categorías...');
      if (dbEntitiesData.categorias && dbEntitiesData.categorias.length > 0) {
         for (const c of dbEntitiesData.categorias) {
           await supabase.from('categorias').insert({ empresa_id: empresaId, sede_id: selectedSede, nombre: c.Name, color: '#4F46E5', icono: 'Box' });
         }
      }

      setImportStatusText('Creando Clientes...');
      const customerMap = new Map<number, string>();
      if (dbEntitiesData.clientes && dbEntitiesData.clientes.length > 0) {
         for (const c of dbEntitiesData.clientes) {
           const { data: insertedClient } = await supabase.from('clientes').insert({ 
             empresa_id: empresaId, nombre: c.Name, email: c.Email || null, telefono: c.Phone || null
           }).select('id').single();
           if (insertedClient) customerMap.set(c.Id, insertedClient.id);
         }
      }

      setImportStatusText('Migrando Catálogo de Productos...');
      if (dbEntitiesData.productos && dbEntitiesData.productos.length > 0) {
        const prodChunks = 500;
        for (let i = 0; i < dbEntitiesData.productos.length; i += prodChunks) {
          const batch = dbEntitiesData.productos.slice(i, i + prodChunks).map((p: any) => ({
            empresa_id: empresaId, sede_id: selectedSede, nombre: p.Name, codigo_barras: p.Barcode || '', precio_venta: p.Price || 0, costo: p.Cost || 0, estado_activo: true, canal_venta: 'AMBOS'
          }));
          await supabase.from('productos').insert(batch);
        }
      }

      setImportStatusText('Migrando Facturas Históricas...');
      const chunkSize = 100; 
      let successCount = 0;
      
      for (let i = 0; i < dbParsedData.length; i += chunkSize) {
        const batch = dbParsedData.slice(i, i + chunkSize);
        for (const f of batch) {
           const supabaseClienteId = f.customerId ? (customerMap.get(f.customerId) || null) : null;
           const { data: pedido, error: errP } = await supabase.from('pedidos').insert({
              empresa_id: empresaId, sede_id: selectedSede, 
              cliente_id: supabaseClienteId, 
              nombre_eventual: f.nombre_eventual || 'Migracion Aronium',
              total: f.total, tipo_pedido: f.tipo === 'compra' ? 'compra' : 'venta_rapida', 
              estado: f.paidStatus === 0 ? 'pendiente' : 'cobrado',
              fecha_creacion: f.fecha, descuento: f.descuento || 0
           }).select('id').single();
           
           if (!errP && pedido && f.items && f.items.length > 0) {
              const itemsToInsert = f.items.map((it: any) => ({
                 pedido_id: pedido.id, nombre_custom: it.nombre, cantidad: it.cantidad, precio_unitario: it.precio, notas: 'Migración DB'
              }));
              await supabase.from('detalles_pedido').insert(itemsToInsert);
           }
        }
        successCount += batch.length;
        setImportProgress(Math.round((successCount / dbParsedData.length) * 100));
        setImportStatusText(`Procesando Factura ${successCount} de ${dbParsedData.length}...`);
      }

      setMessage({ type: 'success', text: `¡Se migraron los catálogos y ${successCount} facturas históricas! Completado al 100% (Bypass Vercel)` });
      setDbFile(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setImportingDb(false);
      setImportStatusText('');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-800">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Niteo Data Studio</h2>
            <p className="text-sm text-neutral-500">Módulo de Importación Universal y Migración Histórica</p>
          </div>
          
          <div className="w-full sm:w-64">
            <label className="text-xs font-semibold text-neutral-500 mb-1 block">Sede Destino</label>
            <select value={selectedSede} onChange={e => setSelectedSede(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm">
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre_sede}</option>)}
            </select>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-semibold text-sm">{message.text}</span>
          </div>
        )}

        <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-6">
          <button onClick={() => { setActiveTab('excel'); setMessage(null); }} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'excel' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-500'}`}>
            <FileSpreadsheet size={16} className="inline mr-2" /> Productos e Inventario (.xlsx / .csv)
          </button>
          <button onClick={() => { setActiveTab('aronium'); setMessage(null); }} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'aronium' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-500'}`}>
            <Database size={16} className="inline mr-2" /> Aronium Auto-Migration (.db)
          </button>
        </div>

        {activeTab === 'excel' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-end">
               <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm text-indigo-600 font-bold hover:underline">
                 <Download size={16} /> Descargar Plantilla Excel de Ejemplo
               </button>
            </div>

            {!excelFile ? (
               <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-12 text-center hover:bg-neutral-50 dark:hover:bg-neutral-950/50 transition-colors">
                 <input type="file" id="excel-upload" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
                 <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
                   <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                     <Upload size={32} />
                   </div>
                   <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Selecciona un archivo Excel o CSV</h3>
                   <p className="text-sm text-neutral-500">Sube tu listado de productos para mapearlo dinámicamente.</p>
                 </label>
               </div>
            ) : (
               <div className="space-y-6">
                 <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                   <div>
                     <p className="text-sm font-bold text-neutral-900 dark:text-white">Archivo Listo: {excelFile.name}</p>
                     <p className="text-xs text-neutral-500">{excelData.length} filas detectadas</p>
                   </div>
                   <button onClick={() => setExcelFile(null)} className="text-sm text-red-500 font-bold hover:underline">Cambiar Archivo</button>
                 </div>

                 <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                   <div className="bg-neutral-50 dark:bg-neutral-950 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
                     <h3 className="font-bold text-neutral-900 dark:text-white">Mapeo de Columnas (Data Mapper)</h3>
                     <p className="text-xs text-neutral-500">Relaciona los campos de tu archivo con los campos de Niteo.</p>
                   </div>
                   
                   <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                     {targetFields.map(field => (
                       <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
                         <div className="w-1/2">
                           <p className="text-sm font-bold text-neutral-900 dark:text-white">{field.label}</p>
                           <p className="text-xs text-neutral-500">Campo interno: {field.key}</p>
                         </div>
                         <div className="w-1/2">
                           <select 
                             className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white"
                             value={columnMapping[field.key] || ''}
                             onChange={(e) => setColumnMapping({...columnMapping, [field.key]: e.target.value})}
                           >
                             <option value="">-- Ignorar este campo --</option>
                             {excelHeaders.map(h => (
                               <option key={h} value={h}>{h}</option>
                             ))}
                           </select>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 <button 
                   onClick={executeExcelImport}
                   disabled={importingExcel}
                   className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2"
                 >
                   {importingExcel ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                   {importingExcel ? 'Procesando e Importando...' : `Importar ${excelData.length} Productos`}
                 </button>
               </div>
            )}
          </div>
        )}

        {activeTab === 'aronium' && (
          <div className="space-y-6 animate-in fade-in">
             {!dbFile ? (
               <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-12 text-center hover:bg-neutral-50 dark:hover:bg-neutral-950/50 transition-colors">
                 <input type="file" id="db-upload" accept=".db,sqlite" className="hidden" onChange={handleDbUpload} disabled={dbLoading} />
                 <label htmlFor="db-upload" className={`flex flex-col items-center ${dbLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                   <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/10 text-blue-600 rounded-full flex items-center justify-center mb-4">
                     {dbLoading ? <Loader2 size={32} className="animate-spin" /> : <Database size={32} />}
                   </div>
                   <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                     {dbLoading ? 'Extrayendo 30,000+ filas localmente...' : 'Selecciona el backup local de Aronium (.db)'}
                   </h3>
                   <p className="text-sm text-neutral-500">Se migrarán Categorías, Productos, Métodos de Pago y el Histórico de Facturas.</p>
                 </label>
               </div>
            ) : (
              <div className="space-y-6">
                 <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                   <div>
                     <p className="text-sm font-bold text-neutral-900 dark:text-white">Base de datos analizada: {dbFile.name}</p>
                   </div>
                   <button onClick={() => { setDbFile(null); setDbParsedData([]); }} className="text-sm text-red-500 font-bold hover:underline">Cancelar</button>
                 </div>

                 {dbStats && (
                   <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white border border-neutral-200 p-6 rounded-xl text-center shadow-sm">
                       <h4 className="text-neutral-500 font-bold text-sm mb-1">Catálogo a migrar</h4>
                       <p className="text-lg font-black text-neutral-900">{dbStats.prodCount} Prod | {dbStats.catCount} Cat | {dbStats.custCount} Clientes</p>
                     </div>
                     <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl text-center shadow-sm">
                       <h4 className="text-emerald-800 font-bold text-sm mb-1">Histórico de Ventas</h4>
                       <p className="text-3xl font-black text-emerald-600">{dbStats.ventas} Docs</p>
                     </div>
                   </div>
                 )}

                 {importingDb && (
                   <div className="flex flex-col gap-2 mb-4">
                     <div className="flex justify-between text-xs font-bold text-neutral-500">
                        <span>{importStatusText}</span>
                        <span>{importProgress > 100 ? 100 : importProgress}%</span>
                     </div>
                     <div className="w-full bg-neutral-200 rounded-full h-4 overflow-hidden">
                        <div className="bg-blue-600 h-4 transition-all duration-300" style={{ width: `${Math.min(importProgress, 100)}%` }}></div>
                     </div>
                   </div>
                 )}

                 <button 
                   onClick={executeDbImportDirect}
                   disabled={importingDb}
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2"
                 >
                   {importingDb ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                   {importingDb ? 'Trabajando directamente con Supabase...' : `Iniciar Migración Maestra Automática (Direct To Supabase)`}
                 </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
