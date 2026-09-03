-- Agregar columna para la tasa del Euro
ALTER TABLE tasa_cambiaria ADD COLUMN IF NOT EXISTS tasa_eur NUMERIC DEFAULT 0;

-- Agregar columna para elegir la moneda de referencia de la empresa
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS moneda_referencia VARCHAR(3) DEFAULT 'USD';
