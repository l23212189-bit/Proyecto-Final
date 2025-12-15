# Proyecto-Final
Desarrollo de Sistema para Gestión Biomédica
Sistema web para la gestión de un hospital o clínica, desarrollado con Node.js, Express, MySQL y Bootstrap, que permite administrar usuarios, médicos, enfermeros, pacientes, citas médicas y consultorios, con control de acceso por roles.

Este proyecto fue desarrollado con fines académicos, aplicando buenas prácticas de backend, control de sesiones y manejo de bases de datos relacionales.
Características principales
🔐 Autenticación y roles

Inicio de sesión con sesiones (express-session)

Roles de usuario:

👑 Administrador

🩺 Médico

💉 Enfermero

🧑‍⚕️ Paciente

Control de acceso por ruta mediante middleware

👥 Gestión de usuarios

Registro y login de usuarios

Asociación de usuarios con:

Médicos

Enfermeros

Pacientes

Visualización de datos según rol

🩺 Médicos

Registrar, editar y eliminar médicos

Importar y exportar médicos en Excel

Visualización general de médicos

💉 Enfermeros

Registro y edición de enfermeros

Asignación de enfermeros a citas médicas

Gestión por turnos

🧑‍⚕️ Pacientes

Registro de pacientes desde administración

Creación de acceso al sistema para pacientes

Visualización de pacientes

Importar y exportar pacientes en Excel

📅 Citas médicas

Registro de citas

Asignación de:

Paciente

Médico

Consultorio

Enfermero

Actualización de:

Estado (programada, cancelada, finalizada)

Urgencia

Filtro por fecha

Agenda médica por rol

📄 Paciente – vista personal

Visualización de:

Próxima cita

Médico asignado

Estado de la cita

Descarga de comprobante de cita en PDF

🏢 Consultorios

Registro y gestión de consultorios

Asociación con citas médicas
