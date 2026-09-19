-- 1. Vaciar tabla de auditoría (el nombre correcto es auditoria_logs)
DELETE FROM public.auditoria_logs;

-- 2. Actualizar la función de auditoría para IGNORAR cambios automáticos (como cuando se actualiza el stock o el total de una factura al agregar productos)
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

-- 3. Crear RPC para Historial de Abonos Globales de Proveedores
CREATE OR REPLACE FUNCTION get_historial_abonos_proveedor(p_proveedor_id uuid)
RETURNS TABLE (
  fecha_pago timestamp with time zone,
  metodo_pago varchar,
  referencia varchar,
  banco_origen varchar,
  monto_total numeric,
  cantidad_facturas bigint,
  facturas_afectadas json
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.fecha_pago,
    cp.metodo_pago,
    cp.referencia,
    cp.banco_origen,
    SUM(cp.monto) as monto_total,
    COUNT(cp.id) as cantidad_facturas,
    json_agg(json_build_object(
      'factura_id', cf.id,
      'numero_factura', cf.numero_factura,
      'monto_aplicado', cp.monto
    )) as facturas_afectadas
  FROM compras_pagos cp
  JOIN compras_facturas cf ON cp.factura_id = cf.id
  WHERE cf.proveedor_id = p_proveedor_id
  GROUP BY 
    cp.fecha_pago, cp.metodo_pago, cp.referencia, cp.banco_origen
  ORDER BY cp.fecha_pago DESC;
END;
$$ LANGUAGE plpgsql;
