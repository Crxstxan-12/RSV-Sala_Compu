# Sistema de Gestión de Reservas de Sala de Computación

Este es un sistema completo para gestionar reservas de una sala de computación, desarrollado con React + Vite y Supabase, con roles de usuario (Profesores y Administrador).

## Funcionalidades

- **Autenticación de usuarios**: Registro e inicio de sesión con correo y contraseña
- **Roles de usuario**:
  - **Profesores**: Pueden crear reservas y ver todas las reservas
  - **Encargado Sala Computación**: Tienen acceso completo, incluyendo panel de administración para aprobar, rechazar o eliminar reservas
- **Formulario de reservas**: Permite a los profesores registrar nuevas reservas con curso, fecha, horario y motivo
- **Prevención de conflictos**: Evita que se realicen reservas en el mismo horario
- **Visualización de reservas**: Tabla con todas las reservas ordenadas por fecha y hora
- **Panel de administración**: Solo para admins, permite aprobar, rechazar o eliminar reservas
- **Gestión de estados**: Las reservas pueden estar en estado pendiente, aprobada o rechazada
- **Seguridad con RLS**: Row Level Security para proteger los datos según roles

## Tecnologías

- **Frontend**: React + Vite
- **Backend/Base de datos**: Supabase
- **Autenticación**: Supabase Auth
- **Despliegue**: Vercel (recomendado)

## Configuración inicial

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. En **Table Editor**, crea las tablas:
   - `perfiles`: `id (uuid)`, `email (text)`, `nombre (text)`, `rol (text)`
   - `reservas`: agrega la columna `usuario_id (uuid)` además de las columnas existentes
4. En **Authentication**, habilita el proveedor Email/Password y configura (si quieres) la confirmación de correo
5. En **Database → Policies (RLS)**, configura permisos para que:
   - cada usuario pueda leer/crear su propio perfil
   - los admins puedan ver perfiles y administrar reservas

Nota: la aplicación crea el perfil automáticamente al iniciar sesión si no existe (guardando email, nombre y rol=profesor por defecto), siempre que la tabla `perfiles` permita INSERT/SELECT para usuarios autenticados.

### 2. Configurar variables de entorno

1. Copia el archivo `.env.example` y renómbralo a `.env`
2. En Supabase, ve a **Project Settings** > **API**
3. Copia tu **Project URL** y **anon/public key**
4. Pégalos en el archivo `.env`:

```
VITE_SUPABASE_URL=TU_URL_DEL_PROYECTO
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PÚBLICA
```

### 3. Crear un usuario Administrador

Para crear el primer usuario administrador:

1. Registra un usuario normal desde la aplicación
2. Ve a Supabase > **Table Editor** > **perfiles**
3. Encuentra el perfil del usuario que acabas de crear
4. Cambia el campo `rol` de `profesor` a `admin`

### 4. Instalar dependencias y ejecutar

```bash
npm install
npm run dev
```

El proyecto se abrirá en `http://localhost:5173`

## Uso del sistema

### Para Profesores
1. Registra una cuenta o inicia sesión
2. Ve a "Nueva Reserva" para crear una reserva
3. Ve a "Ver Reservas" para consultar todas las reservas

### Para Administradores
1. Inicia sesión con una cuenta de administrador
2. Tienes acceso a las mismas funcionalidades que los profesores
3. Además, puedes acceder al "Panel de Administración" para:
   - Aprobar reservas
   - Rechazar reservas
   - Eliminar reservas

## Despliegue en Vercel

1. Sube tu proyecto a GitHub
2. Ve a [vercel.com](https://vercel.com) e importa tu repositorio
3. En la sección de **Environment Variables**, agrega:
   - `VITE_SUPABASE_URL` con tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` con tu clave pública
4. Haz clic en **Deploy**

¡Listo! Tu aplicación estará disponible públicamente.

## Estructura del proyecto

```
src/
├── components/
│   ├── Auth.jsx              # Componente de autenticación (login/registro)
│   ├── ReservationForm.jsx   # Formulario de reservas
│   ├── ReservationsTable.jsx # Tabla de visualización
│   └── AdminPanel.jsx        # Panel de administración
├── App.jsx                    # Componente principal
├── App.css                    # Estilos
├── index.css                  # Estilos globales
├── main.jsx                   # Punto de entrada
└── supabaseClient.js          # Configuración de Supabase
```
