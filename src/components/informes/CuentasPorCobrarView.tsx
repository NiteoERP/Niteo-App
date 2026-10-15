'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Receipt,
  Search,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

export interface CuentasPorCobrarDoc {
  numero_documento: string;
  fecha: string;
  vencimiento: string;
  total: number;
  total_pagado: number;
  total_impago: number;
  estado: string;
  sucursal: string;
}

export interface CuentasPorCobrarCustomerGroup {
  cliente: string;
  rif: string;
  total: number;
  total_pagado: number;
  total_impago: number;
  documentos: CuentasPorCobrarDoc[];
}

export function groupCuentasPorCobrarData(rawData: any[]): {
  groups: CuentasPorCobrarCustomerGroup[];
  grandTotal: number;
  grandTotalPagado: number;
  grandTotalImpago: number;
  totalDocumentos: number;
  clientesConDeudaCount: number;
} {
  if (!rawData || !Array.isArray(rawData)) {
    return {
      groups: [],
      grandTotal: 0,
      grandTotalPagado: 0,
      grandTotalImpago: 0,
      totalDocumentos: 0,
      clientesConDeudaCount: 0,
    };
  }

  // Filtrar filas de totales generales del array crudo
  const cleanRows = rawData.filter((r) => {
    if (!r) return false;
    const isTot =
      String(r['Fecha'] || r.fecha || '').toUpperCase().includes('TOTAL') ||
      String(r['Número de documento'] || r.numero_documento || '').toUpperCase().includes('CRÉDITO') ||
      String(r['Cliente'] || r.cliente || '').toUpperCase() === 'TOTALES';
    return !isTot;
  });

  const groupMap: Record<string, CuentasPorCobrarCustomerGroup> = {};

  for (const r of cleanRows) {
    const rawCliente = (r['Cliente'] || r.cliente || r.cliente_nombre || 'Cliente Eventual').toString().trim();
    const clienteKey = rawCliente.toUpperCase();

    if (!groupMap[clienteKey]) {
      groupMap[clienteKey] = {
        cliente: rawCliente,
        rif: r['Cédula / RIF'] || r.rif || r.rif_cedula || '-',
        total: 0,
        total_pagado: 0,
        total_impago: 0,
        documentos: [],
      };
    }

    const docNum = r['Número de documento'] || r.numero_documento || r['N° Documento'] || '-';
    const fecha = r['Fecha'] || r.fecha || '-';
    const vencimiento = r['Vencimiento'] || r.vencimiento || fecha;

    const total = Number(r['Total'] ?? r.total ?? r['Total Factura'] ?? r['Monto Crédito'] ?? 0);
    const pagado = Number(r['Total pagado'] ?? r.total_pagado ?? r['Monto Pagado'] ?? 0);
    const impago = Number(r['Total impago'] ?? r.total_impago ?? r['Saldo Pendiente'] ?? Math.max(0, total - pagado));
    const estado = (r['Estado'] || r.estado || (impago > 0.001 ? (pagado > 0.001 ? 'PARCIAL' : 'PENDIENTE') : 'PAGADO')).toUpperCase();
    const sucursal = r['Sucursal'] || r.sucursal || '-';

    groupMap[clienteKey].total += total;
    groupMap[clienteKey].total_pagado += pagado;
    groupMap[clienteKey].total_impago += impago;

    groupMap[clienteKey].documentos.push({
      numero_documento: docNum,
      fecha,
      vencimiento,
      total: Number(total.toFixed(2)),
      total_pagado: Number(pagado.toFixed(2)),
      total_impago: Number(impago.toFixed(2)),
      estado,
      sucursal,
    });
  }

  const groups = Object.values(groupMap);

  // Ordenar los clientes alfabéticamente
  groups.sort((a, b) => a.cliente.localeCompare(b.cliente, undefined, { sensitivity: 'base' }));

  let grandTotal = 0;
  let grandTotalPagado = 0;
  let grandTotalImpago = 0;
  let totalDocumentos = 0;
  let clientesConDeudaCount = 0;

  for (const g of groups) {
    g.total = Number(g.total.toFixed(2));
    g.total_pagado = Number(g.total_pagado.toFixed(2));
    g.total_impago = Number(g.total_impago.toFixed(2));

    grandTotal += g.total;
    grandTotalPagado += g.total_pagado;
    grandTotalImpago += g.total_impago;
    totalDocumentos += g.documentos.length;

    if (g.total_impago > 0.001) {
      clientesConDeudaCount += 1;
    }
  }

  return {
    groups,
    grandTotal: Number(grandTotal.toFixed(2)),
    grandTotalPagado: Number(grandTotalPagado.toFixed(2)),
    grandTotalImpago: Number(grandTotalImpago.toFixed(2)),
    totalDocumentos,
    clientesConDeudaCount,
  };
}

interface CuentasPorCobrarViewProps {
  data: any[];
  isPrintView?: boolean;
  onExportExcel?: () => void;
}

export default function CuentasPorCobrarView({
  data,
  isPrintView = false,
  onExportExcel,
}: CuentasPorCobrarViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'paid'>('all');
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(true);

  const {
    groups,
    grandTotal,
    grandTotalPagado,
    grandTotalImpago,
    totalDocumentos,
    clientesConDeudaCount,
  } = useMemo(() => groupCuentasPorCobrarData(data), [data]);

  // Filtrado reactivo en pantalla
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      // Filtro por texto (nombre de cliente, documento o rif)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesClient = g.cliente.toLowerCase().includes(q);
        const matchesRif = g.rif.toLowerCase().includes(q);
        const matchesDoc = g.documentos.some((d) => d.numero_documento.toLowerCase().includes(q));
        if (!matchesClient && !matchesRif && !matchesDoc) return false;
      }

      // Filtro por estado de deuda
      if (filterMode === 'pending') {
        return g.total_impago > 0.001;
      }
      if (filterMode === 'paid') {
        return g.total_impago <= 0.001;
      }

      return true;
    });
  }, [groups, searchTerm, filterMode]);

  const toggleClient = (clienteKey: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clienteKey]: prev[clienteKey] !== undefined ? !prev[clienteKey] : !allExpanded,
    }));
  };

  const handleToggleAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const updated: Record<string, boolean> = {};
    groups.forEach((g) => {
      updated[g.cliente] = nextState;
    });
    setExpandedClients(updated);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // VISTA DE IMPRESIÓN / PREVISUALIZACIÓN (Hoja de papel contable, como en la foto)
  // ───────────────────────────────────────────────────────────────────────────
  if (isPrintView) {
    return (
      <div className="w-full text-black bg-white select-text font-sans">
        {filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 text-sm">
            No se encontraron cuentas por cobrar en el período seleccionado.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredGroups.map((group) => {
              const tieneDeuda = group.total_impago > 0.001;
              return (
                <div key={group.cliente} className="break-inside-avoid border border-neutral-300 rounded-sm overflow-hidden mb-6">
                  {/* Encabezado del cliente exactamente como la foto: Customer: [NOMBRE] */}
                  <div className="bg-neutral-100 border-b border-neutral-300 px-3 py-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase tracking-wider text-neutral-900">
                        Customer: <span className="text-black font-black text-sm">{group.cliente}</span>
                      </span>
                      {group.rif && group.rif !== '-' && (
                        <span className="text-xs text-neutral-600 font-mono">({group.rif})</span>
                      )}
                    </div>
                    <div className="text-xs">
                      {tieneDeuda ? (
                        <span className="font-bold text-neutral-900 bg-neutral-200 px-2 py-0.5 rounded text-[11px]">
                          Deuda Total: ${group.total_impago.toFixed(2)}
                        </span>
                      ) : (
                        <span className="font-semibold text-neutral-700 bg-neutral-200 px-2 py-0.5 rounded text-[11px]">
                          PAGADO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tabla con las columnas idénticas a la foto de referencia */}
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-800 border-b border-neutral-300 font-bold uppercase text-[10px]">
                        <th className="py-1.5 px-3 text-left border-r border-neutral-200">Número de documento</th>
                        <th className="py-1.5 px-3 text-center border-r border-neutral-200">Fecha</th>
                        <th className="py-1.5 px-3 text-center border-r border-neutral-200">Vencimiento</th>
                        <th className="py-1.5 px-3 text-right border-r border-neutral-200">Total</th>
                        <th className="py-1.5 px-3 text-right border-r border-neutral-200">Total pagado</th>
                        <th className="py-1.5 px-3 text-right">Total impago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-neutral-800">
                      {group.documentos.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50/50">
                          <td className="py-1.5 px-3 text-left font-mono border-r border-neutral-200 font-medium">
                            {doc.numero_documento}
                          </td>
                          <td className="py-1.5 px-3 text-center border-r border-neutral-200 font-mono">
                            {doc.fecha}
                          </td>
                          <td className="py-1.5 px-3 text-center border-r border-neutral-200 font-mono">
                            {doc.vencimiento}
                          </td>
                          <td className="py-1.5 px-3 text-right border-r border-neutral-200 font-mono">
                            {doc.total.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 text-right border-r border-neutral-200 font-mono">
                            {doc.total_pagado.toFixed(2)}
                          </td>
                          <td className={`py-1.5 px-3 text-right font-mono ${doc.total_impago > 0.001 ? 'font-bold text-neutral-950' : 'text-neutral-500'}`}>
                            {doc.total_impago.toFixed(2)}
                          </td>
                        </tr>
                      ))}

                      {/* Fila de subtotal idéntica a la foto: con Total impago resaltado en negrita */}
                      <tr className="bg-neutral-100/90 font-bold border-t-2 border-neutral-300">
                        <td colSpan={3} className="py-1.5 px-3 text-right border-r border-neutral-200 text-neutral-500 font-normal italic text-[11px]">
                          Subtotal {group.cliente}:
                        </td>
                        <td className="py-1.5 px-3 text-right border-r border-neutral-200 font-mono text-neutral-800">
                          {group.total.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-3 text-right border-r border-neutral-200 font-mono text-neutral-800">
                          {group.total_pagado.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-3 text-right font-black font-mono text-sm text-neutral-950 bg-neutral-200/60">
                          {group.total_impago.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}

            {/* Fila de Totales Generales del Informe */}
            <div className="border-t-2 border-neutral-900 pt-4 mt-6 flex justify-end">
              <div className="w-full sm:w-96 bg-neutral-100 p-4 rounded border border-neutral-300 space-y-2 text-xs">
                <div className="flex justify-between font-black text-sm text-neutral-900 border-b border-neutral-300 pb-2">
                  <span>GRAN TOTAL DE CRÉDITOS</span>
                  <span>{totalDocumentos} documentos</span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>Total Facturado a Crédito:</span>
                  <span className="font-bold font-mono">$ {grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>Total Cobrado / Pagado:</span>
                  <span className="font-bold font-mono text-emerald-800">$ {grandTotalPagado.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-950 border-t border-neutral-400 pt-2 font-black text-sm">
                  <span>TOTAL IMPAGO (DEUDA GLOBAL):</span>
                  <span className="text-base font-black font-mono bg-neutral-200 px-2 py-0.5 rounded">
                    $ {grandTotalImpago.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VISTA DE DASHBOARD (Modo Oscuro, Interactivo con tarjetas y filtros rápidos)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 w-full">
      {/* Tarjetas KPI de resumen superior */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Total Deuda Pendiente (Impago) */}
        <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Total Impago Pendiente</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <AlertCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            $ {grandTotalImpago.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {clientesConDeudaCount} {clientesConDeudaCount === 1 ? 'cliente debe' : 'clientes deben'} actualmente
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* KPI 2: Total Créditos Otorgados */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Créditos Otorgados</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-neutral-200 tracking-tight">
            $ {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {totalDocumentos} documentos de crédito registrados
          </p>
        </div>

        {/* KPI 3: Total Pagado / Cobrado */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Total Cobrado (Pagado)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 tracking-tight">
            $ {grandTotalPagado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {grandTotal > 0 ? ((grandTotalPagado / grandTotal) * 100).toFixed(1) : 0}% recuperado
          </p>
        </div>

        {/* KPI 4: Clientes con crédito */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Clientes en Cartera</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-white tracking-tight">
            {groups.length}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            {groups.length - clientesConDeudaCount} clientes al día (solventes)
          </p>
        </div>
      </div>

      {/* Barra de herramientas y filtros rápidos */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Buscador en vivo */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, documento o cédula..."
            className="w-full h-10 bg-neutral-950 border border-neutral-800 text-white text-xs rounded-xl pl-9 pr-3 focus:outline-none focus:border-indigo-500 placeholder:text-neutral-600"
          />
        </div>

        {/* Filtros de estado rápido */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterMode === 'all'
                ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
            }`}
          >
            Todos ({groups.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterMode === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-neutral-400 hover:text-amber-400 hover:bg-neutral-800/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Solo con deuda ({clientesConDeudaCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterMode === 'paid'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Al día ({groups.length - clientesConDeudaCount})
          </button>

          {/* Botón expandir/colapsar */}
          <button
            type="button"
            onClick={handleToggleAll}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 rounded-xl transition-colors ml-1"
            title={allExpanded ? 'Colapsar todos' : 'Expandir todos'}
          >
            <ArrowUpDown size={14} />
          </button>

          {/* Exportar Excel */}
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet size={13} />
              <span>Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista de clientes agrupados */}
      {filteredGroups.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500">
          <Receipt size={36} className="mx-auto mb-3 opacity-30 text-neutral-400" />
          <p className="text-sm font-semibold text-neutral-300">No se encontraron cuentas por cobrar</p>
          <p className="text-xs text-neutral-500 mt-1">Prueba cambiando los filtros o el rango de fechas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const isExpanded = expandedClients[group.cliente] !== undefined ? expandedClients[group.cliente] : allExpanded;
            const tieneDeuda = group.total_impago > 0.001;

            return (
              <div
                key={group.cliente}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl overflow-hidden shadow-lg transition-all"
              >
                {/* Cabecera del cliente (Customer: [NOMBRE]) */}
                <button
                  type="button"
                  onClick={() => toggleClient(group.cliente)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      tieneDeuda
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                      <Users size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Customer:</span>
                        <span className="text-base font-bold text-white tracking-tight truncate">{group.cliente}</span>
                        {group.rif && group.rif !== '-' && (
                          <span className="text-xs text-neutral-500 font-mono">({group.rif})</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {group.documentos.length} documento{group.documentos.length !== 1 ? 's' : ''} a crédito registrado{group.documentos.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Badge destacado con el total que debe esta persona */}
                    <div className="text-right">
                      {tieneDeuda ? (
                        <div>
                          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Debe en Total:</span>
                          <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-black text-sm border border-amber-500/30 inline-block font-mono">
                            $ {group.total_impago.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">Estado:</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30 inline-block">
                            SOLVENTE / AL DÍA
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </button>

                {/* Tabla de documentos cuando está expandido */}
                {isExpanded && (
                  <div className="border-t border-neutral-800/80 bg-neutral-950/40 overflow-x-auto custom-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-neutral-950/80 text-neutral-400 uppercase font-bold text-[10px] tracking-wider border-b border-neutral-800">
                        <tr>
                          <th className="py-3 px-5 whitespace-nowrap">Número de documento</th>
                          <th className="py-3 px-4 text-center whitespace-nowrap">Fecha</th>
                          <th className="py-3 px-4 text-center whitespace-nowrap">Vencimiento</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">Total</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap">Total pagado</th>
                          <th className="py-3 px-4 text-right whitespace-nowrap text-amber-400">Total impago</th>
                          <th className="py-3 px-4 text-center whitespace-nowrap">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50 text-neutral-300 font-medium">
                        {group.documentos.map((doc, idx) => (
                          <tr key={idx} className="hover:bg-neutral-800/20 transition-colors">
                            <td className="py-2.5 px-5 font-mono text-white font-semibold">
                              {doc.numero_documento}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-neutral-400">
                              {doc.fecha}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-neutral-400">
                              {doc.vencimiento}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-neutral-200">
                              $ {doc.total.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-emerald-400">
                              $ {doc.total_pagado.toFixed(2)}
                            </td>
                            <td className={`py-2.5 px-4 text-right font-mono ${
                              doc.total_impago > 0.001 ? 'font-bold text-amber-400' : 'text-neutral-500'
                            }`}>
                              $ {doc.total_impago.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {doc.estado === 'PAGADO' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  PAGADO
                                </span>
                              ) : doc.estado === 'PENDIENTE' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  PENDIENTE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  PARCIAL
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}

                        {/* Fila de Subtotal por Persona */}
                        <tr className="bg-neutral-900/90 font-bold border-t-2 border-neutral-700">
                          <td colSpan={3} className="py-3 px-5 text-right uppercase tracking-wider text-neutral-400 font-semibold text-[11px]">
                            Total {group.cliente}:
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-white">
                            $ {group.total.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400">
                            $ {group.total_pagado.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-amber-300 text-sm">
                            $ {group.total_impago.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center text-neutral-500 text-[10px]">
                            {tieneDeuda ? 'POR COBRAR' : 'AL DÍA'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
