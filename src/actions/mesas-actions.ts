'use server';

import { createClient } from '@/utils/supabase/server';

export interface TerminalInfo {
  sedeId: string;
  sedeNombre: string;
  empresaId: string;
  terminalCode: string;
}

export interface ItemComanda {
  producto_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  comentario: string;
}

export interface ComandaPayload {
  terminalCode: string;
  tipo: 'comanda' | 'alerta_pago';
  mesaIdentificador: string;
  clienteNombre?: string;
  comentarioGeneral?: string;
  metodoPagoSugerido?: string;
  items: ItemComanda[];
}

export async function buscarTerminalPorCodigo(codigo: string): Promise<TerminalInfo | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const empresaId = user.app_metadata?.empresa_id;
  if (!empresaId) return null;

  const codigoNorm = codigo.trim().toUpperCase();

  const { data: sede, error } = await supabase
    .from('sedes')
    .select('id, nombre_sede, empresa_id, codigo_terminal')
    .eq('codigo_terminal', codigoNorm)
    .eq('empresa_id', empresaId)
    .eq('estado_activo', true)
    .maybeSingle();

  if (error || !sede) return null;

  return {
    sedeId: sede.id,
    sedeNombre: sede.nombre_sede,
    empresaId: sede.empresa_id,
    terminalCode: sede.codigo_terminal,
  };
}

export async function obtenerCatalogoMesa(sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const empresaId = user.app_metadata?.empresa_id;

  const { data: productos } = await supabase
    .from('productos')
    .select('id, id_pos, nombre, precio_venta, sede_id, categorias(nombre)')
    .eq('empresa_id', empresaId)
    .eq('sede_id', sedeId)
    .eq('estado_activo', true)
    .order('nombre');

  return productos || [];
}

export async function enviarComanda(payload: ComandaPayload): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const empresaId = user.app_metadata?.empresa_id;
  const meseroNombre = user.user_metadata?.nombre_completo ||
    user.user_metadata?.full_name ||
    user.email ||
    'Mesero';

  const { data: sede } = await supabase
    .from('sedes')
    .select('id')
    .eq('codigo_terminal', payload.terminalCode.trim().toUpperCase())
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (!sede) return { success: false, error: 'Terminal no encontrado o no pertenece a tu empresa' };

  const { data, error } = await supabase
    .from('comandas_mesero')
    .insert({
      empresa_id: empresaId,
      sede_id: sede.id,
      mesero_id: user.id,
      mesero_nombre: meseroNombre,
      tipo: payload.tipo,
      mesa_identificador: payload.mesaIdentificador,
      cliente_nombre: payload.clienteNombre || null,
      comentario_general: payload.comentarioGeneral || null,
      metodo_pago_sugerido: payload.metodoPagoSugerido || null,
      items: payload.items,
      estado: 'pendiente',
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function obtenerMesasAbiertas(sedeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

  const { data: comandas } = await supabase
    .from('comandas_mesero')
    .select('id, mesa_identificador, mesero_nombre, cliente_nombre, items, tipo, estado, created_at, metodo_pago_sugerido')
    .eq('sede_id', sedeId)
    .in('estado', ['pendiente', 'recibido'])
    .eq('tipo', 'comanda')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false });

  return comandas || [];
}


export async function buscarClientePorCedula(cedula: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const empresaId = user.app_metadata?.empresa_id;
  if (!empresaId) return null;

  const { data } = await supabase
    .from('clientes')
    .select('nombre, telefono')
    .eq('empresa_id', empresaId)
    .eq('rif_cedula', cedula)
    .single();
    
  return data;
}
