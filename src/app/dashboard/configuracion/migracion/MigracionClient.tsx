"use client";
import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, Loader2, Zap, ShieldCheck, Database, Tag } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/client';
import { procesarImportacionUniversal, importarCategorias } from '@/actions/migracion-actions';

type TabType = 'excel' | 'categorias' | 'db';

export default function MigracionClient({ sedes }: { sedes: any[] }) {
  const [activeTab, setActiveTab] = useState<TabType>('excel');
  const [selectedSede, setSelectedSede] = useState(sedes[0]?.id || '');
  const [message, setMessage] = useState<{ type: 'success'|'error', text: string } | null>(null);

  // --- EXCEL STATES (PRODUCTOS) ---
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importingExcel, setImportingExcel] = useState(false);

  // --- EXCEL STATES (CATEGORIAS) ---
  const [catFile, setCatFile] = useState<File | null>(null);
  const [catHeaders, setCatHeaders] = useState<string[]>([]);
  const [catData, setCatData] = useState<any[]>([]);
  const [catColumnMapping, setCatColumnMapping] = useState<Record<string, string>>({});
  const [importingCats, setImportingCats] = useState(false);

  const supabase = createClient();

  const excelTargetFields = [
    { key: 'nombre', label: 'Nombre del Producto (Requerido)' },
    { key: 'categoria', label: 'Categoría (Opcional)' },
    { key: 'descripcion', label: 'Descripción (Opcional)' },
    { key: 'codigo_barras', label: 'Código de Barras' },
    { key: 'precio_venta', label: 'Precio de Venta' },
    { key: 'costo', label: 'Costo' },
    { key: 'cantidad', label: 'Cantidad en Inventario (Stock Inicial)' }
  ];

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      "Nombre del Producto": "Coca Cola 2L",
      "Categoría": "Bebidas",
      "Descripción": "Refresco original 2 litros",
      "Código de Barras": "123456789",
      "Precio Venta": 2.50,
      "Costo": 1.50,
      "Cantidad / Stock": 20
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
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
           if (lowH.includes('nombre')) autoMap['nombre'] = h;
           else if (lowH.includes('cat') || lowH.includes('rubro') || lowH.includes('departamento') || lowH.includes('grupo')) autoMap['categoria'] = h;
           else if (lowH.includes('desc') || lowH.includes('detalle') || lowH.includes('nota')) autoMap['descripcion'] = h;
           else if (lowH.includes('barras') || lowH.includes('barcode')) autoMap['codigo_barras'] = h;
           else if (lowH.includes('precio') || lowH.includes('price')) autoMap['precio_venta'] = h;
           else if (lowH.includes('cost')) autoMap['costo'] = h;
           else if (lowH.includes('cant') || lowH.includes('stock') || lowH.includes('existencia') || lowH.includes('inv') || lowH.includes('qty')) autoMap['cantidad'] = h;
        });
        setColumnMapping(autoMap);
      } catch (err) {
        setMessage({ type: 'error', text: 'El archivo Excel no es válido.' });
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
        categoria: columnMapping['categoria'] && row[columnMapping['categoria']] !== undefined ? String(row[columnMapping['categoria']]).trim() : '',
        descripcion: columnMapping['descripcion'] && row[columnMapping['descripcion']] !== undefined ? String(row[columnMapping['descripcion']]).trim() : '',
        codigo_barras: columnMapping['codigo_barras'] ? row[columnMapping['codigo_barras']] : '',
        precio_venta: columnMapping['precio_venta'] ? parseFloat(row[columnMapping['precio_venta']]) : 0,
        costo: columnMapping['costo'] ? parseFloat(row[columnMapping['costo']]) : 0,
        cantidad: columnMapping['cantidad'] && row[columnMapping['cantidad']] !== undefined && row[columnMapping['cantidad']] !== ''
          ? parseFloat(row[columnMapping['cantidad']])
          : null,
      })).filter(x => x.nombre);

      const res = await procesarImportacionUniversal(mapped, selectedSede);
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

  const catTargetFields = [
    { key: 'nombre', label: 'Nombre de la Categoría (Requerido)' }
  ];

  const downloadCatTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Nombre de la Categoría": "Bebidas" },
      { "Nombre de la Categoría": "Comidas y Platos" },
      { "Nombre de la Categoría": "Postres y Dulces" },
      { "Nombre de la Categoría": "Snacks y Golosinas" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Categorías");
    XLSX.writeFile(wb, "Niteo_Plantilla_Categorias.xlsx");
  };

  const handleCatExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCatFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const headers = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] as string[];
        setCatHeaders(headers || []);
        setCatData(XLSX.utils.sheet_to_json(ws));
        const autoMap: Record<string, string> = {};
        headers.forEach(h => {
          const lowH = h.toLowerCase();
          if (lowH.includes('cat') || lowH.includes('nombre') || lowH.includes('rubro') || lowH.includes('grupo')) {
            autoMap['nombre'] = h;
          }
        });
        setCatColumnMapping(autoMap);
      } catch (err) {
        setMessage({ type: 'error', text: 'El archivo Excel no es válido.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const executeCatImport = async () => {
    if (!catColumnMapping['nombre']) return setMessage({ type: 'error', text: 'Mapea la columna con el nombre de la categoría.' });
    setImportingCats(true);
    try {
      const mapped = catData.map(row => ({
        nombre: row[catColumnMapping['nombre']] ? String(row[catColumnMapping['nombre']]).trim() : ''
      })).filter(x => x.nombre);

      const res = await importarCategorias(mapped, selectedSede);
      if (res.success) {
        setMessage({ type: 'success', text: `¡Se importaron ${res.count} categorías exitosamente!` });
        setCatFile(null);
      } else {
        setMessage({ type: 'error', text: res.error || 'Error en la importación de categorías.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setImportingCats(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto mt-8">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-800">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Niteo Data Studio</h2>
            <p className="text-sm text-neutral-500">Módulo de Importación y Migración Histórica</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Sede Destino:</span>
            <select value={selectedSede} onChange={e => setSelectedSede(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none">
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre_sede}</option>)}
            </select>
          </div>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="flex flex-wrap border-b border-neutral-200 dark:border-neutral-800 mb-6">
          <button onClick={() => { setActiveTab('excel'); setMessage(null); }} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'excel' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-500'}`}>
            <FileSpreadsheet size={16} className="inline mr-2" /> Productos e Inventario (.xlsx)
          </button>
          <button onClick={() => { setActiveTab('categorias'); setMessage(null); }} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'categorias' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-500'}`}>
            <Tag size={16} className="inline mr-2" /> Categorías (.xlsx)
          </button>
          <button onClick={() => { setActiveTab('db'); setMessage(null); }} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'db' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-neutral-500'}`}>
            <Database size={16} className="inline mr-2" /> Base de Datos (.db)
          </button>
        </div>

        {activeTab === 'db' && (
          <div className="text-center py-8 animate-in fade-in">
            <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
              <Database className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Migrar desde Base de Datos (.db)</h3>
            <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto mb-8 text-sm">
              Migra tu información de manera rápida desde tu antigua base de datos .db directamente a Niteo.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8 text-left">
               <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-950">
                  <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold text-xs mb-2">1</div>
                  <h4 className="font-semibold text-sm dark:text-white mb-1">Descarga la app</h4>
                  <p className="text-xs text-neutral-500">Descarga Niteo Importer (.exe) en tu computadora.</p>
               </div>
               <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-950">
                  <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold text-xs mb-2">2</div>
                  <h4 className="font-semibold text-sm dark:text-white mb-1">Inicia sesión</h4>
                  <p className="text-xs text-neutral-500">Ingresa con tu correo y selecciona la sede destino.</p>
               </div>
               <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-950">
                  <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold text-xs mb-2">3</div>
                  <h4 className="font-semibold text-sm dark:text-white mb-1">Carga tu archivo .db</h4>
                  <p className="text-xs text-neutral-500">Selecciona el archivo para importar tus datos en segundos.</p>
               </div>
            </div>

            <button 
              onClick={() => window.location.href = "/downloads/NiteoImporter.exe"}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-sm"
            >
              <Download className="w-5 h-5" />
              Descargar Niteo Importer (.exe)
            </button>
          </div>
        )}

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
                     <h3 className="font-bold text-neutral-900 dark:text-white">Mapeo de Columnas</h3>
                     <p className="text-xs text-neutral-500">Relaciona los campos de tu archivo con los campos de Niteo.</p>
                   </div>
                   <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                     {excelTargetFields.map(field => (
                       <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
                         <div className="w-1/2">
                           <p className="text-sm font-bold text-neutral-900 dark:text-white">{field.label}</p>
                         </div>
                         <div className="w-full sm:w-1/2">
                           <select 
                             className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none"
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

                 <button onClick={executeExcelImport} disabled={importingExcel} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all">
                   {importingExcel ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                   {importingExcel ? 'Procesando...' : `Importar ${excelData.length} Productos`}
                 </button>
               </div>
            )}
          </div>
        )}

        {activeTab === 'categorias' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-end">
               <button onClick={downloadCatTemplate} className="flex items-center gap-2 text-sm text-indigo-600 font-bold hover:underline">
                 <Download size={16} /> Descargar Plantilla de Categorías (.xlsx)
               </button>
            </div>

            {!catFile ? (
               <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-12 text-center hover:bg-neutral-50 dark:hover:bg-neutral-950/50 transition-colors">
                 <input type="file" id="cat-upload" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleCatExcelUpload} />
                 <label htmlFor="cat-upload" className="cursor-pointer flex flex-col items-center">
                   <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                     <Tag size={32} />
                   </div>
                   <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Selecciona un archivo Excel de Categorías</h3>
                   <p className="text-sm text-neutral-500">Sube tu listado de rubros o categorías para crearlos en bloque.</p>
                 </label>
               </div>
            ) : (
               <div className="space-y-6">
                 <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                   <div>
                     <p className="text-sm font-bold text-neutral-900 dark:text-white">Archivo Listo: {catFile.name}</p>
                     <p className="text-xs text-neutral-500">{catData.length} categorías detectadas</p>
                   </div>
                   <button onClick={() => setCatFile(null)} className="text-sm text-red-500 font-bold hover:underline">Cambiar Archivo</button>
                 </div>

                 <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                   <div className="bg-neutral-50 dark:bg-neutral-950 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
                     <h3 className="font-bold text-neutral-900 dark:text-white">Mapeo de Categoría</h3>
                     <p className="text-xs text-neutral-500">Indica la columna que contiene el nombre de cada categoría.</p>
                   </div>
                   <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                     {catTargetFields.map(field => (
                       <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4">
                         <div className="w-1/2">
                           <p className="text-sm font-bold text-neutral-900 dark:text-white">{field.label}</p>
                         </div>
                         <div className="w-full sm:w-1/2">
                           <select 
                             className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none"
                             value={catColumnMapping[field.key] || ''}
                             onChange={(e) => setCatColumnMapping({...catColumnMapping, [field.key]: e.target.value})}
                           >
                             <option value="">-- Seleccionar Columna --</option>
                             {catHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                           </select>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 <button onClick={executeCatImport} disabled={importingCats} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-all">
                   {importingCats ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                   {importingCats ? 'Procesando...' : `Importar ${catData.length} Categorías`}
                 </button>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
