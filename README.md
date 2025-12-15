# Proyecto-Final
Desarrollo de Sistema para Gestión Biomédica
Sistema web para la gestión de un hospital o clínica, desarrollado con Node.js, Express, MySQL y Bootstrap, que permite administrar usuarios, médicos, enfermeros, pacientes, citas médicas y consultorios, con control de acceso por roles.

Este proyecto fue desarrollado con fines académicos, aplicando buenas prácticas de backend, control de sesiones y manejo de bases de datos relacionales.
##  Características principales

### 🔐 Autenticación y roles
- Inicio de sesión con sesiones (`express-session`)
- Roles de usuario:
  -  **Administrador**
  -  **Médico**
  -  **Enfermero**
  -  **Paciente**
- Control de acceso por ruta mediante **middleware**

---

###  Gestión de usuarios
- Registro y login de usuarios
- Asociación de usuarios con:
  - Médicos
  - Enfermeros
  - Pacientes
- Visualización de información según el rol del usuario

---

###  Médicos
- Registrar, editar y eliminar médicos
- Importar y exportar médicos en **Excel**
- Visualización general de médicos

---

###  Enfermeros
- Registro y edición de enfermeros
- Asignación de enfermeros a citas médicas
- Gestión por turnos

---

###  Pacientes
- Registro de pacientes desde administración
- Creación de acceso al sistema para pacientes
- Visualización de pacientes
- Importar y exportar pacientes en **Excel**

---

###  Citas médicas
- Registro de citas médicas
- Asignación de:
  - Paciente
  - Médico
  - Consultorio
  - Enfermero
- Actualización de:
  - Estado de la cita (*programada, cancelada, finalizada*)
  - Nivel de urgencia
- Filtro de citas por fecha
- Agenda médica personalizada según rol

---

###  Paciente – Vista personal
- Visualización de:
  - Próxima cita médica
  - Médico asignado
  - Estado de la cita
- Descarga de comprobante de cita en **PDF**

---

###  Consultorios
- Registro y gestión de consultorios
- Asociación de consultorios con citas médicas

## 🛠️ Tecnologías utilizadas

| Tecnología | Uso |
|-----------|-----|
| **Node.js** | Backend |
| **Express.js** | Framework web |
| **MySQL** | Base de datos |
| **mysql2** | Conexión a MySQL |
| **Bootstrap 5** | Interfaz gráfica |
| **Bootstrap Icons** | Iconos |
| **express-session** | Manejo de sesiones |
| **bcrypt** | Encriptación de contraseñas |
| **multer** | Subida de archivos |
| **xlsx** | Importación y exportación de Excel |
| **PDFKit / reportlab** | Generación de PDFs |

---

## 🗂️ Estructura del proyecto

```text
📁 proyecto/
│
├── server.js
├── .env
├── package.json
│
├── 📁 public/
│   ├── navbar.html
│   ├── styles.css
│   ├── 📁 bootstrap/
│
├── 📁 uploads/
│   ├── medicos.xlsx
│   ├── pacientes.xlsx
│
├── 📁 views/
│   ├── login.html
│   ├── registro.html
│
└── 📁 database/
    └── esquema.sql
##Instalar dependencia
```npm install
###Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=gestion_clinica
SESSION_SECRET=secreto_super_seguro

###Ejecutar el servidor
```npm start
## Middleware de seguridad

El sistema implementa **middlewares personalizados** para proteger las rutas del sistema:

```js
requireLogin
requireRole(['admin', 'medico', 'enfermero', 'paciente'])
###  Función de cada middleware

- **requireLogin**  
  Verifica que el usuario haya iniciado sesión antes de permitir el acceso a una ruta.

- **requireRole**  
  Restringe el acceso a las rutas según el rol del usuario autenticado  
  *(administrador, médico, enfermero o paciente)*.

##  Interfaz de usuario

- Navbar dinámico cargado mediante `fetch`
- Menús desplegables organizados por sección
- Opciones visibles según el rol del usuario
- Diseño completamente responsive usando **Bootstrap 5**

##  Funcionalidades destacadas

-  Roles y permisos reales
-  Base de datos relacional bien estructurada
-  Manejo seguro de sesiones
-  CRUD completo
-  Importación y exportación de archivos Excel
-  Generación de PDFs
-  Interfaz clara y organizada


##  Proyecto académico

Este proyecto fue desarrollado como parte de la materia **Bases de Datos** en la carrera de **Ingeniería Biomédica**, aplicando conceptos fundamentales como:

- Modelado relacional
- Llaves foráneas
- Normalización
- Integración backend–frontend

