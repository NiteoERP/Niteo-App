'use client';

import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { importarProductos, exportarCatalogo } from '@/actions/migracion-actions';

export default function MigracionClient() {
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Nombre': 'Producto de Ejemplo',
      'Cdigo de Barras': '123456789',
      'Precio de Venta': 10.50,
      'Costo': 5.00,
      'Precio Modificable': 'NO',
      'Unidad de Medida': 'unidades'
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catálogo");
    XLSX.writeFile(wb, "Niteo_Plantilla_Productos.xlsx");
  };

  const handleExport = async () => {
    setLoadingExport(true);
    setError(null);
    try {
      const res = await exportarCatalogo();
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Error exportando');
      }

      const rows = res.data.map((p: any) => ({
        'Nombre': p.nombre,
        'Cdigo de Barras': p.codigo_barras || '',
        'Precio de Venta': p.precio_venta,
        'Costo': p.costo,
        'Precio Modificable': p.precio_modificable ? 'SI' : 'NO',
        'Unidad de Medida': p.unidad_medida || 'unidades'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Catálogo Actual");
      XLSX.writeFile(wb, "Niteo_Catalogo_Exportado.xlsx");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingExport(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingImport(true);
    setError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          throw new Error('El archivo est vaco.');
        }

        const res = await importarProductos(data);
        if (!res.success) {
          throw new Error(res.error || 'Error importando catálogo');
        }

        setSuccess('¡Sincronización exitosa! Se importaron los productos.');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingImport(false);
        e.target.value = ''; // Reset input
      }
    };
    reader.onerror = () => {
      setError('Error leyendo el archivo');
      setLoadingImport(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex gap-3 text-rose-400">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex gap-3 text-emerald-400">
          <CheckCircle2 size={20} className="shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Importar */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
            <Upload className="text-indigo-400" size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Importar Catálogo</h3>
          <p className="text-sm text-neutral-400 mb-6">
            Sube un archivo Excel (.xlsx) para cargar mltiples productos al mismo tiempo.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleDownloadTemplate}
              className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-neutral-700"
            >
              <FileSpreadsheet size={16} />
              Descargar Plantilla en Blanco
            </button>

            <div className="relative">
              <input 
                type="file" 
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                disabled={loadingImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
              />
              <div className={w-full py-2.5 px-4  text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors}>
                {loadingImport ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {loadingImport ? 'Importando...' : 'Subir Archivo Excel'}
              </div>
            </div>
          </div>
        </div>

        {/* Exportar */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
            <Download className="text-emerald-400" size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Exportar Datos</h3>
          <p className="text-sm text-neutral-400 mb-6">
            Descarga todo el catálogo actual de la Nube en un formato compatible con Excel.
          </p>
          
          <button 
            onClick={handleExport}
            disabled={loadingExport}
            className="w-full mt-auto py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {loadingExport ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
            {loadingExport ? 'Generando Excel...' : 'Descargar Catálogo Completo'}
          </button>
        </div>

      </div>
    </div>
  );
}
