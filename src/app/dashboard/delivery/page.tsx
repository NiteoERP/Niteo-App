import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import DeliveryReportClient from './DeliveryReportClient';

export const metadata = {
  title: 'Reporte de Deliveries | Niteo',
};

export default async function AdminDeliveryPage() {
  const supabase = await createClient();
  
  // 1. Obtener Empresa ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single();

  if (!perfil) redirect('/dashboard');

  if (perfil.empresa_id) {
    const { data: sub } = await supabase
      .from('suscripciones_empresas')
      .select('modulos_activos')
      .eq('empresa_id', perfil.empresa_id)
      .maybeSingle();

    if (sub?.modulos_activos && sub.modulos_activos.length > 0) {
      if (sub.modulos_activos.includes('ninguno') || sub.modulos_activos.includes('none') || !sub.modulos_activos.includes('delivery')) {
        redirect('/dashboard');
      }
    }
  }

  // 2. Traer listas para los selectores (Sedes y Repartidores)
  const [sedesRes, perfilesRes] = await Promise.all([
    supabase
      .from('sedes')
      .select('id, nombre_sede')
      .eq('empresa_id', perfil.empresa_id)
      .order('nombre_sede'),
    supabase
      .from('perfiles')
      .select('id, nombre_completo, permisos, rol')
      .eq('empresa_id', perfil.empresa_id)
  ]);

  const sedes = sedesRes.data || [];
  
  // Filtrar perfiles que sean Repartidores (o tengan permiso de delivery)
  const todosLosPerfiles = perfilesRes.data || [];
  const repartidores = todosLosPerfiles.filter((p: any) => {
    if (p.rol === 'REPARTIDOR') return true;
    if (p.permisos && Array.isArray(p.permisos) && p.permisos.includes('delivery')) return true;
    return false;
  }).sort((a: any, b: any) => a.nombre_completo.localeCompare(b.nombre_completo));

  return (
    <div className="p-4 md:p-6 w-full">
      <DeliveryReportClient 
        sedesDisponibles={sedes} 
        repartidoresDisponibles={repartidores} 
      />
    </div>
  );
}
