import React from 'react';
import { createClient } from '@/utils/supabase/server';
import SettingsForm from './SettingsForm';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const empresaId = user?.app_metadata?.empresa_id;

  let empresaName = '';
  if (empresaId) {
    const { data: empresa } = await supabase
      .from('empresas')
      .select('nombre_comercial')
      .eq('id', empresaId)
      .single();
    
    empresaName = empresa?.nombre_comercial || '';
  }

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
      
      <div className="border-b border-neutral-800 pb-5">
        <h1 className="text-2xl font-bold text-white">Configuración de Empresa</h1>
        <p className="text-neutral-400 mt-1">Administra la información general y preferencias.</p>
      </div>
      
      <section className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3 border-b border-neutral-800/50 pb-4 mb-6">
          <h2 className="text-lg font-medium text-white">Perfil de la Empresa</h2>
        </div>

        {empresaId ? (
          <SettingsForm initialName={empresaName} empresaId={empresaId} />
        ) : (
          <p className="text-rose-400 text-sm">Error: No se encontró la empresa asociada a tu perfil.</p>
        )}
      </section>

      {/* Otras secciones (Estilos, Idioma, etc.) que se integrarán luego */}
      <section className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl opacity-50 grayscale pointer-events-none">
        <div className="flex items-center gap-3 border-b border-neutral-800/50 pb-4 mb-6">
          <h2 className="text-lg font-medium text-white">Otras Preferencias (Próximamente)</h2>
        </div>
        <p className="text-sm text-neutral-400">Las configuraciones de estilo e idioma estarán disponibles en las próximas fases.</p>
      </section>

    </div>
  );
}
