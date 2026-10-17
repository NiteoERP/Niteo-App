-- Migración: Motor SQL Ultra-Rápido para Niteo Copilot 360° (Matemática Dorada sobre 100% de facturas y detalles)
CREATE OR REPLACE FUNCTION public.get_copilot_ventas_360(
  p_empresa_id uuid,
  p_fecha_inicio timestamptz,
  p_fecha_fin timestamptz,
  p_sede_id uuid DEFAULT NULL,
  p_canal text DEFAULT 'todos', -- 'todos', 'delivery', 'salon'
  p_filtro_producto text DEFAULT NULL,
  p_ordenar_por text DEFAULT 'mas_vendidos',
  p_limite int DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH facturas_base AS (
    SELECT
      vf.id,
      vf.sede_id,
      vf.fecha_venta,
      vf.total,
      vf.tipo_documento,
      vf.numero_orden,
      vf.cliente_nombre,
      vf.notas,
      -- Detectar si es cortesía o regalía
      (
        COALESCE(vf.tipo_documento, '') ILIKE '%cortes%'
        OR COALESCE(vf.tipo_documento, '') ILIKE '%regal%'
        OR COALESCE(vf.numero_orden, '') ILIKE '%cortes%'
        OR COALESCE(vf.numero_orden, '') ILIKE '%regal%'
        OR EXISTS (
          SELECT 1 FROM public.ventas_pagos vp
          WHERE vp.factura_id = vf.id
            AND (COALESCE(vp.tipo_pago, '') ILIKE '%cortes%' OR COALESCE(vp.tipo_pago, '') ILIKE '%regal%')
        )
      ) AS es_cortesia,
      -- Signo por Matemática Dorada (-1 para devoluciones/notas de crédito, +1 normal)
      CASE
        WHEN COALESCE(vf.tipo_documento, '') ILIKE '%refund%'
          OR COALESCE(vf.tipo_documento, '') ILIKE '%devolucion%'
          OR COALESCE(vf.tipo_documento, '') ILIKE '%nota_credito%'
          OR COALESCE(vf.tipo_documento, '') ILIKE '%nc%'
          OR COALESCE(vf.total, 0) < 0
        THEN -1
        ELSE 1
      END AS signo,
      -- Monto de flete delivery dentro de los detalles de la factura
      COALESCE((
        SELECT SUM(ABS(COALESCE(vd.total, 0)))
        FROM public.ventas_detalles vd
        LEFT JOIN public.productos pr ON pr.id = vd.producto_id
        WHERE vd.factura_id = vf.id
          AND (
            COALESCE(pr.nombre, '') ILIKE '%delivery%'
            OR COALESCE(pr.nombre, '') ILIKE '%flete%'
            OR COALESCE(pr.nombre, '') ILIKE '%envio%'
            OR COALESCE(pr.nombre, '') ILIKE '%envío%'
            OR COALESCE(pr.nombre, '') ILIKE '%domicilio%'
          )
      ), 0) AS flete_usd
    FROM public.ventas_facturas vf
    WHERE vf.empresa_id = p_empresa_id
      AND vf.estado_activo = true
      AND COALESCE(vf.numero_documento, '') <> 'TEST'
      AND vf.fecha_venta >= p_fecha_inicio
      AND vf.fecha_venta <= p_fecha_fin
      AND (p_sede_id IS NULL OR vf.sede_id = p_sede_id)
  ),
  facturas_clasificadas AS (
    SELECT
      fb.*,
      (fb.signo * ABS(COALESCE(fb.total, 0))) AS monto_neto_usd,
      (fb.signo * fb.flete_usd) AS flete_neto_usd,
      (
        fb.flete_usd > 0
        OR COALESCE(fb.cliente_nombre, '') ILIKE '%delivery%'
        OR COALESCE(fb.numero_orden, '') ILIKE '%delivery%'
        OR COALESCE(fb.notas, '') ILIKE '%delivery%'
      ) AS es_delivery,
      (fb.fecha_venta AT TIME ZONE 'America/Caracas') AS fecha_local
    FROM facturas_base fb
    WHERE fb.es_cortesia = false
  ),
  facturas_filtradas AS (
    SELECT *
    FROM facturas_clasificadas fc
    WHERE
      CASE
        WHEN LOWER(COALESCE(p_canal, 'todos')) = 'delivery' THEN fc.es_delivery = true
        WHEN LOWER(COALESCE(p_canal, 'todos')) = 'salon' THEN fc.es_delivery = false
        ELSE true
      END
  ),
  resumen_global AS (
    SELECT
      COALESCE(SUM(ff.monto_neto_usd), 0) AS total_ventas_usd,
      COUNT(*) AS total_facturas,
      COALESCE(SUM(ff.flete_neto_usd), 0) AS total_flete_usd,
      COUNT(*) FILTER (WHERE ff.es_delivery = true) AS pedidos_delivery
    FROM facturas_filtradas ff
  ),
  por_sede AS (
    SELECT
      s.id AS sede_id,
      s.nombre_sede,
      COALESCE(SUM(ff.monto_neto_usd), 0) AS total_usd,
      COUNT(ff.id) AS total_facturas,
      COALESCE(SUM(ff.flete_neto_usd), 0) AS flete_delivery_usd,
      COUNT(ff.id) FILTER (WHERE ff.es_delivery = true) AS pedidos_delivery
    FROM public.sedes s
    LEFT JOIN facturas_filtradas ff ON ff.sede_id = s.id
    WHERE s.empresa_id = p_empresa_id
      AND (p_sede_id IS NULL OR s.id = p_sede_id)
    GROUP BY s.id, s.nombre_sede
    ORDER BY s.id ASC
  ),
  por_dia_semana AS (
    SELECT
      EXTRACT(ISODOW FROM ff.fecha_local)::int AS iso_dow,
      CASE EXTRACT(ISODOW FROM ff.fecha_local)::int
        WHEN 1 THEN 'Lunes'
        WHEN 2 THEN 'Martes'
        WHEN 3 THEN 'Miércoles'
        WHEN 4 THEN 'Jueves'
        WHEN 5 THEN 'Viernes'
        WHEN 6 THEN 'Sábado'
        WHEN 7 THEN 'Domingo'
      END AS dia,
      ROUND(COALESCE(SUM(ff.monto_neto_usd), 0)::numeric, 2) AS total_usd,
      COUNT(*) AS total_facturas,
      COUNT(DISTINCT (ff.fecha_local::date)) AS dias_operados,
      CASE
        WHEN COUNT(DISTINCT (ff.fecha_local::date)) > 0
        THEN ROUND((COALESCE(SUM(ff.monto_neto_usd), 0) / COUNT(DISTINCT (ff.fecha_local::date)))::numeric, 2)
        ELSE 0
      END AS promedio_por_dia_usd
    FROM facturas_filtradas ff
    GROUP BY EXTRACT(ISODOW FROM ff.fecha_local)::int
    ORDER BY iso_dow ASC
  ),
  por_hora AS (
    SELECT
      LPAD(EXTRACT(HOUR FROM ff.fecha_local)::int::text, 2, '0') || ':00 - ' || LPAD(EXTRACT(HOUR FROM ff.fecha_local)::int::text, 2, '0') || ':59' AS franja_horaria,
      ROUND(COALESCE(SUM(ff.monto_neto_usd), 0)::numeric, 2) AS total_usd,
      COUNT(*) AS pedidos
    FROM facturas_filtradas ff
    GROUP BY EXTRACT(HOUR FROM ff.fecha_local)::int
    ORDER BY total_usd DESC
    LIMIT 6
  ),
  detalles_productos AS (
    SELECT
      COALESCE(vd.producto_id::text, 'sin_id') AS producto_id,
      COALESCE(pr.nombre, 'Producto') AS nombre,
      COALESCE(pr.codigo_barras, '') AS codigo_barras,
      COALESCE(cat.nombre, 'General') AS categoria,
      SUM(ff.signo * ABS(COALESCE(vd.cantidad, 0))) AS cantidad_vendida,
      SUM(ff.signo * ABS(COALESCE(vd.total, 0))) AS total_usd
    FROM facturas_filtradas ff
    JOIN public.ventas_detalles vd ON vd.factura_id = ff.id
    LEFT JOIN public.productos pr ON pr.id = vd.producto_id
    LEFT JOIN public.categorias cat ON cat.id = pr.categoria_id
    WHERE (
      p_filtro_producto IS NULL
      OR TRIM(p_filtro_producto) = ''
      OR COALESCE(pr.nombre, '') ILIKE '%' || TRIM(p_filtro_producto) || '%'
      OR COALESCE(cat.nombre, '') ILIKE '%' || TRIM(p_filtro_producto) || '%'
    )
    GROUP BY vd.producto_id, pr.nombre, pr.codigo_barras, cat.nombre
  ),
  ranking_productos AS (
    SELECT
      dp.producto_id,
      dp.nombre,
      dp.codigo_barras,
      dp.categoria,
      ROUND(dp.cantidad_vendida::numeric, 2) AS cantidad_vendida,
      ROUND(dp.total_usd::numeric, 2) AS total_usd
    FROM detalles_productos dp
    ORDER BY
      CASE WHEN p_ordenar_por = 'menos_vendidos' THEN dp.cantidad_vendida END ASC,
      CASE WHEN p_ordenar_por <> 'menos_vendidos' OR p_ordenar_por IS NULL THEN dp.cantidad_vendida END DESC
    LIMIT COALESCE(p_limite, 15)
  ),
  por_categoria AS (
    SELECT
      dp.categoria,
      ROUND(SUM(dp.cantidad_vendida)::numeric, 2) AS unidades_vendidas,
      ROUND(SUM(dp.total_usd)::numeric, 2) AS total_usd
    FROM detalles_productos dp
    GROUP BY dp.categoria
    ORDER BY total_usd DESC
  )
  SELECT jsonb_build_object(
    'total_ventas_usd', ROUND((SELECT total_ventas_usd FROM resumen_global)::numeric, 2),
    'total_facturas', (SELECT total_facturas FROM resumen_global),
    'total_flete_delivery_usd', ROUND((SELECT total_flete_usd FROM resumen_global)::numeric, 2),
    'pedidos_delivery_despachados', (SELECT pedidos_delivery FROM resumen_global),
    'total_unidades_productos', COALESCE((SELECT ROUND(SUM(cantidad_vendida)::numeric, 2) FROM detalles_productos), 0),
    'desglose_sedes', COALESCE((SELECT jsonb_agg(row_to_json(ps)) FROM por_sede ps), '[]'::jsonb),
    'desglose_dia_semana', COALESCE((SELECT jsonb_agg(row_to_json(pds)) FROM por_dia_semana pds), '[]'::jsonb),
    'horas_pico', COALESCE((SELECT jsonb_agg(row_to_json(ph)) FROM por_hora ph), '[]'::jsonb),
    'top_productos', COALESCE((SELECT jsonb_agg(row_to_json(rp)) FROM ranking_productos rp), '[]'::jsonb),
    'ventas_por_categoria', COALESCE((SELECT jsonb_agg(row_to_json(pc)) FROM por_categoria pc), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
