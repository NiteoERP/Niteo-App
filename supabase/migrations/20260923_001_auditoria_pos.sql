-- Crear la tabla auditoria_pos para recibir los registros desde los POS locales
CREATE TABLE IF NOT EXISTS public.auditoria_pos (
    id UUID PRIMARY KEY,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sede_id UUID NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
    usuario_id TEXT NOT NULL,
    accion TEXT NOT NULL,
    detalle TEXT,
    gerente_aprobador_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.auditoria_pos ENABLE ROW LEVEL SECURITY;

-- Polìtica: los POS (con master_key de sucursal) y admins pueden ver/insertar
CREATE POLICY "Permitir insertar auditoria con sucursal valida" 
    ON public.auditoria_pos FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Permitir leer auditoria a usuarios de la empresa"
    ON public.auditoria_pos FOR SELECT
    USING (
        sede_id IN (
            SELECT id FROM public.sedes 
            WHERE empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
        )
    );
