"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { v4 as uuidv4 } from "uuid";

interface Integracion {
  id: string;
  nombre: string;
  plataforma: string;
  api_key: string;
  api_secret: string;
  estado_activo: boolean;
  webhook_url?: string;
  scopes: string[];
}

export default function IntegracionesClient({
  initialData,
  empresaId,
}: {
  initialData: Integracion[];
  empresaId: string;
}) {
  const [integraciones, setIntegraciones] = useState<Integracion[]>(initialData);
  const [isCreating, setIsCreating] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newPlataforma, setNewPlataforma] = useState("SHOPIFY");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  
  const availableScopes = ["read_productos", "write_productos", "read_inventario", "write_pedidos"];
  const [selectedScopes, setSelectedScopes] = useState<string[]>(availableScopes);
  
  const supabase = createClientComponentClient();

  const handleScopeToggle = (scope: string) => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiKey = `niteo_${uuidv4().replace(/-/g, "")}`;
    const apiSecret = `sec_${uuidv4().replace(/-/g, "")}`;

    const newIntegracion = {
      empresa_id: empresaId,
      nombre: newNombre,
      plataforma: newPlataforma,
      api_key: apiKey,
      api_secret: apiSecret,
      estado_activo: true,
      webhook_url: newWebhookUrl || null,
      scopes: selectedScopes,
      webhook_eventos: ["*"], // Por defecto escucha todo, o podrías agregar checkboxes
    };

    const { data, error } = await supabase
      .from("integraciones_api")
      .insert([newIntegracion])
      .select()
      .single();

    if (error) {
      alert("Error al crear la integración: " + error.message);
    } else {
      setIntegraciones([data, ...integraciones]);
      setIsCreating(false);
      setNewNombre("");
      setNewWebhookUrl("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
        >
          {isCreating ? "Cancelar" : "+ Crear Integración"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700 shadow-sm space-y-5 text-white">
          <h3 className="text-lg font-medium">Configurar Nueva Integración</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-neutral-300">Nombre de la App</label>
              <input
                required type="text" value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                placeholder="Ej: Shopify Sync"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-neutral-300">Plataforma</label>
              <select
                value={newPlataforma} onChange={(e) => setNewPlataforma(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="SHOPIFY">Shopify</option>
                <option value="ENCUENTRA">Encuentra</option>
                <option value="CUSTOM">Custom API</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-neutral-300">Webhook URL (Opcional)</label>
            <input
              type="url" value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
              placeholder="https://tudominio.com/webhooks/niteo"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <p className="text-xs text-neutral-500 mt-1">A dónde Niteo enviará los eventos salientes.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-300">Permisos de la API (Scopes)</label>
            <div className="flex flex-wrap gap-3">
              {availableScopes.map(scope => (
                <label key={scope} className="flex items-center space-x-2 text-sm text-neutral-300 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedScopes.includes(scope)}
                    onChange={() => handleScopeToggle(scope)}
                    className="rounded border-neutral-600 bg-neutral-900 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>{scope}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm">
            Generar Credenciales
          </button>
        </form>
      )}

      <div className="grid gap-4">
        {integraciones.map((integ) => (
          <div key={integ.id} className="bg-neutral-800/40 p-5 rounded-xl border border-neutral-700/60 shadow-sm text-white">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-semibold text-lg">{integ.nombre}</h4>
                <span className="text-xs font-semibold bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded-md mt-1 inline-block">
                  {integ.plataforma}
                </span>
              </div>
              <span className={`px-2 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider ${integ.estado_activo ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                {integ.estado_activo ? "Activo" : "Pausado"}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Access Token (API Key)</label>
                <div className="flex mt-1">
                  <input readOnly value={integ.api_key} className="flex-1 bg-neutral-900/80 border border-neutral-700 border-r-0 rounded-l-md px-3 py-1.5 font-mono text-sm text-neutral-300 outline-none" />
                  <button onClick={() => navigator.clipboard.writeText(integ.api_key)} className="bg-neutral-700 hover:bg-neutral-600 transition-colors px-3 border border-neutral-700 rounded-r-md text-sm font-medium">
                    Copiar
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Client Secret (HMAC)</label>
                <div className="flex mt-1">
                  <input readOnly value={integ.api_secret || 'Generado antes de la actualización'} className="flex-1 bg-neutral-900/80 border border-neutral-700 border-r-0 rounded-l-md px-3 py-1.5 font-mono text-sm text-neutral-400 outline-none" />
                  <button onClick={() => navigator.clipboard.writeText(integ.api_secret)} className="bg-neutral-700 hover:bg-neutral-600 transition-colors px-3 border border-neutral-700 rounded-r-md text-sm font-medium">
                    Copiar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-neutral-900/50 p-3 rounded-lg border border-neutral-800 text-sm">
                <div>
                  <span className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Permisos Otorgados</span>
                  <div className="flex flex-wrap gap-1.5">
                    {integ.scopes?.map(s => <span key={s} className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded uppercase font-semibold">{s}</span>) || <span className="text-neutral-400 text-xs">Todos</span>}
                  </div>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Webhook URL</span>
                  <span className="text-neutral-300 text-xs break-all">{integ.webhook_url || <span className="text-neutral-600 italic">No configurado</span>}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
