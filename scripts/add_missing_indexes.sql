-- Script para añadir índices a las claves foráneas más comunes
-- Esto reducirá significativamente las "156 slow queries" y bajará el consumo de CPU y RAM.

-- Índices para la tabla sedes
CREATE INDEX IF NOT EXISTS idx_sedes_empresa_id ON public.sedes(empresa_id);

-- Índices para la tabla perfiles
CREATE INDEX IF NOT EXISTS idx_perfiles_empresa_id ON public.perfiles(empresa_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_sede_id ON public.perfiles(sede_id);

-- Índices para proveedores
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa_id ON public.proveedores(empresa_id);

-- Índices para datos_bancarios
CREATE INDEX IF NOT EXISTS idx_datos_bancarios_empresa_id ON public.datos_bancarios(empresa_id);

-- Índices para categorias
CREATE INDEX IF NOT EXISTS idx_categorias_empresa_id ON public.categorias(empresa_id);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_empresa_id ON public.productos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria_id ON public.productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_estado_activo ON public.productos(estado_activo);

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON public.clientes(empresa_id);

-- Índices para ventas_facturas
CREATE INDEX IF NOT EXISTS idx_ventas_facturas_empresa_id ON public.ventas_facturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ventas_facturas_sede_id ON public.ventas_facturas(sede_id);
CREATE INDEX IF NOT EXISTS idx_ventas_facturas_cliente_id ON public.ventas_facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_facturas_fecha ON public.ventas_facturas(fecha_emision);

-- Índices para ventas_detalles
CREATE INDEX IF NOT EXISTS idx_ventas_detalles_factura_id ON public.ventas_detalles(factura_id);
CREATE INDEX IF NOT EXISTS idx_ventas_detalles_producto_id ON public.ventas_detalles(producto_id);

-- Índices para ventas_pagos
CREATE INDEX IF NOT EXISTS idx_ventas_pagos_factura_id ON public.ventas_pagos(factura_id);
CREATE INDEX IF NOT EXISTS idx_ventas_pagos_metodo_pago_id ON public.ventas_pagos(metodo_pago_id);

-- Índices para despachos
CREATE INDEX IF NOT EXISTS idx_despachos_empresa_id ON public.despachos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_despachos_sede_id ON public.despachos(sede_id);
CREATE INDEX IF NOT EXISTS idx_despachos_proveedor_id ON public.despachos(proveedor_id);

-- Índices para despachos_detalles
CREATE INDEX IF NOT EXISTS idx_despachos_detalles_despacho_id ON public.despachos_detalles(despacho_id);
CREATE INDEX IF NOT EXISTS idx_despachos_detalles_producto_id ON public.despachos_detalles(producto_id);

-- Índices para inventario_insumos
CREATE INDEX IF NOT EXISTS idx_inventario_insumos_empresa_id ON public.inventario_insumos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_inventario_insumos_sede_id ON public.inventario_insumos(sede_id);

-- Índices para movimientos_inventario
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_empresa_id ON public.movimientos_inventario(empresa_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_sede_id ON public.movimientos_inventario(sede_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_producto_id ON public.movimientos_inventario(producto_id);

-- Índices para gastos_sede
CREATE INDEX IF NOT EXISTS idx_gastos_sede_empresa_id ON public.gastos_sede(empresa_id);
CREATE INDEX IF NOT EXISTS idx_gastos_sede_sede_id ON public.gastos_sede(sede_id);

-- Índices para cierres_caja
CREATE INDEX IF NOT EXISTS idx_cierres_caja_empresa_id ON public.cierres_caja(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cierres_caja_sede_id ON public.cierres_caja(sede_id);

-- Índices para cierres_transacciones
CREATE INDEX IF NOT EXISTS idx_cierres_trans_cierre_id ON public.cierres_transacciones(cierre_caja_id);
CREATE INDEX IF NOT EXISTS idx_cierres_trans_factura_id ON public.cierres_transacciones(factura_id);

-- Índices para pos_cuentas_abiertas
CREATE INDEX IF NOT EXISTS idx_pos_cuentas_empresa_id ON public.pos_cuentas_abiertas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pos_cuentas_sede_id ON public.pos_cuentas_abiertas(sede_id);
