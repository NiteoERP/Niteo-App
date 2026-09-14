'use client';

import React, { useState, useEffect } from 'react';
import { Download, Upload, FileSpreadsheet, Loader2, Database, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportarCatalogo, procesarImportacionGenerica, procesarHistoricoAronium } from '@/actions/migracion-actions';
import initSqlJs from 'sql.js';

type TabType = 'excel' | 'aronium';

export default function MigracionClient({ sedes }: { sedes: any[] }) {
  const [activeTab, setActiveTab] = useState<TabType>('excel');
  const [selectedSede, setSelectedSede] = useState(sedes[0]?.id || '');
  
  // States for Excel/CSV Data Mapper
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importingExcel, setImportingExcel] = useState(false);
  
  // States for Aronium .db
  const [dbFile, setDbFile] = useState<File | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbStats, setDbStats] = useState<{ ventas: number; compras: number } | null>(null);
  const [dbParsedData, setDbParsedData] = useState<any[]>([]);
  const [importingDb, setImportingDb] = useState(false);

  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  const targetFields = [
    { key: 'nombre', label: 'Nombre del Producto (Requerido)' },
    { key: 'codigo_barras', label: 'Código de Barras' },
    { key: 'precio_venta', label: 'Precio de Venta' },
    { key: 'costo', label: 'Costo' },
    { key: 'unidad_medida', label: 'Unidad de Medida' },
  ];

  // --- Excel Handling ---
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Extract headers
        const headers: string[] = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] as string[];
        setExcelHeaders(headers || []);
        
        // Extract raw data
        const data = XLSX.utils.sheet_to_json(ws);
        setExcelData(data);
        
        // Auto-map logic if headers match closely
        const autoMap: Record<string, string> = {};
        headers.forEach(h => {
           const lowH = h.toLowerCase();
           if (lowH.includes('nombre') || lowH.includes('name')) autoMap['nombre'] = h;
           else if (lowH.includes('precio') || lowH.includes('price')) autoMap['precio_venta'] = h;
           else if (lowH.includes('costo') || lowH.includes('cost')) autoMap['costo'] = h;
           else if (lowH.includes('código') || lowH.includes('codigo') || lowH.includes('sku') || lowH.includes('barras')) autoMap['codigo_barras'] = h;
        });
        setColumnMapping(autoMap);
      } catch (err: any) {
        setMessage({ type: 'error', text: 'Error leyendo archivo Excel: ' + err.message });
      }
    };
    reader.readAsBinaryString(file);
  };

  const executeExcelImport = async () => {
    if (!columnMapping['nombre']) {
      setMessage({ type: 'error', text: 'Debes mapear al menos el Nombre del Producto.' });
      return;
    }
    setImportingExcel(true);
    setMessage(null);

    try {
      const mappedData = excelData.map(row => {
        return {
          nombre: row[columnMapping['nombre']],
          codigo_barras: columnMapping['codigo_barras'] ? row[columnMapping['codigo_barras']] : '',
          precio_venta: columnMapping['precio_venta'] ? parseFloat(row[columnMapping['precio_venta']]) : 0,
          costo: columnMapping['costo'] ? parseFloat(row[columnMapping['costo']]) : 0,
          unidad_medida: columnMapping['unidad_medida'] ? row[columnMapping['unidad_medida']] : 'unidades',
          precio_modificable: false
        };
      }).filter(p => p.nombre);

      const res = await procesarImportacionGenerica(mappedData, selectedSede);
      if (res.success) {
        setMessage({ type: 'success', text: `¡Se importaron ${res.count} productos exitosamente!` });
        setExcelFile(null);
      } else {
        setMessage({ type: 'error', text: res.error || 'Error en la importación.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setImportingExcel(false);
    }
  };

  // --- Aronium DB Handling ---
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

      // OPTIMIZACIÓN: Hacer una sola consulta con JOIN para evitar el problema de N+1 que congela el navegador (con 15000+ facturas)
      const docsResult = db.exec(`
        SELECT 
          d.Id as docId, d.Date as date, d.Total as total, d.Discount as discount, d.DocumentTypeId as docType, d.Number as number,
          di.Quantity as quantity, di.Price as price, 
          p.Name as productName
        FROM Document d
        LEFT JOIN DocumentItem di ON d.Id = di.DocumentId
        LEFT JOIN Product p ON di.ProductId = p.Id
        WHERE d.DocumentTypeId IN (2, 5)
        ORDER BY d.Id
      `);
      
      let facturasMap = new Map<number, any>();
      let ventas = 0;
      let compras = 0;

      if (docsResult.length > 0) {
        const columns = docsResult[0].columns;
        const rows = docsResult[0].values;
        
        // Map column names to indices for safety
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

          // Si hay items (LEFT JOIN puede traer NULL si la factura está vacía, pero en Aronium es raro)
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

      setDbStats({ ventas, compras });
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
    try {
      const res = await procesarHistoricoAronium(dbParsedData, selectedSede);
      if (res.success) {
        setMessage({ type: 'success', text: `¡Se procesaron ${res.count} facturas históricas!` });
        setDbFile(null);
      } else {
        setMessage({ type: 'error', text: res.error || 'Error al guardar.' });
      }
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
            <select 
              value={selectedSede} 
              onChange={e => setSelectedSede(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm"
            >
              {sedes.map(s => (
                <option key={s.id} value={s.id}>{s.nombre_sede}</option>
              ))}
            </select>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-semibold text-sm">{message.text}</span>
          </div>
        )}

        <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-6">
          <button 
            onClick={() => { setActiveTab('excel'); setMessage(null); }}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'excel' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            <FileSpreadsheet size={16} className="inline mr-2" />
            Productos e Inventario (.xlsx / .csv)
          </button>
          <button 
            onClick={() => { setActiveTab('aronium'); setMessage(null); }}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'aronium' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
          >
            <Database size={16} className="inline mr-2" />
            Histórico Aronium (.db)
          </button>
        </div>

        {activeTab === 'excel' && (
          <div className="space-y-6 animate-in fade-in">
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
                     {dbLoading ? 'Analizando Base de Datos...' : 'Selecciona el archivo niteo_pos.db o lite.db'}
                   </h3>
                   <p className="text-sm text-neutral-500">Niteo Data Studio leerá tu archivo localmente y extraerá tu histórico de compras y ventas.</p>
                 </label>
               </div>
            ) : (
              <div className="space-y-6">
                 <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                   <div>
                     <p className="text-sm font-bold text-neutral-900 dark:text-white">Base de datos lista: {dbFile.name}</p>
                     <p className="text-xs text-neutral-500">Análisis completado localmente (WASM)</p>
                   </div>
                   <button onClick={() => { setDbFile(null); setDbParsedData([]); }} className="text-sm text-red-500 font-bold hover:underline">Cancelar</button>
                 </div>

                 {dbStats && (
                   <div className="grid grid-cols-2 gap-4">
                     <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-6 rounded-xl text-center">
                       <h4 className="text-emerald-800 dark:text-emerald-400 font-bold text-lg mb-1">Facturas de Venta</h4>
                       <p className="text-4xl font-black text-emerald-600">{dbStats.ventas}</p>
                     </div>
                     <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-6 rounded-xl text-center">
                       <h4 className="text-amber-800 dark:text-amber-400 font-bold text-lg mb-1">Facturas de Compra</h4>
                       <p className="text-4xl font-black text-amber-600">{dbStats.compras}</p>
                     </div>
                   </div>
                 )}

                 <button 
                   onClick={executeDbImport}
                   disabled={importingDb || dbParsedData.length === 0}
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold flex justify-center items-center gap-2"
                 >
                   {importingDb ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                   {importingDb ? 'Inyectando facturas a Supabase...' : `Migrar ${dbParsedData.length} Documentos a Niteo Cloud`}
                 </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
