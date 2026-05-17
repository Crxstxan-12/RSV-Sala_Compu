CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  nombre TEXT,
  rol TEXT NOT NULL DEFAULT 'profesor' CHECK (rol IN ('profesor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS nombre TEXT;

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS rol TEXT;

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.perfiles
  ALTER COLUMN rol SET DEFAULT 'profesor';

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.perfiles p
    WHERE p.id = user_id AND p.rol = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.rol FROM public.perfiles p WHERE p.id = user_id
$$;

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios pueden crear su propio perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.perfiles;
DROP POLICY IF EXISTS "Admins pueden actualizar perfiles" ON public.perfiles;

CREATE POLICY "Usuarios pueden ver su propio perfil" ON public.perfiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins pueden ver todos los perfiles" ON public.perfiles
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Usuarios pueden crear su propio perfil" ON public.perfiles
  FOR INSERT WITH CHECK (auth.uid() = id AND rol = 'profesor');

CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.perfiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND rol = public.get_user_role(auth.uid()));

CREATE POLICY "Admins pueden actualizar perfiles" ON public.perfiles
  FOR UPDATE USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email), ''),
    'profesor'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        nombre = COALESCE(EXCLUDED.nombre, public.perfiles.nombre);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users;

-- Políticas de seguridad para reservas
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura pública" ON public.reservas;
DROP POLICY IF EXISTS "Permitir inserción pública" ON public.reservas;
DROP POLICY IF EXISTS "Permitir actualización pública" ON public.reservas;
DROP POLICY IF EXISTS "Permitir eliminación pública" ON public.reservas;
DROP POLICY IF EXISTS "Profesores y admins pueden ver reservas" ON public.reservas;
DROP POLICY IF EXISTS "Profesores pueden crear reservas" ON public.reservas;
DROP POLICY IF EXISTS "Admins pueden actualizar reservas" ON public.reservas;
DROP POLICY IF EXISTS "Admins pueden eliminar reservas" ON public.reservas;

-- Profesores pueden ver todas las reservas
CREATE POLICY "Profesores y admins pueden ver reservas" ON public.reservas
  FOR SELECT USING (auth.role() = 'authenticated');

-- Profesores pueden crear sus propias reservas
CREATE POLICY "Profesores pueden crear reservas" ON public.reservas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Admins pueden actualizar cualquier reserva
CREATE POLICY "Admins pueden actualizar reservas" ON public.reservas
  FOR UPDATE USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Admins pueden eliminar cualquier reserva
CREATE POLICY "Admins pueden eliminar reservas" ON public.reservas
  FOR DELETE USING (public.is_admin(auth.uid()));
