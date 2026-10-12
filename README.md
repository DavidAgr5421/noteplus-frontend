# Notas y Asistencias SENA - Frontend

Aplicación web para que instructores del SENA gestionen fichas, estudiantes, asistencias y calificaciones.

## Stack Tecnológico

- **React 19** + **TypeScript**
- **Vite** como bundler
- **React Router v7** para routing
- **TanStack Query (React Query)** para gestión de estado del servidor
- **React Hook Form** + **Zod** para formularios y validación
- **Tailwind CSS v4** para estilos
- **FullCalendar** para calendario de clases
- **Axios** para peticiones HTTP
- **Vitest** + **Testing Library** para tests

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/                    # Configuración principal de la app
│   │   └── App.tsx            # Router, providers, layout principal
│   ├── shared/                # Código compartido entre features
│   │   ├── api/               # Cliente Axios con interceptors
│   │   ├── hooks/             # Hooks genéricos (useApi, useAuth)
│   │   ├── types/             # Tipos de dominio compartidos
│   │   ├── ui/                # Componentes UI reutilizables
│   │   └── utils/             # Utilidades (fechas, formateo, etc.)
│   └── features/              # Features por módulo de negocio
│       ├── auth/              # Autenticación (login, register)
│       ├── fichas/            # Gestión de fichas
│       ├── estudiantes/       # Gestión de estudiantes
│       ├── asistencias/       # Calendario y marcado de asistencias
│       └── calificaciones/    # Calculadora de notas y actividades
├── public/                    # Assets estáticos
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## Reglas de Arquitectura (Clean Architecture)

- **shared/** no importa de **features/**
- **features/** solo importa de **shared/**
- Cada feature tiene: `api/`, `components/`, `hooks/`, `pages/`, `types/`
- La lógica de negocio está en el backend; el frontend solo presenta y orquesta

## Instalación

```bash
cd frontend
npm install
```

## Desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173` (o el puerto que asigne Vite).

## Build para Producción

```bash
npm run build
```

Los archivos se generan en `dist/`.

## Tests

```bash
npm run test
```

## Variables de Entorno

Copia `.env.example` a `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

## Rutas Principales

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión |
| `/register` | Registro de instructor |
| `/fichas` | Lista de fichas activas |
| `/fichas/archivadas` | Fichas archivadas |
| `/fichas/nueva` | Crear ficha |
| `/fichas/:id` | Detalle de ficha |
| `/fichas/:id/editar` | Editar ficha |
| `/fichas/:id/estudiantes` | Gestión de estudiantes |
| `/fichas/:id/actividades` | Actividades y porcentajes |
| `/fichas/:id/calificaciones` | Calculadora de notas |
| `/fichas/:id/asistencias` | Asistencias de la ficha |
| `/calendario` | Calendario global de clases |

## Autenticación

- JWT Access Token (15 min) en localStorage
- Refresh Token (7 días) en cookie HttpOnly
- Interceptor renueva token automáticamente en 401
- Rutas protegidas redirigen a `/login` si no hay token

## Convenciones

- Tipos de dominio en español (`Ficha`, `Estudiante`, `Asistencia`)
- Sufijos técnicos en inglés (`FichaRepository`, `useFichas`)
- Componentes UI en `shared/ui/`
- Hooks de datos en `features/*/hooks/`
- Un componente por archivo, export default