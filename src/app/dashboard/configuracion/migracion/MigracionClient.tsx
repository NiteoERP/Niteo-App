'use client';

import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, Loader2, Database, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { procesarImportacionGenerica, procesarHistoricoAronium, procesarEntidadesAronium } from '@/actions/migracion-actions';
import initSqlJs from 'sql.js';

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

  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // [Omitted standard excel load]
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
           if (lowH.includes('nombre')) autoMap['nombre'] = h;
           else if (lowH.includes('precio')) autoMap['precio_venta'] = h;
           else if (lowH.includes('costo')) autoMap['costo'] = h;
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
    if (!columnMapping['nombre']) return setMessage({ type: 'error', text: 'Mapea el nombre.' });
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
        setMessage({ type: 'success', text: `¡Se importaron ${res.count} productos!` });
        setExcelFile(null);
      } else setMessage({ type: 'error', text: res.error || 'Error' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setImportingExcel(false);
    }
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

      // Extraer Entidades Base
      const prodRes = db.exec("SELECT Id, Name, Barcode, Price, Cost FROM Product");
      const catRes = db.exec("SELECT Id, Name FROM ProductGroup");
      const payRes = db.exec("SELECT Id, Name FROM PaymentType");
      
      const productos = prodRes.length > 0 ? prodRes[0].values.map(v => ({ Id: v[0], Name: v[1], Barcode: v[2], Price: v[3], Cost: v[4] })) : [];
      const categorias = catRes.length > 0 ? catRes[0].values.map(v => ({ Id: v[0], Name: v[1] })) : [];
      const metodos = payRes.length > 0 ? payRes[0].values.map(v => ({ Id: v[0], Name: v[1] })) : [];
      
      setDbEntitiesData({ productos, categorias, metodos });

      // Extraer Facturas con JOIN optimizado
      const docsResult = db.exec(`
        SELECT d.Id as docId, d.Date as date, d.Total as total, d.Discount as discount, d.DocumentTypeId as docType, d.Number as number, di.Quantity as quantity, di.Price as price, p.Name as productName
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

      setDbStats({ ventas, compras, prodCount: productos.length, catCount: categorias.length });
      setDbParsedData(Array.from(facturasMap.values()));
      
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error procesando .db: ' + err.message });
    } finally {
      setDbLoading(false);
    }
  };

  const executeDbImport = async () => {
    setImportingDb(true);
    setMessage(null);
    setImportProgress(0);
    try {
      // 1. Migrar Entidades Base
      await procesarEntidadesAronium(dbEntitiesData, selectedSede);

      // 2. Migrar Facturas por Lotes (Chunks) para evitar Vercel Timeout
      const chunkSize = 200; // 200 facturas a la vez
      let successCount = 0;
      
      for (let i = 0; i < dbParsedData.length; i += chunkSize) {
        const batch = dbParsedData.slice(i, i + chunkSize);
        const res = await procesarHistoricoAronium(batch, selectedSede);
        if (res.success) {
           successCount += res.count;
           setImportProgress(Math.round(((i + chunkSize) / dbParsedData.length) * 100));
        } else {
           throw new Error(res.error);
        }
      }

      setMessage({ type: 'success', text: `¡Se migraron los catálogos y ${successCount} facturas históricas con éxito!` });
      setDbFile(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setImportingDb(false);
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
            {/* Excel Upload UI (omitted for brevity, keep simple button) */}
            <input type="file" onChange={handleExcelUpload} />
            {excelFile && (
               <button onClick={executeExcelImport} disabled={importingExcel} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">
                 {importingExcel ? 'Procesando...' : `Importar ${excelData.length} Productos`}
               </button>
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
                       <p className="text-2xl font-black text-neutral-900">{dbStats.prodCount} Productos / {dbStats.catCount} Categorías</p>
                     </div>
                     <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl text-center shadow-sm">
                       <h4 className="text-emerald-800 font-bold text-sm mb-1">Histórico de Ventas</h4>
                       <p className="text-3xl font-black text-emerald-600">{dbStats.ventas} Docs</p>
                     </div>
                   </div>
                 )}

                 {importingDb && (
                   <div className="w-full bg-neutral-200 rounded-full h-4 mb-4 overflow-hidden">
                      <div className="bg-blue-600 h-4 transition-all duration-300" style={{ width: `${Math.min(importProgress, 100)}%` }}></div>
                   </div>
                 )}

                 <button 
                   onClick={executeDbImport}
                   disabled={importingDb}
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2"
                 >
                   {importingDb ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                   {importingDb ? `Sincronizando con Supabase... ${importProgress > 100 ? 100 : importProgress}%` : `Iniciar Migración Maestra Automática`}
                 </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
