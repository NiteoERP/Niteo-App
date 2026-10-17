const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');

const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
const env = {};
for (const line of envLines) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    env[k] = v;
  }
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: logs } = await admin.from('auditoria_logs').select('accion').limit(20);
  const acciones = new Set((logs || []).map(l => l.accion));
  console.log('Acciones en auditoria_logs:', [...acciones]);

  const { data: ap } = await admin
    .from('auditoria_pos')
    .select('*')
    .eq('accion', 'Modificación de Pedido (Web)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (ap) {
    const parsed = JSON.parse(ap.detalle);
    const { error: errAl } = await admin
      .from('auditoria_logs')
      .insert({
        empresa_id: '818d1555-e879-4f1d-8bed-39eb466aa5e3',
        usuario_id: parsed.gerente_id,
        tabla_afectada: 'ventas_facturas',
        accion: 'UPDATE',
        registro_id: parsed.factura_id,
        datos_viejos: {
          total: parsed.total_anterior,
          descuento: parsed.descuento_anterior,
          detalles: parsed.detalles_anteriores,
          pagos: parsed.pagos_anteriores
        },
        datos_nuevos: {
          total: parsed.total_nuevo,
          descuento: parsed.descuento_nuevo,
          detalles: parsed.detalles_nuevos,
          pagos: parsed.pagos_nuevos,
          motivo: parsed.motivo,
          resumen_cambios: parsed.resumen_cambios
        },
        creado_en: ap.fecha
      });
    console.log('Insert en auditoria_logs con UPDATE:', errAl || 'OK');
  }
}

run();
