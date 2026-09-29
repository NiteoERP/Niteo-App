DROP FUNCTION IF EXISTS public.get_reporte_ventas_usuarios(uuid,uuid,timestamp with time zone,timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_reporte_ventas_usuarios(
  p_empresa_id uuid,
  p_sede_id uuid DEFAULT NULL::uuid,
  p_fecha_inicio timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_fecha_fin timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(
    nombre_empleado text,
    rol text,
    cantidad_facturas bigint,
    total_ventas numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(f.mesero_nombre, ''), COALESCE(NULLIF(f.cajero_nombre, ''), 'Desconocido'))::text AS nombre_empleado,
    CASE 
      WHEN NULLIF(f.mesero_nombre, '') IS NOT NULL THEN 'Mesero/Vendedor'
      ELSE 'Cajero'
    END::text AS rol,
    COUNT(f.id)::bigint AS cantidad_facturas,
    SUM(f.total)::numeric AS total_ventas
  FROM ventas_facturas f
  WHERE f.empresa_id = p_empresa_id
    AND (p_sede_id IS NULL OR f.sede_id = p_sede_id)
    AND (p_fecha_inicio IS NULL OR f.fecha_venta >= p_fecha_inicio)
    AND (p_fecha_fin IS NULL OR f.fecha_venta <= p_fecha_fin)
    AND f.estado != 'ANULADA'
  GROUP BY 
    COALESCE(NULLIF(f.mesero_nombre, ''), COALESCE(NULLIF(f.cajero_nombre, ''), 'Desconocido')),
    CASE 
      WHEN NULLIF(f.mesero_nombre, '') IS NOT NULL THEN 'Mesero/Vendedor'
      ELSE 'Cajero'
    END
  ORDER BY SUM(f.total) DESC;
END;
$$;
