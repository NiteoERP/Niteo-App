-- =============================================================================
-- Migration: Actualizar get_reporte_detalle_ventas con filtro de categoría y mesero
-- Fecha: 2026-10-15
-- Descripción:
--   1. Permite filtrar por p_categoria opcional.
--   2. Cuando se filtra por categoría, sólo retorna y totaliza los productos de esa categoría.
--   3. Retorna la columna mesero (mesero_nombre de ventas_facturas) para identificar quién atendió la mesa.
-- =============================================================================

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
            vf.tipo_documento
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
                WHEN p_categoria IS NOT NULL THEN df.subtotal_calc
                ELSE fb.factura_total + fb.factura_descuento
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
                WHEN p_categoria IS NOT NULL THEN GREATEST(0, df.subtotal_calc - df.descuento_calc)
                ELSE fb.factura_total
            END, 2
        )::NUMERIC AS total,
        COALESCE((
            SELECT STRING_AGG(DISTINCT vp.tipo_pago, ', ')
            FROM public.ventas_pagos vp
            WHERE vp.factura_id = fb.id
        ), 'Efectivo')::TEXT AS metodos_pago,
        CASE 
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
