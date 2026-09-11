import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getProductosCatalogoVirtual } from '@/actions/pos-actions';
import { getSedeVirtualId } from '@/actions/sedes-actions';
import DocumentoForm from './DocumentoForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nuevo Documento | Niteo',
  description: 'Generación de facturas y presupuestos',
};

export default async function NuevoDocumentoPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) {
    return <div>Error: Perfil no encontrado</div>;
  }

  const [catalogoVirtual, sedeVirtualId] = await Promise.all([
    getProductosCatalogoVirtual(perfil.empresa_id),
    getSedeVirtualId(),
  ]);

  const { data: empresaData } = await supabase
    .from('empresas')
    .select('nombre_comercial, moneda, simbolo_moneda')
    .eq('id', perfil.empresa_id)
    .single();

  const { data: clientesData } = await supabase
    .from('clientes')
    .select('id, razon_social, identificacion, email, telefono')
    .eq('empresa_id', perfil.empresa_id);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Facturación</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Genera facturas, presupuestos y notas de entrega
        </p>
      </div>

      <DocumentoForm 
        catalogo={catalogoVirtual}
        sedeVirtualId={sedeVirtualId || ''}
        empresa={empresaData}
        clientes={clientesData || []}
      />
    </div>
  );
}
