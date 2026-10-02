-- Copia y pega esto en el SQL Editor de tu Dashboard de Supabase
-- (https://supabase.com/dashboard/project/_/sql)
-- Luego dale al botón "Run" (Ejecutar)

ALTER TABLE inventario_insumos 
ADD COLUMN IF NOT EXISTS categoria VARCHAR(255) DEFAULT 'General';
