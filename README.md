# Sistema de Gestión de Boletos - Shakira 8 Noviembre

Sistema completo para la gestión, entrega e impresión de boletos para el evento de Shakira del 8 de Noviembre.

## 🚀 Características

- **Frontend React** con Bootstrap y SweetAlert
- **Backend Node.js/Express** con MongoDB
- **Autenticación JWT** con roles y permisos
- **Sistema de auditoría** completo
- **Dashboard interactivo** con estadísticas
- **Gestión de usuarios** por roles
- **Control de impresión** y reimpresión
- **Filtros y búsqueda** avanzada

## 👥 Roles de Usuario

### Jefe
- Acceso completo al sistema
- Dashboard con estadísticas y gráficos
- Gestión de usuarios (crear, editar, eliminar)
- Visualización de auditoría
- Puede imprimir/reimprimir cualquier ticket
- Acceso a tabla completa de tickets

### Staff
- Selección de punto de trabajo
- Tabla dinámica con filtros de búsqueda
- Impresión de tickets con formulario obligatorio
- No puede reimprimir tickets ya impresos

### Impresor
- Selección de punto de trabajo
- Visualización solo de tickets impresos de su punto
- Reimpresión con motivos justificados
- Generación de enlaces de impresión

## 📋 Funcionalidades por Rol

### Dashboard (Solo Jefe)
- Porcentaje de tickets entregados
- Cantidad de tickets restantes
- Evolución diaria de entregas
- Filtros por punto de trabajo
- Gráficos interactivos

### Gestión de Tickets
- **Búsqueda por**: nombre, asiento, cédula, email, ticket ID
- **Filtros**: punto de trabajo, estado de impresión
- **Campos**: nombre, correo, localidad, asiento, cédula, ticket ID
- **Acciones**: imprimir, reimprimir (según rol)

### Formulario de Impresión
- ¿Quién retira? (Titular/Titular Compra/Otro)
- Campo ¿Quién? (si es "Otro")
- Celular (obligatorio)
- Registro automático de usuario responsable y fecha

### Sistema de Auditoría
- Registro de todas las acciones importantes
- Logs de impresiones y reimpresiones
- Historial de logins/logouts
- Creación de usuarios
- Cambios de contraseña

## 🛠️ Tecnologías

### Backend
- Node.js & Express
- MongoDB Atlas
- Mongoose ODM
- JWT para autenticación
- bcryptjs para hash de contraseñas
- Winston para logging
- Helmet para seguridad
- Rate limiting

### Frontend
- React 18
- Bootstrap 5
- SweetAlert2
- Axios para API calls
- React Router
- Context API para estado global

## 📦 Instalación

### Prerrequisitos
- Node.js 16+ 
- MongoDB Atlas account
- Git

### Backend Setup

```bash
cd backend
npm install
```

Configurar variables de entorno en `.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://gabriel:gabriel@bddshakira.l08bhec.mongodb.net/Shakira8Noviembre
JWT_SECRET=your-super-secret-jwt-key-here
DEFAULT_PASSWORD=FTT2025
LOG_LEVEL=info
```

Ejecutar el backend:
```bash
npm run dev  # Para desarrollo
npm start    # Para producción
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev  # Para desarrollo
npm run build # Para producción
```

## 🔐 Autenticación

### Usuario por Defecto
- **Usuario**: admin@shakira.com
- **Contraseña**: FTT2025

### Primer Acceso
- Todos los usuarios deben cambiar su contraseña en el primer acceso
- La contraseña por defecto para nuevos usuarios es "FTT2025"

## 📊 Estructura de Base de Datos

### Colección: users
```javascript
{
  nombre: String,
  usuario: String (email),
  password: String (hashed),
  rol: String (jefe/staff/impresor),
  puntoTrabajo: String,
  primerAcceso: Boolean,
  activo: Boolean,
  creadoPor: ObjectId
}
```

### Colección: FechaUno (tickets)
```javascript
{
  firstName: String,
  lastName: String,
  email: String,
  ticket: String,
  seat: String,
  transactionId: String,
  ticketId: String,
  cedula: String,
  impreso: Boolean,
  fechaImpresion: Date,
  usuarioResponsable: ObjectId,
  puntoTrabajo: String,
  quienRetira: String,
  quienOtro: String,
  celular: String,
  reimpresiones: Array
}
```

### Colección: auditlogs
```javascript
{
  tipo: String,
  usuario: ObjectId,
  ticketId: String,
  transactionId: String,
  puntoTrabajo: String,
  detalles: Object,
  ip: String,
  userAgent: String
}
```

## 🔄 Flujos de Trabajo

### Staff - Impresión de Ticket
1. Seleccionar punto de trabajo
2. Buscar ticket en tabla dinámica
3. Hacer clic en "Imprimir"
4. Llenar formulario obligatorio:
   - ¿Quién retira?
   - Celular
   - ¿Quién? (si es "Otro")
5. Confirmar impresión
6. Ticket queda marcado como impreso

### Impresor - Reimpresión
1. Seleccionar punto de trabajo
2. Ver tickets impresos de su punto
3. Hacer clic en "Reimprimir"
4. Seleccionar motivo de reimpresión
5. Generar enlace de impresión: `www.imprimir/id/{transactionId}`

### Jefe - Dashboard y Gestión
1. Ver estadísticas en tiempo real
2. Filtrar por punto de trabajo y fechas
3. Gestionar usuarios (crear, editar, eliminar)
4. Ver logs de auditoría completos
5. Acceso total a impresión/reimpresión

## 🚦 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login
- `POST /api/auth/change-password` - Cambiar contraseña
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Perfil de usuario

### Usuarios (Solo Jefe)
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Tickets
- `GET /api/tickets` - Listar tickets con filtros
- `GET /api/tickets/stats` - Estadísticas (solo jefe)
- `GET /api/tickets/transaction/:id` - Tickets por transacción
- `POST /api/tickets/:id/print` - Imprimir ticket
- `POST /api/tickets/:id/reprint` - Reimprimir ticket

### Auditoría (Solo Jefe)
- `GET /api/audit` - Logs de auditoría
- `GET /api/audit/summary` - Resumen de auditoría

## 🔒 Seguridad

- Contraseñas hasheadas con bcryptjs
- JWT tokens con expiración
- Rate limiting en todas las rutas
- Helmet para headers de seguridad
- Validación de entrada en frontend y backend
- Control de acceso basado en roles
- Logs de auditoría para trazabilidad

## 📝 Desarrollo

### Estructura del Proyecto
```
shakira-tickets-system/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── config/
│   │   └── scripts/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
└── README.md
```

### Scripts Disponibles

#### Backend
- `npm run dev` - Ejecutar con nodemon
- `npm start` - Ejecutar en producción
- `npm test` - Ejecutar tests

#### Frontend
- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build para producción
- `npm run preview` - Preview del build

## 🐛 Resolución de Problemas

### Problemas Comunes

1. **Error de conexión a MongoDB**
   - Verificar URI en variables de entorno
   - Confirmar credenciales de MongoDB Atlas
   - Verificar whitelist de IPs

2. **Error de autenticación**
   - Verificar JWT_SECRET en variables de entorno
   - Confirmar que el token no ha expirado

3. **Error de permisos**
   - Verificar rol del usuario
   - Confirmar que está autenticado

## 📞 Soporte

Para soporte o dudas sobre el sistema, contactar al equipo de desarrollo.

## 📄 Licencia

Este proyecto es privado y confidencial.
