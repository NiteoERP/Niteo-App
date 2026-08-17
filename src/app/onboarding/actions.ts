'use server';

import { createClient } from '@/utils/supabase/server';
import { randomUUID } from 'crypto';

export async function setupWorkspace(formData: {
  nombreEmpresa: string;
  nombreSede: string;
  sistemaPos: string;
}) {
  const supabase = await createClient();

  // 1. Obtener usuario autenticado
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { success: false, error: 'No estás autorizado. Inicia sesión nuevamente.' };
  }

  // 2. Insertar la Empresa
  const { data: empresa, error: empErr } = await supabase
    .from('empresas')
    .insert([{ nombre_comercial: formData.nombreEmpresa }])
    .select('id_empresa')
    .single();

  if (empErr || !empresa) {
    return { success: false, error: 'Error al crear la empresa. ' + empErr.message };
  }

  const idEmpresa = empresa.id_empresa;

  // 3. Enlazar el Usuario a la Empresa y darle rol MASTER
  const { error: userErr } = await supabase
    .from('usuarios')
    .update({ id_empresa: idEmpresa, rol: 'MASTER' })
    .eq('auth_uuid', user.id);

  if (userErr) {
    // Idealmente se haría un rollback de la empresa, pero para simplicidad del MVP lo dejamos así
    return { success: false, error: 'Error al enlazar el perfil de usuario. ' + userErr.message };
  }

  // 4. Crear Sede inicial y generar Master Key
  // Formato: niteo_ + UUID sin guiones para que sea estético
  const masterKey = `niteo_${randomUUID().replace(/-/g, '')}`;
  
  const { error: sedeErr } = await supabase
    .from('sedes')
    .insert([{
      id_empresa: idEmpresa,
      nombre_sede: formData.nombreSede,
      sistema_pos: formData.sistemaPos,
      master_key: masterKey,
      estado_sincronizacion: 'PENDIENTE'
    }]);

  if (sedeErr) {
    return { success: false, error: 'Error al crear la sede. ' + sedeErr.message };
  }

  return { success: true, masterKey };
}
