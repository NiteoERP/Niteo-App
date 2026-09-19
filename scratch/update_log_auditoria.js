const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
CREATE OR REPLACE FUNCTION public.log_auditoria()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_usuario_id UUID;
  v_empresa_id UUID;
  v_id TEXT;
  v_old_json JSONB;
  v_new_json JSONB;
BEGIN
  -- NUNCA auditar INSERTs (las creaciones ya se reflejan en pantalla)
  IF (TG_OP = 'INSERT') THEN
    RETURN NEW;
  END IF;

  -- Intentar obtener el usuario autenticado
  BEGIN
    v_usuario_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN 
    v_usuario_id := NULL; 
  END;

  IF (TG_OP = 'DELETE') THEN
    v_old_json := to_jsonb(OLD);
    v_empresa_id := COALESCE(
      (v_old_json->>'empresa_id')::UUID, 
      (v_old_json->>'id_empresa')::UUID
    );
    v_id := (v_old_json->>'id')::TEXT;

    INSERT INTO public.auditoria_logs (
      empresa_id, 
      tabla_afectada, 
      registro_id, 
      accion, 
      usuario_id, 
      datos_viejos
    )
    VALUES (
      v_empresa_id, 
      TG_TABLE_NAME, 
      COALESCE(v_id, 'UNKNOWN'), 
      'DELETE', 
      v_usuario_id, 
      v_old_json
    );
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);

    -- Si los datos son idénticos, no registrar nada
    IF v_old_json = v_new_json THEN
      RETURN NEW;
    END IF;

    -- Si solo cambiaron timestamps de actualización, no registrar
    IF (v_old_json - 'updated_at' - 'fecha_actualizacion') = (v_new_json - 'updated_at' - 'fecha_actualizacion') THEN
      RETURN NEW;
    END IF;

    -- Ignorar updates en facturas donde solo cambió el total o saldo_pendiente (cambios automáticos del sistema)
    IF TG_TABLE_NAME = 'ventas_facturas' OR TG_TABLE_NAME = 'compras_facturas' THEN
      IF (v_old_json - 'updated_at' - 'fecha_actualizacion' - 'total' - 'saldo_pendiente') = (v_new_json - 'updated_at' - 'fecha_actualizacion' - 'total' - 'saldo_pendiente') THEN
        RETURN NEW;
      END IF;
    END IF;

    -- Ignorar updates en productos donde solo cambió el stock (cantidad) (cambios automáticos por ventas)
    IF TG_TABLE_NAME = 'productos' THEN
      IF (v_old_json - 'updated_at' - 'fecha_actualizacion' - 'cantidad' - 'stock' - 'cantidad_actual') = (v_new_json - 'updated_at' - 'fecha_actualizacion' - 'cantidad' - 'stock' - 'cantidad_actual') THEN
        RETURN NEW;
      END IF;
    END IF;

    v_empresa_id := COALESCE(
      (v_new_json->>'empresa_id')::UUID, 
      (v_new_json->>'id_empresa')::UUID,
      (v_old_json->>'empresa_id')::UUID
    );
    v_id := (v_new_json->>'id')::TEXT;

    INSERT INTO public.auditoria_logs (
      empresa_id, 
      tabla_afectada, 
      registro_id, 
      accion, 
      usuario_id, 
      datos_viejos, 
      datos_nuevos
    )
    VALUES (
      v_empresa_id, 
      TG_TABLE_NAME, 
      COALESCE(v_id, 'UNKNOWN'), 
      'UPDATE', 
      v_usuario_id, 
      v_old_json, 
      v_new_json
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$;
`;

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  console.log('Result:', data, error);
}
run();
