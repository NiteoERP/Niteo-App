-- =============================================================================
-- Migration: Matemática Dorada en RPCs de Reportes
-- Fecha: 2026-10-16
-- Descripción:
--   1. get_reporte_ventas_diarias: Resta devoluciones (-ABS(vf.total)) y filtra estado_activo = true y cortesías.
--   2. get_reporte_ventas_usuarios: Excluye cortesías y resta devoluciones tanto para cajero como para mesero.
--   3. get_reporte_ventas_productos: Resta unidades y monto de devoluciones y excluye cortesías.
--   4. get_reporte_ventas_categoria: Resta monto de devoluciones y excluye cortesías.
--   5. get_reporte_productos_vendidos: Resta unidades y monto de devoluciones y excluye cortesías.
--   6. get_reporte_ventas_clientes: Resta devoluciones del gasto del cliente y excluye cortesías.
--   7. get_reporte_detalle_ventas: Marca devoluciones como monto negativo y estado 'Devolución'.
-- =============================================================================

-- 1. get_reporte_ventas_diarias
CREATE OR REPLACE FUNCTION public.get_reporte_ventas_diarias(
    p_empresa_id   UUID,
    p_sede_id      UUID,
    p_fecha_inicio TIMESTAMPTZ,
    p_fecha_fin    TIMESTAMPTZ
)
RETURNS TABLE (
    fecha             TEXT,
    cantidad_facturas BIGINT,
    total_ventas      NUMERIC,
    total_descuentos  NUMERIC,
    ticket_promedio   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR((vf.fecha_venta AT TIME ZONE 'America/Caracas')::date, 'DD/MM/YYYY') AS "fecha",
        COUNT(vf.id) AS "cantidad_facturas",
        COALESCE(SUM(
            CASE 
                WHEN (vf.tipo_documento ILIKE '%devoluc%' OR vf.tipo_documento ILIKE '%refund%' OR vf.tipo_documento ILIKE '%nota_credito%' OR vf.tipo_documento ILIKE '%nc%' OR vf.total < 0) 
                THEN -ABS(vf.total)
                ELSE vf.total 
            END
        ), 0) AS "total_ventas",
        COALESCE(SUM(vf.descuento), 0) AS "total_descuentos",
        COALESCE(
            SUM(
                CASE 
                    WHEN (vf.tipo_documento ILIKE '%devoluc%' OR vf.tipo_documento ILIKE '%refund%' OR vf.tipo_documento ILIKE '%nota_credito%' OR vf.tipo_documento ILIKE '%nc%' OR vf.total < 0) 
                    THEN -ABS(vf.total)
                    ELSE vf.total 
                END
            ) / NULLIF(COUNT(vf.id), 0), 0
        ) AS "ticket_promedio"
    FROM public.ventas_facturas vf
    WHERE vf.empresa_id = p_empresa_id
      AND (p_sede_id IS NULL OR vf.sede_id = p_sede_id)
      AND vf.fecha_venta >= p_fecha_inicio
      AND vf.fecha_venta <= p_fecha_fin
      AND vf.estado_activo = true
      AND NOT EXISTS (
        SELECT 1 FROM public.ventas_pagos vp
        WHERE vp.factura_id = vf.id 
          AND (vp.tipo_pago ILIKE '%cortes%' OR vp.tipo_pago ILIKE '%regal%')
      )
      AND (vf.tipo_documento IS NULL OR (vf.tipo_documento NOT ILIKE '%cortes%' AND vf.tipo_documento NOT ILIKE '%regal%'))
      AND (vf.numero_orden IS NULL OR (vf.numero_orden NOT ILIKE '%cortes%' AND vf.numero_orden NOT ILIKE '%regal%'))
    GROUP BY (vf.fecha_venta AT TIME ZONE 'America/Caracas')::date
    ORDER BY (vf.fecha_venta AT TIME ZONE 'America/Caracas')::date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporte_ventas_diarias(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- 2. get_reporte_ventas_usuarios
CREATE OR REPLACE FUNCTION public.get_reporte_ventas_usuarios(
    p_empresa_id   UUID,
    p_sede_id      UUID DEFAULT NULL::uuid,
    p_fecha_inicio TIMESTAMPTZ DEFAULT NULL::timestamptz,
    p_fecha_fin    TIMESTAMPTZ DEFAULT NULL::timestamptz
)
RETURNS TABLE (
    nombre_empleado   TEXT,
    facturas_cajero   BIGINT,
    ventas_cajero     NUMERIC,
    facturas_vendedor BIGINT,
    ventas_vendedor   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      COALESCE(SUM(
        CASE 
          WHEN (f.tipo_documento ILIKE '%devoluc%' OR f.tipo_documento ILIKE '%refund%' OR f.tipo_documento ILIKE '%nota_credito%' OR f.tipo_documento ILIKE '%nc%' OR f.total < 0)
          THEN -ABS(f.total)
          ELSE f.total
        END
      ), 0) AS vc,
      0::bigint AS fv,
      0::numeric AS vv
    FROM public.ventas_facturas f
    WHERE f.empresa_id = p_empresa_id
      AND (p_sede_id IS NULL OR f.sede_id = p_sede_id)
      AND (p_fecha_inicio IS NULL OR f.fecha_venta >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR f.fecha_venta <= p_fecha_fin)
      AND f.estado_activo = true
      AND NOT EXISTS (
        SELECT 1 FROM public.ventas_pagos vp
        WHERE vp.factura_id = f.id 
          AND (vp.tipo_pago ILIKE '%cortes%' OR vp.tipo_pago ILIKE '%regal%')
      )
      AND (f.tipo_documento IS NULL OR (f.tipo_documento NOT ILIKE '%cortes%' AND f.tipo_documento NOT ILIKE '%regal%'))
      AND (f.numero_orden IS NULL OR (f.numero_orden NOT ILIKE '%cortes%' AND f.numero_orden NOT ILIKE '%regal%'))
    GROUP BY COALESCE(NULLIF(f.cajero_nombre, ''), 'Desconocido')
    
    UNION ALL
    
    -- Desempeño como Mesero / Vendedor
    SELECT 
      f.mesero_nombre AS empleado,
      0::bigint AS fc,
      0::numeric AS vc,
      COUNT(f.id) AS fv,
      COALESCE(SUM(
        CASE 
          WHEN (f.tipo_documento ILIKE '%devoluc%' OR f.tipo_documento ILIKE '%refund%' OR f.tipo_documento ILIKE '%nota_credito%' OR f.tipo_documento ILIKE '%nc%' OR f.total < 0)
          THEN -ABS(f.total)
          ELSE f.total
        END
      ), 0) AS vv
    FROM public.ventas_facturas f
    WHERE f.empresa_id = p_empresa_id
      AND (p_sede_id IS NULL OR f.sede_id = p_sede_id)
      AND (p_fecha_inicio IS NULL OR f.fecha_venta >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR f.fecha_venta <= p_fecha_fin)
      AND f.estado_activo = true
      AND NULLIF(f.mesero_nombre, '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.ventas_pagos vp
        WHERE vp.factura_id = f.id 
          AND (vp.tipo_pago ILIKE '%cortes%' OR vp.tipo_pago ILIKE '%regal%')
      )
      AND (f.tipo_documento IS NULL OR (f.tipo_documento NOT ILIKE '%cortes%' AND f.tipo_documento NOT ILIKE '%regal%'))
      AND (f.numero_orden IS NULL OR (f.numero_orden NOT ILIKE '%cortes%' AND f.numero_orden NOT ILIKE '%regal%'))
    GROUP BY f.mesero_nombre
  ) sub
  GROUP BY empleado
  ORDER BY (SUM(vc) + SUM(vv)) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporte_ventas_usuarios(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- 3. get_reporte_ventas_productos
CREATE OR REPLACE FUNCTION public.get_reporte_ventas_productos(
    p_empresa_id   UUID,
    p_sede_id      UUID,
    p_fecha_inicio TIMESTAMPTZ,
    p_fecha_fin    TIMESTAMPTZ
)
RETURNS TABLE (
    codigo_barras   TEXT,
    nombre_producto TEXT,
    cantidad_vendida NUMERIC,
    total_recaudado NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.codigo_barras, 'N/A')::text AS codigo_barras,
        p.nombre::TEXT AS nombre_producto,
        COALESCE(SUM(
            CASE 
                WHEN (f.tipo_documento ILIKE '%devoluc%' OR f.tipo_documento ILIKE '%refund%' OR f.tipo_documento ILIKE '%nota_credito%' OR f.tipo_documento ILIKE '%nc%' OR f.total < 0) 
                THEN -ABS(d.cantidad)
                ELSE d.cantidad 
            END
        ), 0) AS cantidad_vendida,
        COALESCE(SUM(
            CASE 
                WHEN (f.tipo_documento ILIKE '%devoluc%' OR f.tipo_documento ILIKE '%refund%' OR f.tipo_documento ILIKE '%nota_credito%' OR f.tipo_documento ILIKE '%nc%' OR f.total < 0) 
                THEN -ABS(d.total)
                ELSE d.total 
            END
        ), 0) AS total_recaudado
    FROM public.ventas_detalles d
    JOIN public.ventas_facturas f ON f.id = d.factura_id
    JOIN public.productos p ON p.id = d.producto_id
    WHERE f.empresa_id = p_empresa_id
      AND (p_sede_id IS NULL OR f.sede_id = p_sede_id)
      AND f.fecha_venta >= p_fecha_inicio
      AND f.fecha_venta <= p_fecha_fin
      AND f.estado_activo = true
      AND NOT EXISTS (
        SELECT 1 FROM public.ventas_pagos vp
        WHERE vp.factura_id = f.id 
          AND (vp.tipo_pago ILIKE '%cortes%' OR vp.tipo_pago ILIKE '%regal%')
      )
      AND (f.tipo_documento IS NULL OR (f.tipo_documento NOT ILIKE '%cortes%' AND f.tipo_documento NOT ILIKE '%regal%'))
      AND (f.numero_orden IS NULL OR (f.numero_orden NOT ILIKE '%cortes%' AND f.numero_orden NOT ILIKE '%regal%'))
    GROUP BY p.id, p.nombre, p.codigo_barras
    ORDER BY cantidad_vendida DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporte_ventas_productos(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- 4. get_reporte_ventas_categoria
CREATE OR REPLACE FUNCTION public.get_reporte_ventas_categoria(
    p_empresa_id    UUID,
    p_sede_id       UUID DEFAULT NULL::uuid,
    p_fecha_inicio  TIMESTAMPTZ DEFAULT NULL::timestamptz,
    p_fecha_fin     TIMESTAMPTZ DEFAULT NULL::timestamptz,
    p_categoria     TEXT DEFAULT NULL::text,
    p_cajero_nombre TEXT DEFAULT NULL::text,
    p_cliente_id    UUID DEFAULT NULL::uuid
)
RETURNS TABLE (
    categoria       TEXT,
    cantidad_items  BIGINT,
    total_vendido   NUMERIC,
    ticket_promedio NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(c.nombre, 'Sin Categoría')::text AS categoria,
        COUNT(vd.id) AS cantidad_items,
        ROUND(COALESCE(SUM(
            CASE 
                WHEN (vf.tipo_documento ILIKE '%devoluc%' OR vf.tipo_documento ILIKE '%refund%' OR vf.tipo_documento ILIKE '%nota_credito%' OR vf.tipo_documento ILIKE '%nc%' OR vf.total < 0) 
                THEN -ABS(vd.total)
                ELSE vd.total 
            END
        ), 0)::numeric, 2) AS total_vendido,
        ROUND(COALESCE(AVG(
            CASE 
                WHEN (vf.tipo_documento ILIKE '%devoluc%' OR vf.tipo_documento ILIKE '%refund%' OR vf.tipo_documento ILIKE '%nota_credito%' OR vf.tipo_documento ILIKE '%nc%' OR vf.total < 0) 
                THEN -ABS(vd.total)
                ELSE vd.total 
            END
        ), 0)::numeric, 2) AS ticket_promedio
    FROM public.ventas_detalles vd
    JOIN public.ventas_facturas vf ON vf.id = vd.factura_id
    JOIN public.sedes se ON se.id = vf.sede_id
    JOIN public.productos pr ON pr.id = vd.producto_id
    LEFT JOIN public.categorias c ON c.id = pr.categoria_id
    LEFT JOIN public.clientes cl ON cl.id = vf.cliente_id
    LEFT JOIN public.perfiles u ON u.id = vf.usuario_id
    WHERE se.empresa_id = p_empresa_id
      AND vf.numero_documento <> 'TEST'
      AND (p_sede_id IS NULL OR vf.sede_id = p_sede_id)
      AND (p_fecha_inicio IS NULL OR vf.fecha_venta >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR vf.fecha_venta <= p_fecha_fin)
      AND (p_categoria IS NULL OR c.nombre = p_categoria)
      AND (p_cajero_nombre IS NULL OR u.nombre_completo = p_cajero_nombre)
      AND (p_cliente_id IS NULL OR vf.cliente_id = p_cliente_id)
      AND vf.estado_activo = true
      AND NOT EXISTS (
        SELECT 1 FROM public.ventas_pagos vp
        WHERE vp.factura_id = vf.id 
          AND (vp.tipo_pago ILIKE '%cortes%' OR vp.tipo_pago ILIKE '%regal%')
      )
      AND (vf.tipo_documento IS NULL OR (vf.tipo_documento NOT ILIKE '%cortes%' AND vf.tipo_documento NOT ILIKE '%regal%'))
      AND (vf.numero_orden IS NULL OR (vf.numero_orden NOT ILIKE '%cortes%' AND vf.numero_orden NOT ILIKE '%regal%'))
    GROUP BY c.nombre
    ORDER BY total_vendido DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporte_ventas_categoria(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO anon, authenticated;

-- 5. get_reporte_productos_vendidos
CREATE OR REPLACE FUNCTION public.get_reporte_productos_vendidos(
    p_empresa_id    UUID,
    p_sede_id       UUID DEFAULT NULL::uuid,
    p_fecha_inicio  TIMESTAMPTZ DEFAULT NULL::timestamptz,
    p_fecha_fin     TIMESTAMPTZ DEFAULT NULL::timestamptz,
    p_categoria     TEXT DEFAULT NULL::text,
    p_cajero_nombre TEXT DEFAULT NULL::text,
    p_cliente_id    UUID DEFAULT NULL::uuid
)
RETURNS TABLE (
    codigo            TEXT,
    producto          TEXT,
    categoria         TEXT,
    unidades_vendidas NUMERIC,
    ingresos_total    NUMERIC,
    precio_promedio   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(pr.codigo_barras, '—')::text AS codigo,
        pr.nombre::text AS producto,
        COALESCE(c.nombre, 'Sin Categoría')::text AS categoria,
        ROUND(COALESCE(SUM(
            CASE 
                WHEN (vf.tipo_documento ILIKE '%devoluc%' OR vf.tipo_documento ILIKE '%refund%' OR vf.tipo_documento ILIKE '%nota_credito%' OR vf.tipo_documento ILIKE '%nc%' OR vf.total < 0) 
                THEN -ABS(vd.cantidad)
                ELSE vd.cantidad 
            END
        ), 0)::numeric, 2) AS unidades_vendidas,
        ROUND(COALESCE(SUM(
            CASE 
                WHEN (vf.tipo_documento ILIKE '%devoluc%' OR vf.tipo_documento ILIKE '%refund%' OR vf.tipo_documento ILIKE '%nota_credito%' OR vf.tipo_documento ILIKE '%nc%' OR vf.total < 0) 
                THEN -ABS(vd.total)
                ELSE vd.total 
            END
        ), 0)::numeric, 2) AS ingresos_total,
        ROUND(COALESCE(AVG(vd.precio_unitario), 0)::numeric, 2) AS precio_promedio
    FROM public.ventas_detalles vd
    JOIN public.ventas_facturas vf ON vf.id = vd.factura_id
    JOIN public.sedes se ON se.id = vf.sede_id
    JOIN public.productos pr ON pr.id = vd.producto_id
    LEFT JOIN public.categorias c ON c.id = pr.categoria_id
    LEFT JOIN public.clientes cl ON cl.id = vf.cliente_id
    LEFT JOIN public.perfiles u ON u.id = vf.usuario_id
    WHERE se.empresa_id = p_empresa_id
      AND vf.numero_documento <> 'TEST'
      AND (p_sede_id IS NULL OR vf.sede_id = p_sede_id)
      AND (p_fecha_inicio IS NULL OR vf.fecha_venta >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR vf.fecha_venta <= p_fecha_fin)
      AND (p_categoria IS NULL OR c.nombre = p_categoria)
      AND (p_cajero_nombre IS NULL OR u.nombre_completo = p_cajero_nombre)
      AND (p_cliente_id IS NULL OR vf.cliente_id = p_cliente_id)
      AND vf.estado_activo = true
      AND NOT EXISTS (
        SELECT 1 FROM public.ventas_pagos vp
        WHERE vp.factura_id = vf.id 
          AND (vp.tipo_pago ILIKE '%cortes%' OR vp.tipo_pago ILIKE '%regal%')
      )
      AND (vf.tipo_documento IS NULL OR (vf.tipo_documento NOT ILIKE '%cortes%' AND vf.tipo_documento NOT ILIKE '%regal%'))
      AND (vf.numero_orden IS NULL OR (vf.numero_orden NOT ILIKE '%cortes%' AND vf.numero_orden NOT ILIKE '%regal%'))
    GROUP BY pr.id, pr.codigo_barras, pr.nombre, c.nombre
    ORDER BY ingresos_total DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporte_productos_vendidos(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID) TO anon, authenticated;

-- 6. get_reporte_ventas_clientes
CREATE OR REPLACE FUNCTION public.get_reporte_ventas_clientes(
    p_empresa_id    UUID,
    p_sede_id       UUID DEFAULT NULL::uuid,
    p_fecha_inicio  TIMESTAMPTZ DEFAULT NULL::timestamptz,
    p_fecha_fin     TIMESTAMPTZ DEFAULT NULL::timestamptz,
    p_cajero_nombre TEXT DEFAULT NULL::text
)
RETURNS TABLE (
    cliente         TEXT,
    visitas         BIGINT,
    total_gastado   NUMERIC,
    ticket_promedio NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(cl.nombre, 'Consumidor Final')::text AS cliente,
        COUNT(vf.id) AS visitas,
        ROUND(COALESCE(SUM(
            CASE 
                WHEN (vf.tipo_documento ILIKE '%devoluc%' OR vf.tipo_documento ILIKE '%refund%' OR vf.tipo_documento ILIKE '%nota_credito%' OR vf.tipo_documento ILIKE '%nc%' OR vf.total < 0) 
                THEN -ABS(vf.total + vf.descuento)
                ELSE (vf.total + vf.descuento) 
            END
        ), 0), 2) AS total_gastado,
        ROUND(COALESCE(
            SUM(
                CASE 
                    WHEN (vf.tipo_documento ILIKE '%devoluc%' OR vf.tipo_documento ILIKE '%refund%' OR vf.tipo_documento ILIKE '%nota_credito%' OR vf.tipo_documento ILIKE '%nc%' OR vf.total < 0) 
                    THEN -ABS(vf.total + vf.descuento)
                    ELSE (vf.total + vf.descuento) 
                END
            ) / NULLIF(COUNT(vf.id), 0), 0
        ), 2) AS ticket_promedio
    FROM public.ventas_facturas vf
    JOIN public.sedes se ON se.id = vf.sede_id
    LEFT JOIN public.clientes cl ON cl.id = vf.cliente_id
    LEFT JOIN public.perfiles pf ON pf.id = vf.usuario_id
    WHERE se.empresa_id = p_empresa_id
      AND vf.numero_documento <> 'TEST'
      AND (p_sede_id IS NULL OR vf.sede_id = p_sede_id)
      AND (p_fecha_inicio IS NULL OR vf.fecha_venta >= p_fecha_inicio)
      AND (p_fecha_fin IS NULL OR vf.fecha_venta <= p_fecha_fin)
      AND (p_cajero_nombre IS NULL OR pf.nombre_completo = p_cajero_nombre)
      AND vf.estado_activo = true
      AND NOT EXISTS (
        SELECT 1 FROM public.ventas_pagos vp
        WHERE vp.factura_id = vf.id 
          AND (vp.tipo_pago ILIKE '%cortes%' OR vp.tipo_pago ILIKE '%regal%')
      )
      AND (vf.tipo_documento IS NULL OR (vf.tipo_documento NOT ILIKE '%cortes%' AND vf.tipo_documento NOT ILIKE '%regal%'))
      AND (vf.numero_orden IS NULL OR (vf.numero_orden NOT ILIKE '%cortes%' AND vf.numero_orden NOT ILIKE '%regal%'))
    GROUP BY cl.nombre
    ORDER BY total_gastado DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporte_ventas_clientes(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO anon, authenticated;

-- 7. get_reporte_detalle_ventas
CREATE OR REPLACE FUNCTION public.get_reporte_detalle_ventas(
    p_empresa_id    UUID,
    p_sede_id       UUID        DEFAULT NULL,
    p_fecha_inicio  TIMESTAMPTZ DEFAULT NULL,
    p_fecha_fin     TIMESTAMPTZ DEFAULT NULL,
    p_cliente_id    UUID        DEFAULT NULL,
    p_cajero_nombre TEXT        DEFAULT NULL,
    p_categoria     TEXT        DEFAULT NULL
)
RETURNS TABLE (
    numero_orden     TEXT,
    numero_documento TEXT,
    fecha_hora       TEXT,
    cliente          TEXT,
    cajero           TEXT,
    mesero           TEXT,
    productos        TEXT,
    subtotal         NUMERIC,
    descuento        NUMERIC,
    total            NUMERIC,
    metodos_pago     TEXT,
    estado           TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH facturas_base AS (
        SELECT 
            vf.id,
            vf.numero_orden,
            vf.numero_documento,
            vf.fecha_venta,
            vf.cliente_id,
            vf.cliente_nombre,
            vf.cajero_nombre,
            vf.mesero_nombre,
            vf.total AS factura_total,
            vf.descuento AS factura_descuento,
            vf.estado_pago,
            vf.tipo_documento,
            (vf.tipo_documento ILIKE '%devoluc%' OR vf.tipo_documento ILIKE '%refund%' OR vf.tipo_documento ILIKE '%nota_credito%' OR vf.tipo_documento ILIKE '%nc%' OR vf.total < 0) AS es_devolucion
        FROM public.ventas_facturas vf
        WHERE vf.empresa_id = p_empresa_id
          AND vf.estado_activo = true
          AND (p_sede_id IS NULL OR vf.sede_id = p_sede_id)
          AND (p_cliente_id IS NULL OR vf.cliente_id = p_cliente_id)
          AND (p_fecha_inicio IS NULL OR vf.fecha_venta >= p_fecha_inicio)
          AND (p_fecha_fin IS NULL OR vf.fecha_venta <= p_fecha_fin)
          AND (p_cajero_nombre IS NULL OR vf.cajero_nombre ILIKE '%' || p_cajero_nombre || '%')
          AND NOT EXISTS (
              SELECT 1 FROM public.ventas_pagos vp
              WHERE vp.factura_id = vf.id 
                AND (vp.tipo_pago ILIKE '%cortes%' OR vp.tipo_pago ILIKE '%regal%')
          )
          AND (vf.tipo_documento IS NULL OR (vf.tipo_documento NOT ILIKE '%cortes%' AND vf.tipo_documento NOT ILIKE '%regal%'))
          AND (vf.numero_orden IS NULL OR (vf.numero_orden NOT ILIKE '%cortes%' AND vf.numero_orden NOT ILIKE '%regal%'))
          AND (vf.numero_documento IS NULL OR (vf.numero_documento NOT ILIKE '%cortes%' AND vf.numero_documento NOT ILIKE '%regal%'))
    ),
    detalles_filtrados AS (
        SELECT 
            fb.id AS factura_id,
            STRING_AGG(p.nombre || ' x' || vd.cantidad::TEXT, ', ') AS productos_texto,
            COALESCE(SUM(vd.total), 0) AS subtotal_calc,
            COALESCE(SUM(vd.descuento), 0) AS descuento_calc
        FROM facturas_base fb
        JOIN public.ventas_detalles vd ON vd.factura_id = fb.id
        JOIN public.productos p ON p.id = vd.producto_id
        LEFT JOIN public.categorias cat ON cat.id = p.categoria_id
        WHERE (p_categoria IS NULL OR cat.nombre ILIKE p_categoria)
        GROUP BY fb.id
    )
    SELECT 
        COALESCE(fb.numero_orden, '—')::TEXT AS numero_orden,
        COALESCE(fb.numero_documento, '—')::TEXT AS numero_documento,
        TO_CHAR(fb.fecha_venta AT TIME ZONE 'America/Caracas', 'DD/MM/YYYY HH12:MI AM') AS fecha_hora,
        COALESCE(c.nombre, fb.cliente_nombre, 'Consumidor Final')::TEXT AS cliente,
        COALESCE(fb.cajero_nombre, '—')::TEXT AS cajero,
        COALESCE(fb.mesero_nombre, '—')::TEXT AS mesero,
        COALESCE(df.productos_texto, '—')::TEXT AS productos,
        ROUND(
            CASE 
                WHEN fb.es_devolucion THEN -ABS(
                    CASE 
                        WHEN p_categoria IS NOT NULL THEN df.subtotal_calc
                        ELSE fb.factura_total + fb.factura_descuento
                    END
                )
                ELSE (
                    CASE 
                        WHEN p_categoria IS NOT NULL THEN df.subtotal_calc
                        ELSE fb.factura_total + fb.factura_descuento
                    END
                )
            END, 2
        )::NUMERIC AS subtotal,
        ROUND(
            CASE 
                WHEN p_categoria IS NOT NULL THEN df.descuento_calc
                ELSE fb.factura_descuento
            END, 2
        )::NUMERIC AS descuento,
        ROUND(
            CASE 
                WHEN fb.es_devolucion THEN -ABS(
                    CASE 
                        WHEN p_categoria IS NOT NULL THEN GREATEST(0, df.subtotal_calc - df.descuento_calc)
                        ELSE fb.factura_total
                    END
                )
                ELSE (
                    CASE 
                        WHEN p_categoria IS NOT NULL THEN GREATEST(0, df.subtotal_calc - df.descuento_calc)
                        ELSE fb.factura_total
                    END
                )
            END, 2
        )::NUMERIC AS total,
        COALESCE((
            SELECT STRING_AGG(DISTINCT vp.tipo_pago, ', ')
            FROM public.ventas_pagos vp
            WHERE vp.factura_id = fb.id
        ), 'Efectivo')::TEXT AS metodos_pago,
        CASE 
            WHEN fb.es_devolucion THEN 'Devolución'
            WHEN fb.estado_pago = 1 THEN 'Pagado'
            WHEN fb.estado_pago = 2 THEN 'Crédito'
            WHEN fb.estado_pago = 0 THEN 'Pendiente'
            ELSE 'Pagado'
        END::TEXT AS estado
    FROM facturas_base fb
    JOIN detalles_filtrados df ON df.factura_id = fb.id
    LEFT JOIN public.clientes c ON fb.cliente_id = c.id
    ORDER BY fb.fecha_venta DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reporte_detalle_ventas(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT, TEXT) TO anon, authenticated;
