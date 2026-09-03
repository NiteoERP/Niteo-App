-- Create compras_metodos_pago table
CREATE TABLE IF NOT EXISTS compras_metodos_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    estado_activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id, nombre)
);

-- Insert some defaults if needed (optional)
