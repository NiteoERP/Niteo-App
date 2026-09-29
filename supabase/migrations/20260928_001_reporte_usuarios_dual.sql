DROP FUNCTION IF EXISTS public.get_reporte_ventas_usuarios(uuid,uuid,timestamp with time zone,timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_reporte_ventas_usuarios(
  p_empresa_id uuid,
  p_sede_id uuid DEFAULT NULL::uuid,
  p_fecha_inicio timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_fecha_fin timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(
    nombre_empleado text,
    facturas_cajero bigint,
    ventas_cajero numeric,
    facturas_vendedor bigint,
    ventas_vendedor numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    empleado AS nombre_empleado,
    SUM(fc)::bigint AS facturas_cajero,
    SUM(vc)::numeric AS ventas_cajero,
    SUM(fv)::bigint AS facturas_vendedor,
    SUM(vv)::numeric AS ventas_vendedor
  FROM (
    -- Desempeño como Cajero
    SELECT 
      COALESCE(NULLIF(f.cajero_nombre, ''), 'Desconocido') AS empleado,
      COUNT(f.id) AS fc,
      SUM(f.total) AS vc,
      0 AS fv,
      0 AS vv
    FROM ventas_facturas f
    WHERE f.empresa_id = p_empresa_id
      AND (p_sede_id IS NULL OR f.sede_id = p_sede_id)
      AND (p_fecha_inicio IS NULL OR f.fecha_venta >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR f.fecha_venta <= p_fecha_fin)
      AND f.estado != 'ANULADA'
    GROUP BY COALESCE(NULLIF(f.cajero_nombre, ''), 'Desconocido')
    
    UNION ALL
    
    -- Desempeño como Mesero / Vendedor
    SELECT 
      f.mesero_nombre AS empleado,
      0 AS fc,
      0 AS vc,
      COUNT(f.id) AS fv,
      SUM(f.total) AS vv
    FROM ventas_facturas f
    WHERE f.empresa_id = p_empresa_id
      AND (p_sede_id IS NULL OR f.sede_id = p_sede_id)
      AND (p_fecha_inicio IS NULL OR f.fecha_venta >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR f.fecha_venta <= p_fecha_fin)
      AND f.estado != 'ANULADA'
      AND NULLIF(f.mesero_nombre, '') IS NOT NULL
    GROUP BY f.mesero_nombre
  ) sub
  GROUP BY empleado
  ORDER BY (SUM(vc) + SUM(vv)) DESC;
END;
$$;
