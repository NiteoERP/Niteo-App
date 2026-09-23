-- Agregar rubro a la tabla perfiles
ALTER TABLE public.perfiles ADD COLUMN IF NOT EXISTS rubro TEXT DEFAULT 'restaurante';

-- Actualizar la funcion de trigger para insertar el rubro desde el raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $ $
DECLARE
  v_empresa_id uuid;
  v_company_name text;
  v_full_name text;
  v_rubro text;
BEGIN
  -- Extraer nombre de empresa y usuario de los metadatos
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mi Empresa');
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario');
  v_rubro := COALESCE(NEW.raw_user_meta_data->>'rubro', 'restaurante');

  -- 1. Crear el perfil de empresa principal
  INSERT INTO public.perfiles (nombre_empresa, owner_id, rubro)
  VALUES (v_company_name, NEW.id, v_rubro)
  RETURNING id INTO v_empresa_id;

  -- 2. Crear la sede por defecto asociada a esta empresa
  INSERT INTO public.sedes (empresa_id, nombre_sede, direccion)
  VALUES (v_empresa_id, 'Sede Principal', 'Dirección no especificada');

  -- 3. Actualizar el app_metadata del usuario con su empresa_id (para RLS)
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{empresa_id}',
    to_jsonb(v_empresa_id::text)
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$ $ LANGUAGE plpgsql SECURITY DEFINER;
