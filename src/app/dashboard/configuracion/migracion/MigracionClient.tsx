'use client';

import React, { useState, useRef } from 'react';
import { Download, Upload, FileSpreadsheet, Loader2, Database, ArrowRight, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';
import initSqlJs from 'sql.js';
import { createClient } from '@/utils/supabase/client';
import { procesarImportacionGenerica } from '@/actions/migracion-actions';

type TabType = 'excel' | 'db';
type DbModeType = 'aronium' | 'universal' | null;

export default function MigracionClient({ sedes }: { sedes: any[] }) {
  const [activeTab, setActiveTab] = useState<TabType>('excel');
  const [selectedSede, setSelectedSede] = useState(sedes[0]?.id || '');
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  // --- EXCEL STATES ---
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importingExcel, setImportingExcel] = useState(false);

  // --- DB STATES ---
  const [dbFile, setDbFile] = useState<File | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbMode, setDbMode] = useState<DbModeType>(null);
  const dbRef = useRef<any>(null);

  // Aronium Auto States
  const [dbStats, setDbStats] = useState<any>(null);
  const [dbParsedData, setDbParsedData] = useState<any[]>([]);
  const [dbEntitiesData, setDbEntitiesData] = useState<any>(null);

  // Universal Mapper States
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [dbColumnsCache, setDbColumnsCache] = useState<Record<string, string[]>>({});
  
  const [univProdTable, setUnivProdTable] = useState('');
  const [univProdMap, setUnivProdMap] = useState<Record<string, string>>({});
  const [univCustTable, setUnivCustTable] = useState('');
  const [univCustMap, setUnivCustMap] = useState<Record<string, string>>({});

  const [importingDb, setImportingDb] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState('');

  const supabase = createClient();

  const excelTargetFields = [
    { key: 'nombre', label: 'Nombre del Producto (Requerido)' },
    { key: 'codigo_barras', label: 'Código de Barras' },
    { key: 'precio_venta', label: 'Precio de Venta' },
    { key: 'costo', label: 'Costo' }
  ];

  const dbProdTargetFields = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'codigo_barras', label: 'Código de Barras' },
    { key: 'precio_venta', label: 'Precio' },
    { key: 'costo', label: 'Costo' }
  ];

  const dbCustTargetFields = [
    { key: 'nombre', label: 'Nombre del Cliente' },
    { key: 'email', label: 'Correo Electrónico' },
    { key: 'telefono', label: 'Teléfono' }
  ];

  // ================== EXCEL LOGIC ==================
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


  // ================== DB LOGIC ==================
  const getTableColumns = (db: any, tableName: string) => {
    if (dbColumnsCache[tableName]) return dbColumnsCache[tableName];
    try {
      const res = db.exec(`PRAGMA table_info("${tableName}")`);
      if (res.length > 0) {
        const cols = res[0].values.map((v: any) => v[1] as string); // name is column 1
        setDbColumnsCache(prev => ({...prev, [tableName]: cols}));
        return cols;
      }
    } catch (e) {}
    return [];
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
      dbRef.current = db;

      // Extract all tables
      const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      const tables = tablesRes.length > 0 ? tablesRes[0].values.map(v => v[0] as string) : [];
      setDbTables(tables);

      // Autodetect Aronium
      if (tables.includes('Product') && tables.includes('Document') && tables.includes('Customer')) {
        setDbMode('aronium');
        await extractAroniumData(db);
      } else {
        setDbMode('universal');
        setMessage({ type: 'success', text: 'Base de datos genérica detectada. Usa el Mapeador Universal abajo.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error procesando .db: ' + err.message });
    } finally {
      setDbLoading(false);
    }
  };

  const extractAroniumData = async (db: any) => {
      let prodRes: any = [];
      try { prodRes = db.exec("SELECT Id, Name, Code as Barcode, Price, Cost FROM Product"); } 
      catch (err) {
        try { prodRes = db.exec("SELECT Id, Name, Barcode, Price, Cost FROM Product"); } 
        catch (err2) { prodRes = db.exec("SELECT Id, Name, '' as Barcode, Price, Cost FROM Product"); }
      }
      
      const catRes = db.exec("SELECT Id, Name FROM ProductGroup");
      const payRes = db.exec("SELECT Id, Name FROM PaymentType");
      
      let custRes: any = [];
      try { custRes = db.exec("SELECT Id, Name, Email, PhoneNumber FROM Customer"); } catch (e) {}
      
      const productos = prodRes.length > 0 ? prodRes[0].values.map((v: any) => ({ Id: v[0], Name: v[1], Barcode: v[2], Price: v[3], Cost: v[4] })) : [];
      const categorias = catRes.length > 0 ? catRes[0].values.map((v: any) => ({ Id: v[0], Name: v[1] })) : [];
      const metodos = payRes.length > 0 ? payRes[0].values.map((v: any) => ({ Id: v[0], Name: v[1] })) : [];
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
              fecha: row[colIdx.date], total: row[colIdx.total], descuento: row[colIdx.discount], tipo: docType === 2 ? 'venta' : 'compra',
              nombre_eventual: 'Ref Aronium: ' + row[colIdx.number], customerId: row[colIdx.customerId] || null, paidStatus: row[colIdx.paidStatus], items: []
            });
          }
          const productName = row[colIdx.productName];
          if (productName !== null && productName !== undefined) {
             facturasMap.get(docId).items.push({ nombre: productName, cantidad: row[colIdx.quantity] || 0, precio: row[colIdx.price] || 0 });
          }
        }
      }
      setDbStats({ ventas, compras, prodCount: productos.length, catCount: categorias.length, custCount: clientes.length });
      setDbParsedData(Array.from(facturasMap.values()));
  };

  const executeDbImportAronium = async () => {
    setImportingDb(true); setMessage(null); setImportProgress(0);
    try {
      setImportStatusText('Autenticando...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No estás autenticado');
      const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
      const empresaId = perfil?.empresa_id;

      setImportStatusText('Creando Categorías...');
      if (dbEntitiesData.categorias?.length > 0) {
         for (const c of dbEntitiesData.categorias) {
           await supabase.from('categorias').insert({ empresa_id: empresaId, sede_id: selectedSede, nombre: c.Name, color: '#4F46E5', icono: 'Box' });
         }
      }

      setImportStatusText('Creando Clientes...');
      const customerMap = new Map<number, string>();
      if (dbEntitiesData.clientes?.length > 0) {
         for (const c of dbEntitiesData.clientes) {
           const { data: insertedClient } = await supabase.from('clientes').insert({ empresa_id: empresaId, nombre: c.Name, email: c.Email, telefono: c.Phone }).select('id').single();
           if (insertedClient) customerMap.set(c.Id, insertedClient.id);
         }
      }

      setImportStatusText('Migrando Catálogo de Productos...');
      if (dbEntitiesData.productos?.length > 0) {
        const prodChunks = 500;
        for (let i = 0; i < dbEntitiesData.productos.length; i += prodChunks) {
          const batch = dbEntitiesData.productos.slice(i, i + prodChunks).map((p: any) => ({
            empresa_id: empresaId, sede_id: selectedSede, nombre: p.Name, codigo_barras: p.Barcode, precio_venta: p.Price, costo: p.Cost, estado_activo: true, canal_venta: 'AMBOS'
          }));
          await supabase.from('productos').insert(batch);
        }
      }

      setImportStatusText('Migrando Facturas Históricas...');
      const chunkSize = 100; let successCount = 0;
      for (let i = 0; i < dbParsedData.length; i += chunkSize) {
        const batch = dbParsedData.slice(i, i + chunkSize);
        for (const f of batch) {
           const supabaseClienteId = f.customerId ? (customerMap.get(f.customerId) || null) : null;
           const { data: pedido, error: errP } = await supabase.from('pedidos').insert({
              empresa_id: empresaId, sede_id: selectedSede, cliente_id: supabaseClienteId, nombre_eventual: f.nombre_eventual,
              total: f.total, tipo_pedido: f.tipo === 'compra' ? 'compra' : 'venta_rapida', estado: f.paidStatus === 0 ? 'pendiente' : 'cobrado', fecha_creacion: f.fecha, descuento: f.descuento || 0
           }).select('id').single();
           if (!errP && pedido && f.items?.length > 0) {
              const itemsToInsert = f.items.map((it: any) => ({ pedido_id: pedido.id, nombre_custom: it.nombre, cantidad: it.cantidad, precio_unitario: it.precio, notas: 'Migración DB' }));
              await supabase.from('detalles_pedido').insert(itemsToInsert);
           }
        }
        successCount += batch.length;
        setImportProgress(Math.round((successCount / dbParsedData.length) * 100));
        setImportStatusText(`Procesando Factura ${successCount} de ${dbParsedData.length}...`);
      }
      setMessage({ type: 'success', text: `¡Migración de Aronium completada con éxito!` });
      setDbFile(null);
    } catch (err: any) { setMessage({ type: 'error', text: err.message }); } finally { setImportingDb(false); setImportStatusText(''); }
  };

  const executeDbImportUniversal = async () => {
    if (!univProdTable && !univCustTable) return setMessage({ type: 'error', text: 'Debes seleccionar al menos una tabla para importar (Productos o Clientes).' });
    if (univProdTable && !univProdMap['nombre']) return setMessage({ type: 'error', text: 'Debes mapear el campo Nombre en Productos.' });
    if (univCustTable && !univCustMap['nombre']) return setMessage({ type: 'error', text: 'Debes mapear el campo Nombre en Clientes.' });

    setImportingDb(true); setMessage(null); setImportProgress(0);
    try {
      const db = dbRef.current;
      setImportStatusText('Autenticando...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No estás autenticado');
      const { data: perfil } = await supabase.from('perfiles').select('empresa_id').eq('id', user.id).single();
      const empresaId = perfil?.empresa_id;

      // Extract and Insert Clients
      if (univCustTable) {
        setImportStatusText('Extrayendo e importando Clientes...');
        const custFields = [univCustMap['nombre'], univCustMap['email'], univCustMap['telefono']].filter(Boolean);
        const res = db.exec(`SELECT ${custFields.join(', ')} FROM ${univCustTable}`);
        if (res.length > 0) {
          const cols = res[0].columns;
          const rows = res[0].values;
          const colIdx = cols.reduce((acc, col, idx) => ({ ...acc, [col]: idx }), {} as Record<string, number>);
          
          const batch = rows.map((row: any) => ({
             empresa_id: empresaId,
             nombre: row[colIdx[univCustMap['nombre']]],
             email: univCustMap['email'] ? row[colIdx[univCustMap['email']]] : null,
             telefono: univCustMap['telefono'] ? row[colIdx[univCustMap['telefono']]] : null
          }));
          
          for (let i = 0; i < batch.length; i += 500) {
             await supabase.from('clientes').insert(batch.slice(i, i + 500));
          }
        }
      }

      // Extract and Insert Products
      if (univProdTable) {
        setImportStatusText('Extrayendo e importando Productos...');
        const prodFields = [univProdMap['nombre'], univProdMap['codigo_barras'], univProdMap['precio_venta'], univProdMap['costo']].filter(Boolean);
        const res = db.exec(`SELECT ${prodFields.join(', ')} FROM ${univProdTable}`);
        if (res.length > 0) {
          const cols = res[0].columns;
          const rows = res[0].values;
          const colIdx = cols.reduce((acc, col, idx) => ({ ...acc, [col]: idx }), {} as Record<string, number>);
          
          const batch = rows.map((row: any) => ({
             empresa_id: empresaId, sede_id: selectedSede, estado_activo: true, canal_venta: 'AMBOS',
             nombre: row[colIdx[univProdMap['nombre']]],
             codigo_barras: univProdMap['codigo_barras'] ? row[colIdx[univProdMap['codigo_barras']]] : '',
             precio_venta: univProdMap['precio_venta'] ? parseFloat(row[colIdx[univProdMap['precio_venta']]]) : 0,
             costo: univProdMap['costo'] ? parseFloat(row[colIdx[univProdMap['costo']]]) : 0
          }));
          
          for (let i = 0; i < batch.length; i += 500) {
             await supabase.from('productos').insert(batch.slice(i, i + 500));
             setImportProgress(Math.round(((i + 500) / batch.length) * 100));
          }
        }
      }

      setMessage({ type: 'success', text: `¡Migración Universal completada!` });
      setDbFile(null);
    } catch (err: any) { setMessage({ type: 'error', text: err.message }); } finally { setImportingDb(false); setImportStatusText(''); }
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
          <button onClick={() => { setActiveTab('db'); setMessage(null); }} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'db' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-500'}`}>
            <Database size={16} className="inline mr-2" /> Migración SQLite (.db)
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
                     {excelTargetFields.map(field => (
                       <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
                         <div className="w-1/2">
                           <p className="text-sm font-bold text-neutral-900 dark:text-white">{field.label}</p>
                         </div>
                         <div className="w-1/2">
                           <select 
                             className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white"
                             value={columnMapping[field.key] || ''}
                             onChange={(e) => setColumnMapping({...columnMapping, [field.key]: e.target.value})}
                           >
                             <option value="">-- Ignorar este campo --</option>
                             {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                           </select>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 <button onClick={executeExcelImport} disabled={importingExcel} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2">
                   {importingExcel ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                   {importingExcel ? 'Procesando...' : `Importar ${excelData.length} Productos`}
                 </button>
               </div>
            )}
          </div>
        )}

        {activeTab === 'db' && (
          <div className="space-y-6 animate-in fade-in">
             {!dbFile ? (
               <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-12 text-center hover:bg-neutral-50 dark:hover:bg-neutral-950/50 transition-colors">
                 <input type="file" id="db-upload" accept=".db,sqlite" className="hidden" onChange={handleDbUpload} disabled={dbLoading} />
                 <label htmlFor="db-upload" className={`flex flex-col items-center ${dbLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                   <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/10 text-blue-600 rounded-full flex items-center justify-center mb-4">
                     {dbLoading ? <Loader2 size={32} className="animate-spin" /> : <Database size={32} />}
                   </div>
                   <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                     {dbLoading ? 'Analizando archivo .db...' : 'Sube tu base de datos SQLite (.db)'}
                   </h3>
                   <p className="text-sm text-neutral-500">Detecta Aronium automáticamente, o permite mapear cualquier otro sistema.</p>
                 </label>
               </div>
            ) : (
              <div className="space-y-6">
                 <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                   <div>
                     <p className="text-sm font-bold text-neutral-900 dark:text-white">DB: {dbFile.name} <span className="ml-2 px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded text-xs">{dbMode === 'aronium' ? '1-Click Aronium' : 'Modo Universal'}</span></p>
                   </div>
                   <button onClick={() => { setDbFile(null); setDbMode(null); }} className="text-sm text-red-500 font-bold hover:underline">Cambiar Archivo</button>
                 </div>

                 {dbMode === 'aronium' && dbStats && (
                   <div className="animate-in fade-in space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white border border-neutral-200 p-6 rounded-xl text-center shadow-sm">
                         <h4 className="text-neutral-500 font-bold text-sm mb-1">Catálogo a migrar</h4>
                         <p className="text-lg font-black text-neutral-900">{dbStats.prodCount} Prod | {dbStats.catCount} Cat | {dbStats.custCount} Cli</p>
                       </div>
                       <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl text-center shadow-sm">
                         <h4 className="text-emerald-800 font-bold text-sm mb-1">Histórico de Ventas</h4>
                         <p className="text-3xl font-black text-emerald-600">{dbStats.ventas} Docs</p>
                       </div>
                     </div>
                     {importingDb && (
                       <div className="flex flex-col gap-2">
                         <div className="flex justify-between text-xs font-bold text-neutral-500"><span>{importStatusText}</span><span>{importProgress > 100 ? 100 : importProgress}%</span></div>
                         <div className="w-full bg-neutral-200 rounded-full h-4"><div className="bg-blue-600 h-4 transition-all duration-300" style={{ width: `${Math.min(importProgress, 100)}%` }}></div></div>
                       </div>
                     )}
                     <button onClick={executeDbImportAronium} disabled={importingDb} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2">
                       {importingDb ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                       {importingDb ? 'Trabajando directamente con Supabase...' : `Iniciar Migración Maestra Aronium`}
                     </button>
                   </div>
                 )}

                 {dbMode === 'universal' && (
                   <div className="animate-in fade-in space-y-6">
                     <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 text-sm">
                       <Settings className="inline mr-2 mb-1" size={16}/>
                       <strong>Modo Universal:</strong> El sistema no detectó Aronium. Puedes mapear manualmente las tablas de Productos y Clientes de tu archivo.
                     </div>

                     {/* Productos Mapper */}
                     <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                       <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                         <h3 className="font-bold">Mapeo de Productos</h3>
                         <select value={univProdTable} onChange={e => { setUnivProdTable(e.target.value); getTableColumns(dbRef.current, e.target.value); }} className="bg-white border rounded px-2 py-1 text-sm w-full sm:w-auto">
                           <option value="">Seleccionar Tabla de Productos...</option>
                           {dbTables.map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                       </div>
                       {univProdTable && (
                         <div className="divide-y divide-neutral-200 p-4">
                           {dbProdTargetFields.map(field => (
                             <div key={field.key} className="flex items-center justify-between py-2">
                               <span className="text-sm font-semibold">{field.label}</span>
                               <select value={univProdMap[field.key] || ''} onChange={e => setUnivProdMap({...univProdMap, [field.key]: e.target.value})} className="border rounded px-2 py-1 text-sm w-1/2">
                                 <option value="">-- Ignorar --</option>
                                 {dbColumnsCache[univProdTable]?.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>

                     {/* Clientes Mapper */}
                     <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                       <div className="bg-neutral-50 px-6 py-4 border-b border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                         <h3 className="font-bold">Mapeo de Clientes</h3>
                         <select value={univCustTable} onChange={e => { setUnivCustTable(e.target.value); getTableColumns(dbRef.current, e.target.value); }} className="bg-white border rounded px-2 py-1 text-sm w-full sm:w-auto">
                           <option value="">Seleccionar Tabla de Clientes...</option>
                           {dbTables.map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                       </div>
                       {univCustTable && (
                         <div className="divide-y divide-neutral-200 p-4">
                           {dbCustTargetFields.map(field => (
                             <div key={field.key} className="flex items-center justify-between py-2">
                               <span className="text-sm font-semibold">{field.label}</span>
                               <select value={univCustMap[field.key] || ''} onChange={e => setUnivCustMap({...univCustMap, [field.key]: e.target.value})} className="border rounded px-2 py-1 text-sm w-1/2">
                                 <option value="">-- Ignorar --</option>
                                 {dbColumnsCache[univCustTable]?.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>

                     {importingDb && (
                       <div className="flex flex-col gap-2">
                         <div className="flex justify-between text-xs font-bold text-neutral-500"><span>{importStatusText}</span><span>{importProgress}%</span></div>
                         <div className="w-full bg-neutral-200 rounded-full h-4"><div className="bg-blue-600 h-4 transition-all duration-300" style={{ width: `${Math.min(importProgress, 100)}%` }}></div></div>
                       </div>
                     )}
                     <button onClick={executeDbImportUniversal} disabled={importingDb || (!univProdTable && !univCustTable)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold">
                       {importingDb ? 'Importando Modo Universal...' : 'Ejecutar Migración Universal'}
                     </button>
                   </div>
                 )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
