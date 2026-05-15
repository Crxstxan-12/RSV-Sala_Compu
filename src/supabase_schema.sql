-- Tabla de perfiles de usuarios para manejar roles
CREATE TABLE perfiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'profesor' CHECK (rol IN ('profesor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles
CREATE POLICY "Usuarios pueden ver su propio perfil" ON perfiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins pueden ver todos los perfiles" ON perfiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

CREATE POLICY "Admins pueden insertar perfiles" ON perfiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

CREATE POLICY "Admins pueden actualizar perfiles" ON perfiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Trigger para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'profesor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Actualizar tabla reservas para relacionar con usuarios
ALTER TABLE reservas 
  ADD COLUMN usuario_id UUID REFERENCES auth.users;

-- Políticas de seguridad para reservas
DROP POLICY IF EXISTS "Permitir lectura pública" ON reservas;
DROP POLICY IF EXISTS "Permitir inserción pública" ON reservas;
DROP POLICY IF EXISTS "Permitir actualización pública" ON reservas;
DROP POLICY IF EXISTS "Permitir eliminación pública" ON reservas;

-- Profesores pueden ver todas las reservas
CREATE POLICY "Profesores y admins pueden ver reservas" ON reservas
  FOR SELECT USING (auth.role() = 'authenticated');

-- Profesores pueden crear sus propias reservas
CREATE POLICY "Profesores pueden crear reservas" ON reservas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Admins pueden actualizar cualquier reserva
CREATE POLICY "Admins pueden actualizar reservas" ON reservas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Admins pueden eliminar cualquier reserva
CREATE POLICY "Admins pueden eliminar reservas" ON reservas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM perfiles 
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Función para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION public.es_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles 
    WHERE id = user_id AND rol = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
