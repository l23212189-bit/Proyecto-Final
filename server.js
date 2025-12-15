const express = require('express');
const app = express();
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const PDFDocument = require('pdfkit');
const fs = require('fs');
require('dotenv').config();
const upload = multer({ dest: 'uploads/' });
timezone: 'America/Tijuana'

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  next();
}

function requireRole(roles) {
  return (req, res, next) => {

    if (!req.session.user) {
      return res.redirect('/login.html');
    }

    const userRole = req.session.user.tipo_usuario;

    const allowedRoles = Array.isArray(roles)
      ? roles
      : [roles];

    console.log('ROL:', userRole);

    if (!allowedRoles.includes(userRole)) {
      return res.send(
        mensajeHTML(
          'Acceso denegado',
          'No tienes permisos para acceder a esta sección',
          'danger',
          '/'
        )
      );
    }

    next();
  };
}

// Configuración de la sesión
app.use(session({
  secret: 'secretKey',
  resave: false,
  saveUninitialized: false,
}));

function renderPage(req, titulo, contenido) {

  const user = req.session.user || {};

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>

  <!-- Bootstrap -->
  <link rel="stylesheet" href="/bootstrap/bootstrap.css">
  <script src="/bootstrap/bootstrap.bundle.js" defer></script>

  <!-- Bootstrap Icons -->
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css">
</head>

<body class="bg-light">

  <!-- NAVBAR -->
  <div id="navbar"></div>

  <!-- VARIABLES GLOBALES DEL USUARIO -->
  <script>
    window.USER_ROLE = "${user.tipo_usuario || ''}";
    window.USER_NAME = "${user.nombre_usuario || ''}";
  </script>

  <!-- CONTENIDO -->
  <main class="container mt-5 mb-5 pt-4">
    ${contenido}
  </main>

  <!-- FOOTER -->
  <footer class="bg-dark text-white text-center py-3 mt-auto">
    <small>
      Instituto Tecnológico de Tijuana · Ingeniería Biomédica ·
      Sistema Clínico © 2025
    </small>
  </footer>

  <!-- LÓGICA DEL NAVBAR -->
  <script>
    fetch('/navbar.html')
      .then(res => res.text())
      .then(html => {
        document.getElementById('navbar').innerHTML = html;

        const rol = window.USER_ROLE;
        const nombre = window.USER_NAME || 'Usuario';

        // Mostrar nombre
        const userSpan = document.getElementById('user-name');
        if (userSpan) userSpan.textContent = nombre;

        // Ocultar todos los roles
        document.querySelectorAll(
          '.role-admin, .role-medico, .role-enfermero, .role-paciente'
        ).forEach(el => el.style.display = 'none');

        // Mostrar según rol
        if (rol === 'admin') {
          document.querySelectorAll('.role-admin')
            .forEach(el => el.style.display = '');
        }

        if (rol === 'medico') {
          document.querySelectorAll('.role-medico')
            .forEach(el => el.style.display = '');
        }

        if (rol === 'enfermero') {
          document.querySelectorAll('.role-enfermero')
            .forEach(el => el.style.display = '');
        }

        if (rol === 'paciente') {
          document.querySelectorAll('.role-paciente')
            .forEach(el => el.style.display = '');
        }
      })
      .catch(err => console.error('Error cargando navbar:', err));
  </script>

</body>
</html>
`;
}



function mensajeHTML(titulo, mensaje, tipo, volver = '/') {
  const iconos = {
    success: 'check-circle',
    danger: 'x-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };
  const icono = iconos[tipo] || 'info-circle';
  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>

<link rel="stylesheet" href="/bootstrap/bootstrap.css">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet"
 href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css">

</head>
<body class="bg-light">

<div class="container mt-5">
  <div class="card shadow mx-auto p-4 text-center" style="max-width:500px;">
    
    <h4 class="text-${tipo}">
      <i class="bi bi-${icono}"></i> ${titulo}
    </h4>

    <p class="mt-3">${mensaje}</p>

    <div class="mt-4">
      <a href="${volver}" class="btn btn-${tipo} me-2">
        Volver
      </a>

      <button onclick="history.back()" class="btn btn-outline-secondary">
        Atrás
      </button>
    </div>

  </div>
</div>

</body>
</html>
`;
}

// Configurar la conexión a la base de datos usando variables de entorno

const connection = mysql.createConnection({
  host: process.env.DB_HOST,       // Host desde .env
  user: process.env.DB_USER,       // Usuario desde .env
  password: process.env.DB_PASS,   // Contraseña desde .env
  database: process.env.DB_NAME    // Nombre de la base de datos desde .env
});

// Conectar a la base de datos
connection.connect(err => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa a la base de datos');
});


app.use(express.urlencoded({ extended: true }));
app.use(express.json())
// ========= RUTAS PRIMERO =========

// inicio → login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// panel protegido
app.get('/panel', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ========= ESTÁTICOS AL FINAL =========
app.use(express.static(path.join(__dirname, 'public')));

// Servir archivos estáticos (HTML)


app.get('/menu', (req, res) => {
  const menuItems = [
    { nombre: 'Inicio', url: '/index.html' },
    { nombre: 'Equipos', url: '/equipos.html' },
    { nombre: 'Usuarios', url: '/usuarios.html' },
    { nombre: 'Búsqueda', url: '/busqueda.html' }
  ];
  res.json(menuItems);
});

app.get('/buscar', (req, res) => {
  const query = req.query.query;

  const sql = `
    SELECT id, nombre_usuario, tipo_usuario 
    FROM usuarios 
    WHERE nombre_usuario LIKE ?
  `;
  
  connection.query(sql, [`%${query}%`], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});



app.get('/buscar-usuarios', requireLogin, requireRole('admin'), (req, res) => {

  const contenido = `
    <div class="container">

      <h2 class="text-center mb-4">
        <i class="bi bi-search"></i>
        Búsqueda de Usuarios
      </h2>

      <div class="row justify-content-center mb-4">
        <div class="col-md-6">
          <input
            type="text"
            id="search"
            class="form-control form-control-lg"
            placeholder="Escribe para buscar usuarios..."
          >
        </div>
      </div>

      <div class="table-responsive">
        <table id="resultsTable" class="table table-striped table-hover text-center d-none">
          <thead class="table-dark">
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody id="resultsBody"></tbody>
        </table>
      </div>

      <div class="text-center mt-4">
        <a href="/" class="btn btn-secondary">
          <i class="bi bi-arrow-left"></i>
          Volver
        </a>
      </div>

    </div>

    <script>
      const search = document.getElementById('search');
      const table = document.getElementById('resultsTable');
      const resultsBody = document.getElementById('resultsBody');

      search.addEventListener('input', () => {
        const query = search.value.trim();

        if (!query) {
          table.classList.add('d-none');
          resultsBody.innerHTML = '';
          return;
        }

        fetch('/buscar?query=' + encodeURIComponent(query))
          .then(res => res.json())
          .then(data => {

            resultsBody.innerHTML = '';

            if (data.length === 0) {
              table.classList.add('d-none');
              return;
            }

            table.classList.remove('d-none');

            data.forEach(usuario => {
              const row = document.createElement('tr');

              row.innerHTML = \`
                <td>\${usuario.nombre_usuario}</td>
                <td>
                  <span class="badge bg-secondary text-uppercase">
                    \${usuario.tipo_usuario}
                  </span>
                </td>
              \`;

              row.style.cursor = 'pointer';
              row.onclick = () => {
                window.location.href = '/editar-usuario/' + usuario.id;
              };

              resultsBody.appendChild(row);
            });
          });
      });
    </script>
  `;

  res.send(renderPage(req, 'Buscar Usuarios', contenido));
});



app.post(
  '/submit-data',
  requireLogin,
  requireRole(['admin', 'medico', 'enfermero']),
  (req, res) => {

    const {
      nombre,
      edad,
      genero,
      telefono,
      correo,
      tipo_paciente
    } = req.body;

    const sql = `
      INSERT INTO pacientes
      (nombre, edad, genero, telefono, correo, tipo_paciente)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    connection.query(
      sql,
      [nombre, edad, genero, telefono, correo, tipo_paciente],
      err => {
        if (err) {
          console.error(err);
          return res.send(
            mensajeHTML(
              'Error',
              'No se pudo registrar el paciente',
              'danger'
            )
          );
        }

        res.redirect('/ver-pacientes');
      }
    );
  }
);

app.get('/registrar-signos', requireLogin, requireRole(['admin','enfermero']),  (req, res) => {
    connection.query(
      'SELECT id, nombre FROM pacientes',
      (err, pacientes) => {

        const opciones = pacientes
          .map(p => `<option value="${p.id}">${p.nombre}</option>`)
          .join('');

        const contenido = `
          <h2 class="text-center mb-4">Registrar Signos Vitales</h2>

          <form action="/registrar-signos" method="POST" class="card p-4 shadow row g-3">

            <div class="col-md-6">
              <label>Paciente</label>
              <select name="paciente_id" class="form-select" required>
                ${opciones}
              </select>
            </div>

            <div class="col-md-3">
              <label>Frecuencia cardíaca</label>
              <input type="number" name="frecuencia_cardiaca" class="form-control">
            </div>

            
            <div class="col-md-4">
              <label>Peso</label>
              <input type="number" step="0.1" name="peso" class="form-control">
            </div>

            <div class="col-md-4">
              <label>Estatura</label>
              <input type="number" step="0.01" name="estatura" class="form-control">
            </div>

            <div class="col-md-4">
              <label>Tipo de sangre</label>
              <input name="tipo_sangre" class="form-control">
            </div>

            <div class="col-6">
              <label>Alergias</label>
              <textarea name="alergias" class="form-control"></textarea>
            </div>

            <div class="col-6">
              <label>Padecimientos</label>
              <textarea name="padecimientos" class="form-control"></textarea>
            </div>

            <div class="col-12 text-center">
              <button class="btn btn-danger">Guardar signos</button>
            </div>
          </form>
        `;

        res.send(renderPage(req, 'Registrar Signos', contenido));
      }
    );
});

app.post('/registrar-signos',
  requireLogin,
  requireRole(['admin','enfermero']),
  (req, res) => {

    const {
      paciente_id,
      frecuencia_cardiaca,
      peso,
      estatura,
      tipo_sangre,
      alergias,
      padecimientos
    } = req.body;

    const sql = `
      UPDATE pacientes SET
        frecuencia_cardiaca = ?,
        peso = ?,
        estatura = ?,
        tipo_sangre = ?,
        alergias = ?,
        padecimientos = ?
      WHERE id = ?
    `;

    connection.query(
      sql,
      [
        frecuencia_cardiaca,
        peso,
        estatura,
        tipo_sangre,
        alergias,
        padecimientos,
        paciente_id
      ],
      err => {
        if (err) {
          console.error(err);
          return res.send(
            mensajeHTML('Error', 'No se pudieron guardar los signos', 'danger')
          );
        }

        res.redirect('/ver-pacientes');
      }
    );
});



//app.post('/insertar-medico', requireLogin, (req, res) => {
 // res.sendFile(path.join(__dirname, 'public', 'registro.html'));
//});

// Ruta para guardar datos en la base de datos


// Ruta para mostrar el formulario de edición de pacientes
app.get( '/editar-paciente/:id', requireLogin, requireRole(['admin', 'medico', 'enfermero']), (req, res) => {
    const { id } = req.params;

    const sql = 'SELECT * FROM pacientes WHERE id = ?';

    connection.query(sql, [id], (err, results) => {
      if (err || results.length === 0) {
        console.error(err);
        return res.send(
          mensajeHTML(
            'Error',
            'Paciente no encontrado.',
            'danger',
            '/ver-pacientes'
          )
        );
      }

      const p = results[0];

      const contenido = `
        <div class="container mt-4" style="max-width: 700px">
          <h2 class="text-center mb-4">
            <i class="bi bi-pencil-square"></i>
            Editar Paciente
          </h2>

          <form action="/editar-paciente/${p.id}" method="POST"
                class="card p-4 shadow">

            <div class="row g-3">

              <div class="col-md-6">
                <label class="form-label">Nombre</label>
                <input class="form-control" value="${p.nombre}" disabled>
              </div>

              <div class="col-md-3">
                <label class="form-label">Edad</label>
                <input class="form-control" value="${p.edad}" disabled>
              </div>

              <div class="col-md-3">
                <label class="form-label">Género</label>
                <input class="form-control" value="${p.genero}" disabled>
              </div>

              <div class="col-md-6">
                <label class="form-label">Teléfono</label>
                <input name="telefono" class="form-control"
                       value="${p.telefono || ''}">
              </div>

              <div class="col-md-6">
                <label class="form-label">Correo</label>
                <input name="correo" type="email" class="form-control"
                       value="${p.correo || ''}">
              </div>

          <div class="col-md-6">
            <label class="form-label">Tipo de paciente</label>
            <select name="tipo_paciente" class="form-select">

              <option value="general" ${p.tipo_paciente === 'general' ? 'selected' : ''}>
                General
              </option>

              <option value="pediatrico" ${p.tipo_paciente === 'pediatrico' ? 'selected' : ''}>
                Pediátrico
              </option>

              <option value="oncologico" ${p.tipo_paciente === 'oncologico' ? 'selected' : ''}>
                Oncológico
              </option>

              <option value="obstetrico" ${p.tipo_paciente === 'obstetrico' ? 'selected' : ''}>
                Obstétrico
              </option>

              <option value="geriatrico" ${p.tipo_paciente === 'geriatrico' ? 'selected' : ''}>
                Geriátrico
              </option>

            </select>
          </div>

              <div class="col-md-4">
                <label class="form-label">Frecuencia cardiaca</label>
                <input name="frecuencia_cardiaca" type="number"
                       class="form-control"
                       value="${p.frecuencia_cardiaca ?? ''}">
              </div>

              <div class="col-md-4">
                <label class="form-label">Peso (kg)</label>
                <input name="peso" type="number" step="0.1"
                       class="form-control"
                       value="${p.peso ?? ''}">
              </div>

              <div class="col-md-4">
                <label class="form-label">Estatura (m)</label>
                <input name="estatura" type="number" step="0.01"
                       class="form-control"
                       value="${p.estatura ?? ''}">
              </div>

              <div class="col-md-6">
                <label class="form-label">Tipo de sangre</label>
                <input name="tipo_sangre" class="form-control"
                       value="${p.tipo_sangre || ''}">
              </div>

              <div class="col-md-6">
                <label class="form-label">Alergias</label>
                <textarea name="alergias"
                          class="form-control">${p.alergias || ''}</textarea>
              </div>

              <div class="col-12">
                <label class="form-label">Padecimientos</label>
                <textarea name="padecimientos"
                          class="form-control">${p.padecimientos || ''}</textarea>
              </div>

              <div class="col-12 text-center mt-3">
                <button class="btn btn-success">
                  <i class="bi bi-save"></i> Guardar cambios
                </button>

                <a href="/ver-pacientes" class="btn btn-secondary ms-2">
                  Cancelar
                </a>
              </div>

            </div>
          </form>
        </div>
      `;

      res.send(renderPage(req, 'Editar Paciente', contenido));
    });
  }
);


app.post(
  '/editar-paciente/:id',
  requireLogin,
  requireRole(['admin', 'medico', 'enfermero']),
  (req, res) => {

    const { id } = req.params;

    const {
      telefono,
      correo,
      frecuencia_cardiaca,
      peso,
      estatura,
      tipo_sangre,
      alergias,
      padecimientos,
      tipo_paciente
    } = req.body;

    const sql = `
      UPDATE pacientes SET
        telefono = ?,
        correo = ?,
        frecuencia_cardiaca = ?,
        peso = ?,
        estatura = ?,
        tipo_sangre = ?,
        alergias = ?,
        padecimientos = ?,
        tipo_paciente = ?
      WHERE id = ?
    `;

    connection.query(
      sql,
      [
        telefono,
        correo,
        frecuencia_cardiaca,
        peso,
        estatura,
        tipo_sangre,
        alergias,
        padecimientos,
        tipo_paciente,
        id
      ],
      err => {
        if (err) {
          console.error(err);
          return res.send(
            mensajeHTML(
              'Error',
              'No se pudieron guardar los cambios.',
              'danger',
              '/ver-pacientes'
            )
          );
        }

        res.send(
          mensajeHTML(
            'Paciente actualizado',
            'Los datos fueron modificados correctamente.',
            'success',
            '/ver-pacientes'
          )
        );
      }
    );
  }
);

app.get('/registrar-medico', requireLogin, requireRole('admin'),  (req, res) => {
    const contenido = `
      <div class="container mt-4" style="max-width: 600px">

        <h2 class="text-center mb-4">
          <i class="bi bi-person-badge"></i>
          Registrar Médico
        </h2>

        <form action="/insertar-medico" method="POST"
              class="card p-4 shadow">

          <div class="mb-3">
            <label class="form-label">Usuario</label>
            <input type="text"
                   name="usuario"
                   class="form-control"
                   required>
          </div>

          <div class="mb-3">
            <label class="form-label">Contraseña</label>
            <input type="password"
                   name="password"
                   class="form-control"
                   required>
          </div>

          <hr>

          <div class="mb-3">
            <label class="form-label">Nombre completo</label>
            <input type="text"
                   name="medico_name"
                   class="form-control"
                   required>
          </div>

          <div class="mb-3">
            <label class="form-label">Especialidad</label>
            <input type="text"
                   name="especialidad"
                   class="form-control"
                   required>
          </div>

          <div class="text-center mt-4">
            <button class="btn btn-success px-4">
              <i class="bi bi-save"></i> Registrar
            </button>

            <a href="/ver-medicos"
               class="btn btn-secondary ms-2 px-4">
              Cancelar
            </a>
          </div>

        </form>
      </div>
    `;

    res.send(renderPage(req, 'Registrar Médico', contenido));
  }
);

// Ruta para insertar un nuevo médico
app.post( '/insertar-medico', requireLogin, requireRole(['admin']),  async (req, res) => {

    const {
      usuario,
      password,
      medico_name,
      especialidad
    } = req.body;

    try {
      const passwordHash = await bcrypt.hash(password, 10);

      // 1️⃣ Crear usuario
      connection.query(
        `
        INSERT INTO usuarios (nombre_usuario, password_hash, tipo_usuario)
        VALUES (?, ?, 'medico')
        `,
        [usuario.trim(), passwordHash],
        (err, result) => {

          if (err) {
            console.error('Error creando usuario:', err);
            return res.send(
              mensajeHTML(
                'Error',
                'El usuario ya existe o hubo un problema.',
                'danger',
                '/registrar-medico'
              )
            );
          }

          const usuarioId = result.insertId;

          // 2️⃣ Crear médico
          connection.query(
            `
            INSERT INTO medicos (usuario_id, nombre, especialidad)
            VALUES (?, ?, ?)
            `,
            [usuarioId, medico_name.trim(), especialidad.trim()],
            err => {

              if (err) {
                console.error('Error creando médico:', err);
                return res.send(
                  mensajeHTML(
                    'Error',
                    'No se pudo registrar el médico.',
                    'danger',
                    '/registrar-medico'
                  )
                );
              }

              res.redirect('/ver-medicos');
            }
          );
        }
      );

    } catch (error) {
      console.error(error);
      res.send(
        mensajeHTML(
          'Error',
          'Error interno del servidor.',
          'danger',
          '/registrar-medico'
        )
      );
    }
  }
);


app.get(
  '/ver-medicos',
  requireLogin,
  requireRole(['admin', 'medico', 'enfermero']),
  (req, res) => {

    connection.query('SELECT * FROM medicos', (err, results) => {
      if (err) {
        console.error(err);
        return res.send(
          mensajeHTML(
            'Error',
            'No se pudieron obtener los médicos.',
            'danger',
            '/'
          )
        );
      }

      let filas = '';
      results.forEach(m => {
        filas += `
          <tr class="text-center">
            <td>${m.nombre}</td>
            <td>${m.especialidad}</td>
            <td>
              <a href="/editar-medico/${m.id}"
                 class="btn btn-warning btn-sm me-1">
                <i class="bi bi-pencil-square"></i>
              </a>

              <a href="/eliminar-medico/${m.id}"
                 class="btn btn-danger btn-sm"
                 onclick="return confirm('¿Eliminar al médico ${m.nombre}?')">
                <i class="bi bi-trash"></i>
              </a>
            </td>
          </tr>
        `;
      });

      /* 🔹 NUEVO: BOTONES EXCEL */
      const accionesExcel =
        req.session.user.tipo_usuario === 'admin'
          ? `
            <div class="d-flex gap-2 mb-3">

              <a href="/download-medicos" class="btn btn-success">
                <i class="bi bi-file-earmark-excel"></i>
                Descargar Excel
              </a>

              <form action="/upload-medicos"
                    method="POST"
                    enctype="multipart/form-data"
                    class="d-flex gap-2">

                <input type="file"
                       name="excelFile"
                       accept=".xlsx"
                       class="form-control form-control-sm"
                       required>

                <button class="btn btn-primary">
                  <i class="bi bi-upload"></i>
                  Cargar Excel
                </button>
              </form>

            </div>
          `
          : '';

      const contenido = `
        <div class="container mt-4">

          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2>
              <i class="bi bi-person-badge"></i> Médicos
            </h2>

            <a href="/registrar-medico"
               class="btn btn-success role-admin">
              <i class="bi bi-plus-circle"></i> Nuevo Médico
            </a>
          </div>

          ${accionesExcel}

          <div class="table-responsive">
            <table class="table table-striped table-hover align-middle">
              <thead class="table-dark text-center">
                <tr>
                  <th>Nombre</th>
                  <th>Especialidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filas || `
                  <tr>
                    <td colspan="3" class="text-center">
                      No hay médicos registrados
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

        </div>
      `;

      res.send(renderPage(req, 'Médicos', contenido));
    });
  }
);

app.get(
  '/registrar-enfermero',
  requireLogin,
  requireRole(['admin']),
  (req, res) => {

    const contenido = `
      <div class="container mt-4" style="max-width:600px">

        <h2 class="text-center mb-4">
          <i class="bi bi-person-plus"></i>
          Registrar Enfermero
        </h2>

        <form action="/registrar-enfermero" method="POST"
              class="card p-4 shadow">

          <label class="form-label">Nombre completo</label>
          <input name="nombre" class="form-control mb-3" required>

          <label class="form-label">Usuario</label>
          <input name="usuario" class="form-control mb-3" required>

          <label class="form-label">Contraseña</label>
          <input type="password" name="password" class="form-control mb-3" required>

          <label class="form-label">Turno</label>
          <select name="turno" class="form-select mb-3" required>
            <option value="matutino">Matutino</option>
            <option value="vespertino">Vespertino</option>
            <option value="nocturno">Nocturno</option>
          </select>

          <label class="form-label">Teléfono</label>
          <input name="telefono" class="form-control mb-4">

          <button class="btn btn-success w-100">
            Registrar Enfermero
          </button>

        </form>
      </div>
    `;

    res.send(renderPage(req, 'Registrar Enfermero', contenido));
  }
);
app.post(
  '/registrar-enfermero',
  requireLogin,
  requireRole(['admin']),
  async (req, res) => {

    const { nombre, usuario, password, turno, telefono } = req.body;

    try {
      const hash = await bcrypt.hash(password, 10);

      // 1️⃣ Crear usuario
      connection.query(
        'INSERT INTO usuarios (nombre_usuario, password_hash, tipo_usuario) VALUES (?, ?, "enfermero")',
        [usuario, hash],
        (err, result) => {

          if (err) {
            console.error(err);
            return res.send(mensajeHTML(
              'Error',
              'El usuario ya existe',
              'danger',
              '/registrar-enfermero'
            ));
          }

          const usuario_id = result.insertId;

          // 2️⃣ Crear enfermero
          connection.query(
            'INSERT INTO enfermeros (usuario_id, nombre, turno, telefono) VALUES (?, ?, ?, ?)',
            [usuario_id, nombre, turno, telefono],
            err2 => {

              if (err2) {
                console.error(err2);
                return res.send('Error al crear enfermero');
              }

              res.redirect('/ver-enfermeros');
            }
          );
        }
      );
    } catch (e) {
      res.send('Error inesperado');
    }
  }
);

app.get(
  '/ver-enfermeros',
  requireLogin,
  requireRole(['admin', 'medico', 'enfermero']),
  (req, res) => {

    const sql = `
      SELECT e.id, e.nombre, e.turno, e.activo
      FROM enfermeros e
    `;

    connection.query(sql, (err, results) => {
      if (err) {
        console.error(err);
        return res.send(
          mensajeHTML(
            'Error',
            'No se pudieron obtener los enfermeros.',
            'danger',
            '/'
          )
        );
      }

      let filas = '';

      results.forEach(e => {
        const badgeTurno =
          e.turno === 'mañana' ? 'warning' :
          e.turno === 'tarde'  ? 'primary' :
          'dark';

        filas += `
          <tr class="text-center">
            <td>${e.nombre}</td>

            <td>
              <span class="badge bg-${badgeTurno}">
                ${e.turno}
              </span>
            </td>

            <td>
              ${
                e.activo
                  ? '<span class="badge bg-success">Activo</span>'
                  : '<span class="badge bg-secondary">Inactivo</span>'
              }
            </td>

            <td>
              ${
                req.session.user.tipo_usuario === 'admin'
                  ? `
                    <!-- EDITAR -->
                    <a href="/editar-enfermero/${e.id}"
                       class="btn btn-warning btn-sm me-1">
                      <i class="bi bi-pencil-square"></i>
                    </a>
                    <!-- VER-->
                    <a href="/ver-enfermero/${e.id}"
                       class="btn btn-info btn-sm me-1">
                      <i class="bi bi-eye"></i>
                    </a>
                    <!-- ELIMINAR -->
                    <a href="/eliminar-enfermero/${e.id}"
                       class="btn btn-danger btn-sm"
                       onclick="return confirm('¿Eliminar al enfermero ${e.nombre}?')">
                      <i class="bi bi-trash"></i>
                    </a>
                  `
                  : '<span class="text-muted">—</span>'
              }
            </td>
          </tr>
        `;
      });

      const contenido = `
        <div class="container mt-4">

          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2>
              <i class="bi bi-heart-pulse"></i> Enfermeros
            </h2>

            ${
              req.session.user.tipo_usuario === 'admin'
                ? `
                  <a href="/registrar-enfermero"
                     class="btn btn-success">
                    <i class="bi bi-plus-circle"></i> Nuevo Enfermero
                  </a>
                `
                : ''
            }
          </div>

          <div class="table-responsive">
            <table class="table table-striped table-hover align-middle">
              <thead class="table-dark text-center">
                <tr>
                  <th>Nombre</th>
                  <th>Turno</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filas || `
                  <tr>
                    <td colspan="4" class="text-center">
                      No hay enfermeros registrados
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

        </div>
      `;

      res.send(renderPage(req, 'Enfermeros', contenido));
    });
  }
);


app.get(
  '/editar-enfermero/:id',
  requireLogin,
  requireRole(['admin']),
  (req, res) => {

    const { id } = req.params;

    connection.query(
      'SELECT * FROM enfermeros WHERE id = ?',
      [id],
      (err, results) => {

        if (err || results.length === 0) {
          return res.send(
            mensajeHTML(
              'Error',
              'Enfermero no encontrado.',
              'danger',
              '/ver-enfermeros'
            )
          );
        }

        const e = results[0];

        const contenido = `
          <div class="container mt-4" style="max-width: 600px">

            <h2 class="text-center mb-4">
              <i class="bi bi-pencil-square"></i>
              Editar Enfermero
            </h2>

            <form action="/editar-enfermero/${e.id}" method="POST"
                  class="card p-4 shadow">

              <div class="mb-3">
                <label class="form-label">Nombre</label>
                <input type="text"
                       name="nombre"
                       class="form-control"
                       value="${e.nombre}"
                       required>
              </div>

              <div class="mb-3">
                <label class="form-label">Turno</label>
                <select name="turno" class="form-select" required>
                  <option value="matutino" ${e.turno === 'matutino' ? 'selected' : ''}>
                    Matutino
                  </option>
                  <option value="vespertino" ${e.turno === 'vespertino' ? 'selected' : ''}>
                    Vespertino
                  </option>
                  <option value="nocturno" ${e.turno === 'nocturno' ? 'selected' : ''}>
                    Nocturno
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">Estado</label>
                <select name="activo" class="form-select" required>
                  <option value="1" ${e.activo === 1 ? 'selected' : ''}>
                    Activo
                  </option>
                  <option value="0" ${e.activo === 0 ? 'selected' : ''}>
                    Inactivo
                  </option>
                </select>
              </div>

              <div class="text-center mt-4">
                <button class="btn btn-success px-4">
                  <i class="bi bi-save"></i> Guardar cambios
                </button>

                <a href="/ver-enfermeros"
                   class="btn btn-secondary ms-2 px-4">
                  Cancelar
                </a>
              </div>

            </form>
          </div>
        `;

        res.send(renderPage(req, 'Editar Enfermero', contenido));
      }
    );
  }
);

app.post(
  '/editar-enfermero/:id',
  requireLogin,
  requireRole(['admin']),
  (req, res) => {

    const { id } = req.params;
    const { nombre, turno, activo } = req.body;

    connection.query(
      `
        UPDATE enfermeros
        SET nombre = ?, turno = ?, activo = ?
        WHERE id = ?
      `,
      [nombre, turno, activo, id],
      err => {

        if (err) {
          console.error(err);
          return res.send(
            mensajeHTML(
              'Error',
              'No se pudieron guardar los cambios.',
              'danger',
              '/ver-enfermeros'
            )
          );
        }

        res.send(
          mensajeHTML(
            'Enfermero actualizado',
            'Los datos fueron modificados correctamente.',
            'success',
            '/ver-enfermeros'
          )
        );
      }
    );
  }
);

app.get(
  '/eliminar-enfermero/:id',
  requireLogin,
  requireRole('admin'),
  (req, res) => {

    connection.query(
      'DELETE FROM enfermeros WHERE id = ?',
      [req.params.id],
      err => {
        if (err) return res.send('Error al eliminar');
        res.redirect('/ver-enfermeros');
      }
    );
});
app.get(
  '/ver-enfermero/:id',
  requireLogin,
  requireRole(['admin', 'medico', 'enfermero']),
  (req, res) => {

    const { id } = req.params;

    connection.query(
      `
        SELECT id, nombre, turno, activo
        FROM enfermeros
        WHERE id = ?
      `,
      [id],
      (err, results) => {

        if (err || results.length === 0) {
          return res.send(
            mensajeHTML(
              'Error',
              'Enfermero no encontrado.',
              'danger',
              '/ver-enfermeros'
            )
          );
        }

        const e = results[0];

        const estadoBadge = e.activo
          ? '<span class="badge bg-success">Activo</span>'
          : '<span class="badge bg-secondary">Inactivo</span>';

        const turnoBadge =
          e.turno === 'matutino' ? 'bg-warning text-dark' :
          e.turno === 'vespertino' ? 'bg-primary' :
          'bg-dark';

        const contenido = `
          <div class="container mt-5">

            <div class="row justify-content-center">
              <div class="col-md-6">

                <div class="card shadow">

                  <div class="card-header bg-success text-white text-center">
                    <h4>
                      <i class="bi bi-person-badge"></i>
                      Datos del Enfermero
                    </h4>
                  </div>

                  <div class="card-body fs-5">

                    <p>
                      <strong>ID:</strong> ${e.id}
                    </p>

                    <p>
                      <strong>Nombre:</strong> ${e.nombre}
                    </p>

                    <p>
                      <strong>Turno:</strong>
                      <span class="badge ${turnoBadge}">
                        ${e.turno}
                      </span>
                    </p>

                    <p>
                      <strong>Estado:</strong>
                      ${estadoBadge}
                    </p>

                  </div>

                  <div class="card-footer text-center">
                    <a href="/ver-enfermeros" class="btn btn-secondary">
                      <i class="bi bi-arrow-left"></i> Volver
                    </a>

                    <a href="/editar-enfermero/${e.id}"
                       class="btn btn-warning ms-2 role-admin">
                      <i class="bi bi-pencil-square"></i> Editar
                    </a>
                  </div>

                </div>

              </div>
            </div>

          </div>
        `;

        res.send(renderPage(req, 'Ver Enfermero', contenido));
      }
    );
  }
);


app.get(  '/registrar-paciente',  requireLogin,  requireRole(['admin', 'medico', 'enfermero']),  (req, res) => {
    const contenido = `
      <div class="container mt-4" style="max-width: 900px">

        <h2 class="text-center mb-4">
          <i class="bi bi-person-plus"></i>
          Registrar Paciente
        </h2>

        <form action="/submit-data" method="POST" class="card p-4 shadow">

          <div class="row g-3">

            <div class="col-md-6">
              <label class="form-label">Nombre completo</label>
              <input type="text" name="nombre" class="form-control" required>
            </div>

            <div class="col-md-3">
              <label class="form-label">Edad</label>
              <input type="number" name="edad" class="form-control" required>
            </div>

            <div class="col-md-3">
              <label class="form-label">Género</label>
              <select name="genero" class="form-select" required>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label">Tipo de paciente</label>
              <select name="tipo_paciente" class="form-select" required>
                <option value="general">General</option>
                <option value="pediatrico">Pediátrico</option>
                <option value="oncologico">Oncológico</option>
                <option value="obstetrico">Obstétrico</option>
                <option value="geriatrico">Geriátrico</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label">Teléfono</label>
              <input type="text" name="telefono" class="form-control">
            </div>

            <div class="col-md-6">
              <label class="form-label">Correo</label>
              <input type="email" name="correo" class="form-control">
            </div>

            <div class="col-12 text-center mt-4">
              <button type="submit" class="btn btn-success px-4">
                <i class="bi bi-check-circle"></i>
                Guardar Paciente
              </button>

              <a href="/ver-pacientes" class="btn btn-secondary ms-2 px-4">
                Cancelar
              </a>
            </div>

          </div>
        </form>
      </div>
    `;

    res.send(renderPage(req, 'Registrar Paciente', contenido));
  }
);

// Ruta para mostrar los datos de la base de datos en formato HTML
app.get(
  '/ver-pacientes',
  requireLogin,
  requireRole(['admin', 'medico', 'enfermero']),
  (req, res) => {

    connection.query('SELECT * FROM pacientes', (err, results) => {
      if (err) {
        console.error(err);
        return res.send(
          mensajeHTML(
            'Error',
            'No se pudieron obtener los pacientes.',
            'danger',
            '/'
          )
        );
      }

      /* 🔹 NUEVO: BOTONES EXCEL */
      const accionesExcel =
        ['admin', 'medico'].includes(req.session.user.tipo_usuario)
          ? `
            <div class="d-flex gap-2 mb-3">

              <a href="/download-pacientes" class="btn btn-success">
                <i class="bi bi-file-earmark-excel"></i>
                Descargar Excel
              </a>

              <form action="/upload-pacientes"
                    method="POST"
                    enctype="multipart/form-data"
                    class="d-flex gap-2">

                <input type="file"
                       name="excelFile"
                       accept=".xlsx"
                       class="form-control form-control-sm"
                       required>

                <button class="btn btn-primary">
                  <i class="bi bi-upload"></i>
                  Cargar Excel
                </button>
              </form>

            </div>
          `
          : '';

      let contenido = `
        <div class="container mt-4">

        <h1 class="mb-4">Pacientes</h1>

        ${accionesExcel}

        <div class="table-responsive">
          <table class="table table-striped table-hover align-middle">
            <thead class="table-dark text-center">
              <tr>
                <th>Nombre</th>
                <th>Género</th>
                <th>Edad</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>FC</th>
                <th>Peso</th>
                <th>Estatura</th>
                <th>Tipo Sangre</th>
                <th>Tipo Paciente</th>
                <th>Acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
      `;

      results.forEach(p => {
        contenido += `
          <tr class="text-center">
            <td>${p.nombre}</td>
            <td>${p.genero || '-'}</td>
            <td>${p.edad}</td>
            <td>${p.telefono || '-'}</td>
            <td>${p.correo || '-'}</td>
            <td>${p.frecuencia_cardiaca ?? '-'}</td>
            <td>${p.peso ?? '-'}</td>
            <td>${p.estatura ?? '-'}</td>
            <td>${p.tipo_sangre || '-'}</td>

            <td>
              ${
                p.tipo_paciente
                  ? `<span class="badge bg-primary">${p.tipo_paciente}</span>`
                  : '-'
              }
            </td>

            <td>
              ${
                p.usuario_id === null
                  ? `
                    <a href="/crear-acceso-paciente/${p.id}"
                       class="btn btn-sm btn-primary"
                       onclick="return confirm('¿Crear acceso al paciente?')">
                       <i class="bi bi-person-check"></i>
                       Crear acceso
                    </a>
                  `
                  : `<span class="badge bg-success">Con acceso</span>`
              }
            </td>

            <td>
              <a href="/editar-paciente/${p.id}"
                 class="btn btn-warning btn-sm me-1">
                <i class="bi bi-pencil-square"></i>
              </a>

              <a href="/ver-datos-paciente/${p.id}"
                 class="btn btn-info btn-sm me-1">
                <i class="bi bi-eye"></i>
              </a>

              <form action="/eliminar-paciente/${p.id}"
                    method="POST"
                    style="display:inline">
                <button class="btn btn-danger btn-sm">
                  <i class="bi bi-trash"></i>
                </button>
              </form>
            </td>
          </tr>
        `;
      });

      contenido += `
            </tbody>
          </table>
        </div>
        </div>
      `;

      res.send(renderPage(req, 'Pacientes', contenido));
    });
  }
);

app.get(
  '/crear-acceso-paciente/:id',
  requireLogin,
  requireRole(['admin']),
  (req, res) => {

    const { id } = req.params;

    // Verificar que el paciente exista y NO tenga acceso
    connection.query(
      'SELECT id, nombre FROM pacientes WHERE id = ? AND usuario_id IS NULL',
      [id],
      (err, rows) => {

        if (err || rows.length === 0) {
          return res.send(
            mensajeHTML(
              'No permitido',
              'El paciente no existe o ya tiene acceso.',
              'warning',
              '/ver-pacientes'
            )
          );
        }

        const paciente = rows[0];

        const contenido = `
          <div class="container mt-4" style="max-width:600px">

            <h3 class="text-center mb-4">
              Crear acceso para <strong>${paciente.nombre}</strong>
            </h3>

            <form action="/crear-acceso-paciente/${paciente.id}"
                  method="POST"
                  class="card p-4 shadow">

              <div class="mb-3">
                <label class="form-label">Usuario</label>
                <input type="text"
                       name="usuario"
                       class="form-control"
                       required>
              </div>

              <div class="mb-3">
                <label class="form-label">Contraseña</label>
                <input type="password"
                       name="password"
                       class="form-control"
                       required>
              </div>

              <div class="text-center">
                <button class="btn btn-success">
                  <i class="bi bi-person-check"></i> Crear acceso
                </button>

                <a href="/ver-pacientes"
                   class="btn btn-secondary ms-2">
                  Cancelar
                </a>
              </div>

            </form>
          </div>
        `;

        res.send(renderPage(req, 'Crear acceso paciente', contenido));
      }
    );
  }
);


app.post(
  '/crear-acceso-paciente/:id',
  requireLogin,
  requireRole(['admin']),
  async (req, res) => {

    const { id } = req.params;
    const { usuario, password } = req.body;

    try {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash(password, 10);

      // 1️⃣ Crear usuario
      connection.query(
        `INSERT INTO usuarios (nombre_usuario, password_hash, tipo_usuario)
         VALUES (?, ?, 'paciente')`,
        [usuario, hash],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.send(
              mensajeHTML(
                'Error',
                'El usuario ya existe.',
                'danger',
                '/ver-pacientes'
              )
            );
          }

          const usuarioId = result.insertId;

          // 2️⃣ Ligar paciente con usuario
          connection.query(
            'UPDATE pacientes SET usuario_id = ? WHERE id = ?',
            [usuarioId, id],
            err2 => {
              if (err2) {
                console.error(err2);
                return res.send(
                  mensajeHTML(
                    'Error',
                    'No se pudo ligar el paciente.',
                    'danger',
                    '/ver-pacientes'
                  )
                );
              }

              res.send(
                mensajeHTML(
                  'Acceso creado',
                  'El paciente ya puede iniciar sesión.',
                  'success',
                  '/ver-pacientes'
                )
              );
            }
          );
        }
      );
    } catch (e) {
      console.error(e);
      res.send(
        mensajeHTML(
          'Error',
          'Error inesperado.',
          'danger',
          '/ver-pacientes'
        )
      );
    }
  }
);


app.post(
  '/eliminar-paciente/:id',
  requireLogin,
  requireRole('admin'),
  (req, res) => {

    const id = req.params.id;

    connection.query(
      'DELETE FROM pacientes WHERE id = ?',
      [id],
      err => {
        if (err) {
          console.error(err);
          return res.send(
            mensajeHTML(
              'Error',
              'No se pudo eliminar el paciente.',
              'danger',
              '/ver-pacientes'
            )
          );
        }

        res.redirect('/ver-pacientes');
      }
    );
  }
);


app.get('/gestionar-registros', requireLogin, requireRole('admin'), (req, res) => {
    const sql = `SELECT id, nombre_usuario, tipo_usuario FROM usuarios`;

    connection.query(sql, (err, results) => {
      if (err) {
        console.error(err);
        return res.send('Error al obtener los usuarios');
      }

      let filas = '';
      results.forEach(u => {
        const badge =
          u.tipo_usuario === 'admin' ? 'danger' :
          u.tipo_usuario === 'medico' ? 'primary' :
          u.tipo_usuario === 'enfermero' ? 'warning' :
          'secondary';

        filas += `
          <tr>
            <td>${u.nombre_usuario}</td>
            <td>
              <span class="badge bg-${badge}">
                ${u.tipo_usuario}
              </span>
            </td>
            <td>
              <a href="/editar-usuario/${u.id}" class="btn btn-sm btn-warning">
                Editar
              </a>
              <a href="/eliminar-usuario/${u.id}"
                 class="btn btn-sm btn-danger"
                 onclick="return confirm('¿Eliminar usuario?')">
                Eliminar
              </a>
            </td>
          </tr>
        `;
      });

      const contenido = `
        <div class="container mt-4">

          <h2 class="text-center mb-4">Gestión de Usuarios</h2>

          <div class="mb-3 text-end">
            <a href="/registro" class="btn btn-success">
              + Registrar Usuario
            </a>
          </div>

          <div class="table-responsive">
            <table class="table table-bordered table-striped text-center">
              <thead class="table-dark">
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${filas}
              </tbody>
            </table>
          </div>

          <div class="text-center mt-4">
            <a href="/" class="btn btn-secondary">Volver</a>
          </div>

        </div>
      `;

      res.send(renderPage(req, 'Gestionar Usuarios', contenido));
    });
  }
);


app.get('/registro', requireLogin, requireRole('admin'), (req, res) => {
    const contenido = `
      <div class="container mt-5" style="max-width: 500px;">

        <h2 class="text-center mb-4">Registrar Nuevo Usuario</h2>

        <form action="/registro" method="POST" class="card p-4 shadow">

          <input type="hidden" name="from" value="admin">

          <div class="mb-3">
            <label class="form-label">Nombre de usuario</label>
            <input type="text" name="username" class="form-control" required>
          </div>

          <div class="mb-3">
            <label class="form-label">Contraseña</label>
            <input type="password" name="password" class="form-control" required>
          </div>

          <div class="mb-3">
            <label class="form-label">Código de acceso</label>
            <input type="text" name="codigo_acceso" class="form-control" required>
            <div class="form-text">
              Define el rol del usuario (admin, médico, enfermero o paciente).
            </div>
          </div>

          <div class="d-grid gap-2">
            <button type="submit" class="btn btn-success">
              Registrar usuario
            </button>
            <a href="/gestionar-registros" class="btn btn-secondary">
              Volver
            </a>
          </div>

        </form>
      </div>
    `;

    res.send(renderPage(req, 'Registrar Usuario', contenido));
  }
);



app.get(
  '/editar-usuario/:id',
  requireLogin,
  requireRole('admin'),
  (req, res) => {

    const id = req.params.id;
    const sql = `SELECT * FROM usuarios WHERE id = ?`;

    connection.query(sql, [id], (err, results) => {
      if (err || results.length === 0) {
        return res.send('Usuario no encontrado.');
      }

      const usuario = results[0];

      const contenido = `
        <div class="container mt-5" style="max-width: 500px;">

          <h2 class="text-center mb-4">Editar Usuario</h2>

          <form action="/editar-usuario/${id}" method="POST"
                class="card p-4 shadow">

            <div class="mb-3">
              <label class="form-label">Nombre de usuario</label>
              <input type="text"
                     name="nombre_usuario"
                     class="form-control"
                     value="${usuario.nombre_usuario}"
                     required>
            </div>

            <div class="mb-3">
              <label class="form-label">Tipo de usuario</label>
              <select name="tipo_usuario" class="form-select" required>
                <option value="admin" ${usuario.tipo_usuario === 'admin' ? 'selected' : ''}>
                  Administrador
                </option>
                <option value="medico" ${usuario.tipo_usuario === 'medico' ? 'selected' : ''}>
                  Médico
                </option>
                <option value="enfermero" ${usuario.tipo_usuario === 'enfermero' ? 'selected' : ''}>
                  Enfermero
                </option>
                <option value="paciente" ${usuario.tipo_usuario === 'paciente' ? 'selected' : ''}>
                  Paciente
                </option>
              </select>
            </div>

            <div class="d-grid gap-2">
              <button type="submit" class="btn btn-primary">
                Guardar cambios
              </button>

              <a href="/gestionar-registros" class="btn btn-secondary">
                Volver
              </a>
            </div>

          </form>
        </div>
      `;

      res.send(renderPage(req, 'Editar Usuario', contenido));
    });
  }
);

app.post('/editar-usuario/:id',requireLogin, requireRole('admin'),(req, res) => {
    const id = req.params.id;
    const { nombre_usuario, tipo_usuario } = req.body;

    const sql = `
      UPDATE usuarios
      SET nombre_usuario = ?, tipo_usuario = ?
      WHERE id = ?
    `;
    connection.query(sql, [nombre_usuario, tipo_usuario, id], (err) => {
      if (err) {
        console.error(err);
        return res.send("Error al actualizar usuario.");
      }
      res.redirect('/gestionar-registros');
    });
});


app.get('/eliminar-usuario/:id',requireLogin,requireRole('admin'),(req, res) => {
    const id = req.params.id;

    const sql = `DELETE FROM usuarios WHERE id = ?`;

    connection.query(sql, [id], (err) => {
      if (err) {
        console.error(err);
        return res.send("Error al eliminar el usuario.");
      }
      res.redirect('/gestionar-registros');
    });
});


app.get('/editar-medico/:id',
  requireLogin,
  requireRole('admin'),
  (req, res) => {

    connection.query(
      'SELECT * FROM medicos WHERE id = ?',
      [req.params.id],
      (err, results) => {

        if (err || results.length === 0)
          return res.send("Médico no encontrado.");

        const medico = results[0];

        const contenido = `
          <div class="container mt-4">
            <h2 class="text-center mb-4">Editar Médico</h2>

            <form action="/editar-medico/${medico.id}" method="POST" class="card p-4 shadow">

              <label>Nombre</label>
              <input class="form-control mb-3" type="text" name="nombre"
                     value="${medico.nombre}" required>

              <label>Especialidad</label>
              <input class="form-control mb-3" type="text" name="especialidad"
                     value="${medico.especialidad}" required>

              <button class="btn btn-primary w-100">
                Guardar cambios
              </button>
            </form>

            <div class="text-center mt-3">
              <a href="/ver-medicos" class="btn btn-secondary">Volver</a>
            </div>
          </div>
        `;

        res.send(renderPage(req, "Editar Médico", contenido));
      }
    );
});

app.post('/editar-medico/:id', requireLogin, requireRole('admin'),(req, res) => {
    const { nombre, especialidad } = req.body;
    connection.query(
      'UPDATE medicos SET nombre = ?, especialidad = ? WHERE id = ?',
      [nombre, especialidad, req.params.id],
      err => {
        if (err) return res.send("Error al actualizar médico.");
        res.redirect('/ver-medicos');
      }
    );
});

app.get( '/eliminar-medico/:id',  requireLogin,  requireRole('admin'), (req, res) => {
    const id = req.params.id;

    connection.query(
      'SELECT usuario_id FROM medicos WHERE id = ?',
      [id],
      (err, rows) => {

        if (err || rows.length === 0)
          return res.send("Médico no encontrado");

        const usuarioId = rows[0].usuario_id;

        // 1️⃣ Eliminar médico
        connection.query(
          'DELETE FROM medicos WHERE id = ?',
          [id],
          err => {
            if (err) return res.send("Error al eliminar médico");

            // 2️⃣ Eliminar usuario
            connection.query(
              'DELETE FROM usuarios WHERE id = ?',
              [usuarioId],
              err => {
                if (err) return res.send("Error al eliminar usuario");

                res.redirect('/ver-medicos');
              }
            );
          }
        );
      }
    );
  }
);


app.get(
  '/buscar-citas-medico',
  requireLogin,
  requireRole(['admin', 'medico', 'enfermero']),
  (req, res) => {

    const fecha = req.query.fecha;
    const rol = req.session.user.tipo_usuario;
    const nombreUsuario = req.session.user.nombre_usuario;

    let sql = `
      SELECT
        c.id,
        c.fecha,
        c.hora,
        c.urgencia,
        c.estado,
        p.nombre AS paciente,
        m.nombre AS medico,
        con.nombre AS consultorio
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN medicos m ON c.medico_id = m.id
      JOIN consultorios con ON c.consultorio_id = con.id
      WHERE c.fecha >= CURDATE()
    `;

    const params = [];

    // 🔐 Médico solo ve sus citas
    if (rol === 'medico') {
      sql += ' AND m.nombre = ?';
      params.push(nombreUsuario);
    }

    // 📅 Filtro por fecha
    if (fecha) {
      sql += ' AND c.fecha = ?';
      params.push(fecha);
    }

    sql += ' ORDER BY c.fecha ASC, c.hora ASC';

    connection.query(sql, params, (err, results) => {
      if (err) {
        console.error(err);
        return res.send(
          mensajeHTML(
            'Error',
            'Error al obtener las citas.',
            'danger',
            '/'
          )
        );
      }

      let filas = '';

      results.forEach(c => {
        const badgeUrgencia =
          c.urgencia === 'alta' ? 'danger' :
          c.urgencia === 'media' ? 'warning' :
          'success';

        filas += `
          <tr>
            <td>
              ${new Date(c.fecha).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </td>

            <td>${c.hora}</td>
            <td>${c.paciente}</td>
            <td>${c.medico}</td>
            <td>${c.consultorio}</td>

            <td>
              <span class="badge bg-${badgeUrgencia}">
                ${c.urgencia}
              </span>
            </td>

          <td>
  ${
    rol === 'admin'
      ? `
        <span class="badge bg-secondary mb-1 d-inline-block">
          ${c.estado}
        </span>
        <br>
        <a href="/actualizar-estado-cita/${c.id}"
           class="btn btn-sm btn-outline-primary mt-1">
          Editar estado
        </a>
      `
      : `<span class="badge bg-secondary">${c.estado}</span>`
  }
</td>

            ${
              rol === 'admin'
                ? `
                  <td>
                    <a href="/asignar-enfermero/${c.id}"
                       class="btn btn-sm btn-success">
                      <i class="bi bi-person-plus"></i>
                      Enfermero
                    </a>
                  </td>
                `
                : ''
            }
          </tr>
        `;
      });

      const contenido = `
        <div class="container mt-4">

          <h2 class="text-center mb-3">
            ${rol === 'admin' ? 'Gestión de Citas Médicas' : 'Agenda de Citas'}
          </h2>

          <div class="text-center mb-4">
            <a href="/registrar-cita" class="btn btn-success">
              <i class="bi bi-calendar-plus"></i>
              Nueva cita
            </a>
          </div>

          <form class="row g-3 mb-4 justify-content-center">
            <div class="col-md-4">
              <input type="date"
                     name="fecha"
                     class="form-control"
                     value="${fecha || ''}">
            </div>
            <div class="col-md-2">
              <button class="btn btn-primary w-100">
                Filtrar
              </button>
            </div>
          </form>

          <div class="table-responsive">
            <table class="table table-striped table-bordered text-center align-middle">
              <thead class="table-dark">
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Consultorio</th>
                  <th>Urgencia</th>
                  <th>Estado</th>
                  ${rol === 'admin' ? '<th>Enfermero</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${filas || '<tr><td colspan="8">No hay citas</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="text-center mt-4">
            <a href="/" class="btn btn-secondary">
              Volver
            </a>
          </div>

        </div>
      `;

      res.send(renderPage(req, 'Agenda Médica', contenido));
    });
  }
);


app.get(
  '/registrar-cita',
  requireLogin,
  requireRole(['admin', 'medico', 'enfermero']),
  (req, res) => {

    const sqlPacientes = 'SELECT id, nombre FROM pacientes';
    const sqlMedicos = 'SELECT id, nombre FROM medicos';
    const sqlConsultorios = 'SELECT id, nombre FROM consultorios';

    connection.query(sqlPacientes, (err, pacientes) => {
      if (err) return res.send('Error al cargar pacientes');

      connection.query(sqlMedicos, (err, medicos) => {
        if (err) return res.send('Error al cargar médicos');

        connection.query(sqlConsultorios, (err, consultorios) => {
          if (err) return res.send('Error al cargar consultorios');

          const opcionesPacientes = pacientes
            .map(p => `<option value="${p.id}">${p.nombre}</option>`)
            .join('');

          const opcionesMedicos = medicos
            .map(m => `<option value="${m.id}">${m.nombre}</option>`)
            .join('');

          const opcionesConsultorios = consultorios
            .map(c => `<option value="${c.id}">${c.nombre}</option>`)
            .join('');

          const contenido = `
            <div class="container mt-4" style="max-width: 700px">

              <h2 class="text-center mb-4">
                <i class="bi bi-calendar-plus"></i>
                Registrar nueva cita
              </h2>

              <form action="/registrar-cita" method="POST"
                    class="card p-4 shadow row g-3">

                <div class="col-md-6">
                  <label class="form-label">Paciente</label>
                  <select name="paciente_id" class="form-select" required>
                    ${opcionesPacientes}
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Médico</label>
                  <select name="medico_id" class="form-select" required>
                    ${opcionesMedicos}
                  </select>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Consultorio</label>
                  <select name="consultorio_id" class="form-select" required>
                    ${opcionesConsultorios}
                  </select>
                </div>

                <div class="col-md-3">
                  <label class="form-label">Fecha</label>
                  <input type="date" name="fecha"
                         class="form-control" required>
                </div>

                <div class="col-md-3">
                  <label class="form-label">Hora</label>
                  <input type="time" name="hora"
                         class="form-control" required>
                </div>

                <div class="col-md-6">
                  <label class="form-label">Urgencia</label>
                  <select name="urgencia" class="form-select">
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div class="col-12 text-center mt-3">
                  <button class="btn btn-success">
                    Guardar cita
                  </button>

                  <a href="/buscar-citas-medico"
                     class="btn btn-secondary ms-2">
                    Cancelar
                  </a>
                </div>

              </form>
            </div>
          `;

          res.send(renderPage(req, 'Registrar Cita', contenido));
        });
      });
    });
  }
);

app.post(
  '/registrar-cita',
  requireLogin,
  requireRole(['admin', 'medico', 'enfermero']),
  (req, res) => {

    const {
      paciente_id,
      medico_id,
      consultorio_id,
      fecha,
      hora,
      urgencia
    } = req.body;

    const sql = `
      INSERT INTO citas
      (paciente_id, medico_id, consultorio_id, fecha, hora, urgencia)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    connection.query(
      sql,
      [
        paciente_id,
        medico_id,
        consultorio_id,
        fecha,
        hora,
        urgencia
      ],
      err => {
        if (err) {
          console.error(err);
          return res.send(
            mensajeHTML(
              'Error',
              'No se pudo registrar la cita.',
              'danger',
              '/buscar-citas-medico'
            )
          );
        }

        res.redirect('/buscar-citas-medico');
      }
    );
  }
);

app.get( '/actualizar-estado-cita/:id',
  requireLogin,
  requireRole(['admin']),
  (req, res) => {

    const { id } = req.params;

    const sql = `
      SELECT id, estado, urgencia
      FROM citas
      WHERE id = ?
    `;

    connection.query(sql, [id], (err, rows) => {
      if (err || rows.length === 0) {
        return res.send(
          mensajeHTML(
            'Error',
            'Cita no encontrada.',
            'danger',
            '/buscar-citas-medico'
          )
        );
      }

      const c = rows[0];

      const contenido = `
        <div class="container mt-5" style="max-width: 500px">

          <h3 class="text-center mb-4">
            <i class="bi bi-pencil-square"></i>
            Actualizar cita
          </h3>

          <form action="/actualizar-estado-cita/${c.id}"
                method="POST"
                class="card p-4 shadow">

            <!-- ===== ESTADO ===== -->
            <h6 class="mb-2">Estado actual</h6>
            <p>
              <span class="badge bg-secondary">${c.estado}</span>
            </p>

            <div class="d-flex justify-content-center gap-2 mb-4">
              <button name="estado" value="programada"
                class="btn btn-outline-primary btn-sm">
                Programada
              </button>

              <button name="estado" value="cancelada"
                class="btn btn-outline-danger btn-sm">
                Cancelada
              </button>

              <button name="estado" value="finalizada"
                class="btn btn-outline-success btn-sm">
                Finalizada
              </button>
            </div>

            <hr>

            <!-- ===== URGENCIA ===== -->
            <h6 class="mb-2">Urgencia actual</h6>
            <p>
              <span class="badge bg-warning text-dark">${c.urgencia}</span>
            </p>

            <div class="d-flex justify-content-center gap-2">
              <button name="urgencia" value="baja"
                class="btn btn-success btn-sm">
                Baja
              </button>

              <button name="urgencia" value="media"
                class="btn btn-warning btn-sm">
                Media
              </button>

              <button name="urgencia" value="alta"
                class="btn btn-danger btn-sm">
                Alta
              </button>
            </div>

            <div class="text-center mt-4">
              <a href="/buscar-citas-medico"
                 class="btn btn-secondary btn-sm">
                Volver
              </a>
            </div>

          </form>
        </div>
      `;

      res.send(renderPage(req, 'Actualizar cita', contenido));
    });
  }
);

app.post(
  '/actualizar-estado-cita/:id',
  requireLogin,
  requireRole('admin'),
  (req, res) => {

    const { id } = req.params;
    const { estado, urgencia } = req.body;

    // 🔹 Solo se actualiza lo que venga
    let sql = 'UPDATE citas SET ';
    const params = [];

    if (estado) {
      sql += 'estado = ?';
      params.push(estado);
    }

    if (urgencia) {
      if (params.length > 0) sql += ', ';
      sql += 'urgencia = ?';
      params.push(urgencia);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    connection.query(sql, params, (err, result) => {
      if (err) {
        console.error(err);
        return res.send(
          mensajeHTML(
            'Error',
            'No se pudo actualizar la cita',
            'danger'
          )
        );
      }

      res.redirect('/buscar-citas-medico');
    });
  }
);



//Consultorios
app.get(
  '/registrar-consultorio',
  requireLogin,
  requireRole(['admin']),
  (req, res) => {

    const contenido = `
      <div class="container mt-4" style="max-width:600px">

        <h2 class="text-center mb-4">
          <i class="bi bi-building-add"></i>
          Registrar Consultorio
        </h2>

        <form action="/registrar-consultorio" method="POST"
              class="card p-4 shadow">

          <div class="mb-3">
            <label class="form-label">Nombre del consultorio</label>
            <input name="nombre" class="form-control" required>
          </div>

          <div class="mb-3">
            <label class="form-label">Ubicación</label>
            <input name="ubicacion" class="form-control">
          </div>

          <div class="mb-3">
            <label class="form-label">Estado inicial</label>
            <select name="estado" class="form-select">
              <option value="disponible">Disponible</option>
              <option value="ocupado">Ocupado</option>
              <option value="limpieza">Limpieza</option>
            </select>
          </div>

          <div class="text-center">
            <button class="btn btn-success px-4">
              <i class="bi bi-save"></i> Guardar
            </button>

            <a href="/ver-consultorios"
               class="btn btn-secondary ms-2 px-4">
              Cancelar
            </a>
          </div>

        </form>
      </div>
    `;

    res.send(renderPage(req, 'Registrar Consultorio', contenido));
  }
);

app.post(
  '/registrar-consultorio',
  requireLogin,
  requireRole(['admin']),
  (req, res) => {

    const { nombre, ubicacion, estado } = req.body;

    const sql = `
      INSERT INTO consultorios
      (nombre, ubicacion, estado)
      VALUES (?, ?, ?)
    `;

    connection.query(
      sql,
      [nombre, ubicacion, estado],
      err => {
        if (err) {
          console.error(err);
          return res.send(
            mensajeHTML(
              'Error',
              'No se pudo registrar el consultorio.',
              'danger',
              '/ver-consultorios'
            )
          );
        }

        res.redirect('/ver-consultorios');
      }
    );
  }
);

app.get(
  '/ver-consultorios',
  requireLogin,
  requireRole(['admin','enfermero','medico']),
  (req, res) => {

    const sql = `
      SELECT id, nombre, ubicacion, estado
      FROM consultorios
      ORDER BY nombre
    `;

    connection.query(sql, (err, consultorios) => {
      if (err) {
        console.error(err);
        return res.send(
          mensajeHTML(
            'Error',
            'No se pudieron cargar los consultorios.',
            'danger',
            '/'
          )
        );
      }

      const filas = consultorios.map(c => {

        const badge =
          c.estado === 'ocupado' ? 'danger' :
          c.estado === 'limpieza' ? 'warning text-dark' :
          'success';

        return `
          <tr class="text-center align-middle">
            <td>${c.nombre}</td>
            <td>${c.ubicacion || '-'}</td>
            <td>
              <span class="badge bg-${badge}">
                ${c.estado}
              </span>
            </td>

            ${
              req.session.user.tipo_usuario === 'admin'
                ? `
                  <td>
                    <form action="/actualizar-estado-consultorio/${c.id}"
                          method="POST"
                          class="d-flex justify-content-center gap-2">

                      <select name="estado"
                              class="form-select form-select-sm w-auto">
                        <option value="disponible">Disponible</option>
                        <option value="ocupado">Ocupado</option>
                        <option value="limpieza">Limpieza</option>
                      </select>

                      <button class="btn btn-sm btn-primary">
                        Guardar
                      </button>
                    </form>
                  </td>
                `
                : '<td>-</td>'
            }
          </tr>
        `;
      }).join('');

      const contenido = `
        <h2 class="text-center mb-4">
          <i class="bi bi-building"></i>
          Consultorios
        </h2>

        <div class="table-responsive">
          <table class="table table-striped table-hover">
            <thead class="table-dark text-center">
              <tr>
                <th>Consultorio</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${filas || '<tr><td colspan="4">No hay consultorios</td></tr>'}
            </tbody>
          </table>
        </div>
      `;

      res.send(renderPage(req, 'Consultorios', contenido));
    });
  }
);

app.post(
  '/actualizar-estado-consultorio/:id',
  requireLogin,
  requireRole(['admin']),
  (req, res) => {

    const { id } = req.params;
    const { estado } = req.body;

    connection.query(
      'UPDATE consultorios SET estado = ? WHERE id = ?',
      [estado, id],
      err => {
        if (err) {
          console.error(err);
          return res.send(
            mensajeHTML(
              'Error',
              'No se pudo actualizar el estado.',
              'danger',
              '/ver-consultorios'
            )
          );
        }

        res.redirect('/ver-consultorios');
      }
    );
  }
);

// Ruta para que un paciente vea sus propios datos
app.get(
  '/ver-mis-datos',
  requireLogin,
  requireRole(['admin', 'medico', 'enfermero', 'paciente']),
  (req, res) => {

    const { id, tipo_usuario, nombre_usuario } = req.session.user;

    /* ================= ADMIN ================= */
    if (tipo_usuario === 'admin') {

      const contenido = `
        <div class="container mt-5">
          <div class="card shadow">
            <div class="card-header bg-danger text-white text-center">
              <h4>Administrador</h4>
            </div>
            <div class="card-body fs-5">
              <p><strong>ID:</strong> ${id}</p>
              <p><strong>Usuario:</strong> ${nombre_usuario}</p>
              <span class="badge bg-danger">Admin</span>
            </div>
          </div>
        </div>
      `;

      return res.send(renderPage(req, 'Mis Datos', contenido));
    }

    /* ================= MÉDICO ================= */
    if (tipo_usuario === 'medico') {

      const sql = `
        SELECT nombre, especialidad
        FROM medicos
        WHERE usuario_id = ?
      `;

      connection.query(sql, [id], (err, rows) => {
        if (err || rows.length === 0) {
          return res.send(
            mensajeHTML('Sin datos', 'No se encontraron datos del médico.', 'warning')
          );
        }

        const m = rows[0];

        res.send(renderPage(req, 'Mis Datos', `
          <div class="container mt-5">
            <div class="card shadow">
              <div class="card-header bg-primary text-white text-center">
                <h4>Médico</h4>
              </div>
              <div class="card-body fs-5">
                <p><strong>Nombre:</strong> ${m.nombre}</p>
                <p><strong>Especialidad:</strong> ${m.especialidad}</p>
              </div>
            </div>
          </div>
        `));
      });

      return;
    }

    /* ================= ENFERMERO ================= */
    if (tipo_usuario === 'enfermero') {

      const sql = `
        SELECT nombre, turno
        FROM enfermeros
        WHERE usuario_id = ?
      `;

      connection.query(sql, [id], (err, rows) => {
        if (err || rows.length === 0) {
          return res.send(
            mensajeHTML('Sin datos', 'No se encontraron datos del enfermero.', 'warning')
          );
        }

        const e = rows[0];

        res.send(renderPage(req, 'Mis Datos', `
          <div class="container mt-5">
            <div class="card shadow">
              <div class="card-header bg-success text-white text-center">
                <h4>Enfermería</h4>
              </div>
              <div class="card-body fs-5">
                <p><strong>Nombre:</strong> ${e.nombre}</p>
                <p><strong>Turno:</strong> ${e.turno}</p>
              </div>
            </div>
          </div>
        `));
      });

      return;
    }

    /* ================= PACIENTE (SOLO CITA) ================= */
    if (tipo_usuario === 'paciente') {

const sql = `
  SELECT 
    c.fecha,
    c.hora,
    c.estado,
    m.nombre AS medico
  FROM citas c
  JOIN medicos m ON c.medico_id = m.id
  JOIN pacientes p ON c.paciente_id = p.id
  WHERE p.usuario_id = ?
    AND c.fecha >= CURDATE()
  ORDER BY c.fecha ASC, c.hora ASC
  LIMIT 1
`;

  connection.query(sql, [id], (err, rows) => {
    if (err || rows.length === 0) {
      return res.send(
        mensajeHTML(
          'Sin citas',
          'No tienes citas programadas.',
          'info',
          '/'
        )
      );
    }

    const c = rows[0];

    const contenido = `
      <div class="container mt-5">
        <div class="card shadow">
          <div class="card-header bg-info text-white text-center">
            <h4>Mi próxima cita</h4>
          </div>
          <div class="card-body fs-5">
            <p><strong>Fecha:</strong>  ${new Date(c.fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}</p>
            <p><strong>Hora:</strong> ${c.hora}</p>
            <p><strong>Médico:</strong> ${c.medico}</p>
            <p>
              <strong>Estado:</strong>
              <span class="badge bg-primary">${c.estado}</span>
            </p>
          </div>
        </div>
      </div>
      <div class="text-center mt-4">
  <a href="/descargar-cita-pdf"
     class="btn btn-outline-danger">
    <i class="bi bi-file-earmark-pdf"></i>
    Descargar comprobante de cita
  </a>
</div>

    `;

    res.send(renderPage(req, 'Mi cita', contenido));
  });

       return;
    }
  }
);

app.get(
  '/descargar-cita-pdf',
  requireLogin,
  requireRole(['paciente']),
  (req, res) => {

    const usuarioId = req.session.user.id;

    const sql = `
      SELECT 
        c.fecha,
        c.hora,
        c.estado,
        m.nombre AS medico
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN medicos m ON c.medico_id = m.id
      WHERE p.usuario_id = ?
      ORDER BY c.fecha ASC, c.hora ASC
      LIMIT 1
    `;

    connection.query(sql, [usuarioId], (err, rows) => {
      if (err || rows.length === 0) {
        return res.send(
          mensajeHTML(
            'Sin citas',
            'No hay información de cita para descargar.',
            'warning',
            '/'
          )
        );
      }

      const c = rows[0];

      const doc = new PDFDocument({ margin: 50 });

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="cita-medica.pdf"'
      );
      res.setHeader('Content-Type', 'application/pdf');

      doc.pipe(res);

      /* ========= LOGO DEL HOSPITAL ========= */
      const logoPath = path.join(__dirname, 'public/img/logo-hospital.png');

      doc.image(logoPath, {
        fit: [120, 120],
        align: 'center'
      });

      doc.moveDown(2);

      /* ========= TÍTULOS ========= */
      doc
        .fontSize(18)
        .text('Cruz Roja', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(14)
        .text('Comprobante de Cita Médica', { align: 'center' })
        .moveDown(2);

      /* ========= DATOS DE LA CITA ========= */
      doc.fontSize(12);

      doc.text(`Fecha: ${new Date(c.fecha).toLocaleDateString('es-MX')}`);
      doc.text(`Hora: ${c.hora}`);
      doc.text(`Médico: ${c.medico}`);
      doc.text(`Estado: ${c.estado}`);

      doc.moveDown(3);

      doc
        .fontSize(10)
        .text(
          'Este documento es un comprobante informativo de su cita médica.',
          { align: 'center' }
        );

      doc.end();
    });
  }
);

// Ruta para ver datos de un paciente específico
app.get(
  '/ver-datos-paciente/:id',
  requireLogin,
  requireRole(['admin', 'medico', 'enfermero', 'paciente']),
  (req, res) => {

    const { id } = req.params;

    const sql = `
      SELECT
        p.*,
        c.fecha AS fecha_cita,
        c.hora AS hora_cita,
        c.estado AS estado_cita
      FROM pacientes p
      LEFT JOIN citas c ON c.paciente_id = p.id
      WHERE p.id = ?
      ORDER BY c.fecha DESC
      LIMIT 1
    `;

    connection.query(sql, [id], (err, results) => {

      if (err || results.length === 0) {
        return res.send(
          mensajeHTML(
            'Sin datos',
            'Paciente no encontrado.',
            'warning',
            '/ver-pacientes'
          )
        );
      }

      const p = results[0];

      const contenido = `
        <div class="container mt-5">

          <div class="row justify-content-center">
            <div class="col-md-7">

              <div class="card shadow-lg">

                <div class="card-header bg-danger text-white text-center">
                  <h4>
                    <i class="bi bi-person-circle"></i>
                    Datos del Paciente
                  </h4>
                </div>

                <div class="card-body fs-5">

                  <p><strong>ID:</strong> ${p.id}</p>
                  <p><strong>Nombre:</strong> ${p.nombre}</p>
                  <p><strong>Edad:</strong> ${p.edad}</p>
                  <p><strong>Género:</strong> ${p.genero}</p>
                  <p><strong>Teléfono:</strong> ${p.telefono || '-'}</p>
                  <p><strong>Correo:</strong> ${p.correo || '-'}</p>
                  <p><strong>Tipo de paciente:</strong>
                    <span class="badge bg-primary">${p.tipo_paciente}</span>
                  </p>

                  <hr>

                  <h5 class="mt-3">
                    <i class="bi bi-calendar-heart"></i>
                    Última cita médica
                  </h5>

                  ${
                    p.fecha_cita
                      ? `
                        <p><strong>Fecha:</strong> ${p.fecha_cita}</p>
                        <p><strong>Hora:</strong> ${p.hora_cita}</p>
                        <p><strong>Estado:</strong>
                          <span class="badge bg-info">${p.estado_cita}</span>
                        </p>
                      `
                      : '<p class="text-muted">Sin citas registradas</p>'
                  }

                </div>

                <div class="card-footer text-center">
                  <a href="/ver-pacientes" class="btn btn-secondary">
                    <i class="bi bi-arrow-left"></i> Volver
                  </a>
                </div>

              </div>

            </div>
          </div>

        </div>
      `;

      res.send(renderPage(req, 'Datos del Paciente', contenido));
    });
  }
);






// Ruta para ordenar pacientes por frecuencia cardiaca
app.get('/ordenar-citas', requireLogin,  requireRole(['admin', 'medico']),
  (req, res) => {

    const criterio = req.query.orden || 'hora';

    let sql = `
      SELECT 
        c.fecha,
        c.hora,
        c.urgencia,
        p.nombre AS paciente,
        m.nombre AS medico,
        con.nombre AS consultorio
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN medicos m ON c.medico_id = m.id
      JOIN consultorios con ON c.consultorio_id = con.id
    `;

    if (criterio === 'urgencia') {
      sql += ` ORDER BY 
        FIELD(c.urgencia, 'alta', 'media', 'baja')`;
    } else {
      sql += ' ORDER BY c.hora ASC';
    }

    connection.query(sql, (err, results) => {
      if (err) {
        console.error(err);
        return res.send('Error al obtener las citas.');
      }

      let filas = '';
      results.forEach(c => {

        const badge =
          c.urgencia === 'alta' ? 'danger' :
          c.urgencia === 'media' ? 'warning' : 'success';

        filas += `
          <tr>
            <td> ${new Date(c.fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}</td>
            <td>${c.hora}</td>
            <td>${c.paciente}</td>
            <td>${c.medico}</td>
            <td>${c.consultorio}</td>
            <td><span class="badge bg-${badge}">${c.urgencia}</span></td>
          </tr>
        `;
      });

      const contenido = `
        <div class="container mt-4">

          <h2 class="text-center mb-4">Agenda de Citas Médicas</h2>

          <div class="d-flex justify-content-center gap-3 mb-3">
            <a href="/ordenar-citas?orden=hora" class="btn btn-primary">
              Ordenar por Hora
            </a>
            <a href="/ordenar-citas?orden=urgencia" class="btn btn-danger">
              Ordenar por Urgencia
            </a>
          </div>

          <div class="table-responsive">
            <table class="table table-bordered table-striped table-hover text-center">
              <thead class="table-dark">
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Consultorio</th>
                  <th>Urgencia</th>
                </tr>
              </thead>
              <tbody>
                ${filas}
              </tbody>
            </table>
          </div>

          <div class="text-center mt-4">
            <a href="/" class="btn btn-secondary">Volver</a>
          </div>

        </div>
      `;

      res.send(renderPage(req, 'Citas Médicas', contenido));
    });
  }
);

app.get('/descargar-citas-pdf',requireLogin, (req, res) => {
    const rol = req.session.user.tipo_usuario;
    const usuario = req.session.user.nombre_usuario;

    let sql = `
      SELECT
        c.fecha,
        c.hora,
        c.urgencia,
        c.estado,
        p.nombre AS paciente,
        m.nombre AS medico,
        con.nombre AS consultorio
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN medicos m ON c.medico_id = m.id
      JOIN consultorios con ON c.consultorio_id = con.id
      WHERE 1=1
    `;

    const params = [];

    // 🔒 Filtros por rol
    if (rol === 'paciente') {
      sql += ' AND p.nombre = ?';
      params.push(usuario);
    }

    if (rol === 'medico') {
      sql += ' AND m.nombre = ?';
      params.push(usuario);
    }

    sql += ' ORDER BY c.fecha ASC, c.hora ASC';

    connection.query(sql, params, (err, results) => {
      if (err) {
        console.error(err);
        return res.send('Error al generar PDF.');
      }

      const doc = new PDFDocument({ margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=citas_medicas.pdf');

      doc.pipe(res);

      // 🏥 Encabezado
      doc.fontSize(18).text('Citas Médicas', { align: 'center' });
      doc.moveDown();

      results.forEach((c, i) => {
        doc
          .fontSize(12)
          .text(`Cita ${i + 1}`)
          .text(`Fecha:  ${new Date(c.fecha).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`)
          .text(`Hora: ${c.hora}`)
          .text(`Paciente: ${c.paciente}`)
          .text(`Médico: ${c.medico}`)
          .text(`Consultorio: ${c.consultorio}`)
          .text(`Urgencia: ${c.urgencia}`)
          .text(`Estado: ${c.estado}`)
          .moveDown();
      });

      doc.end();
    });
  }
);

app.post('/crear-cita', requireLogin, requireRole(['medico', 'enfermero', 'admin']), (req, res) => {
    const {
      paciente_id,
      medico_id,
      consultorio_id,
      fecha,
      hora,
      urgencia
    } = req.body;

    const sql = `
      INSERT INTO citas
      (paciente_id, medico_id, consultorio_id, fecha, hora, urgencia)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    connection.query(
      sql,
      [paciente_id, medico_id, consultorio_id, fecha, hora, urgencia],
      err => {
        if (err) {
          console.error(err);
          return res.send('Error al crear la cita.');
        }
        res.redirect('/buscar-citas-medico');
      }
    );
  }
);

app.get(
  '/asignar-enfermero/:citaId',
  requireLogin,
  requireRole(['admin']),
  (req, res) => {

    const citaId = req.params.citaId;

    const sqlCita = `
      SELECT 
        c.id,
        c.fecha,
        c.hora,
        p.nombre AS paciente
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = ?
    `;

    const sqlEnfermeros = `
      SELECT id, nombre, turno
      FROM enfermeros
      WHERE activo = 1
    `;

    connection.query(sqlCita, [citaId], (err, citaRows) => {
      if (err || citaRows.length === 0) {
        return res.send(
          mensajeHTML('Error', 'Cita no encontrada', 'danger', '/buscar-citas-medico')
        );
      }

      connection.query(sqlEnfermeros, (err, enfermeros) => {
        if (err) {
          return res.send(
            mensajeHTML('Error', 'No se pudieron cargar enfermeros', 'danger')
          );
        }

        const opciones = enfermeros.map(e => `
          <option value="${e.id}">
            ${e.nombre} (${e.turno})
          </option>
        `).join('');

        const c = citaRows[0];

        const contenido = `
          <div class="container mt-4">
            <h3 class="mb-3 text-center">Asignar enfermero a cita</h3>

            <div class="card shadow">
              <div class="card-body">

                <p><strong>Paciente:</strong> ${c.paciente}</p>
                <p><strong>Fecha:</strong> ${new Date(c.fecha).toLocaleDateString('es-MX')}</p>
                <p><strong>Hora:</strong> ${c.hora}</p>

                <form method="POST" action="/asignar-enfermero/${citaId}">
                  <div class="mb-3">
                    <label class="form-label">Enfermero</label>
                    <select name="enfermero_id" class="form-select" required>
                      <option value="">Seleccione...</option>
                      ${opciones}
                    </select>
                  </div>

                  <div class="text-center">
                    <button class="btn btn-success">
                      <i class="bi bi-person-check"></i>
                      Asignar
                    </button>
                    <a href="/buscar-citas-medico" class="btn btn-secondary ms-2">
                      Cancelar
                    </a>
                  </div>
                </form>

              </div>
            </div>
          </div>
        `;

        res.send(renderPage(req, 'Asignar enfermero', contenido));
      });
    });
  }
);
app.post(
  '/asignar-enfermero/:citaId',
  requireLogin,
  requireRole(['admin']),
  (req, res) => {

    const citaId = req.params.citaId;
    const { enfermero_id } = req.body;

    const sql = `
      UPDATE citas
      SET enfermero_id = ?
      WHERE id = ?
    `;

    connection.query(sql, [enfermero_id, citaId], err => {
      if (err) {
        return res.send(
          mensajeHTML(
            'Error',
            'No se pudo asignar el enfermero',
            'danger'
          )
        );
      }

      res.send(
        mensajeHTML(
          'Asignado',
          'El enfermero fue asignado correctamente',
          'success',
          '/buscar-citas-medico'
        )
      );
    });
  }
);


app.post('/upload-medicos',requireLogin,requireRole('admin'), upload.single('excelFile'),(req, res) => {
    const workbook = xlsx.readFile(req.file.path);
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    data.forEach(m => {
      connection.query(
        'INSERT INTO medicos (nombre, especialidad) VALUES (?, ?)',
        [m.nombre, m.especialidad]
      );
    });

    res.redirect('/medicos');
});

app.get('/download-medicos', requireLogin, requireRole('admin'),(req, res) => {
    connection.query('SELECT * FROM medicos', (err, results) => {
      const ws = xlsx.utils.json_to_sheet(results);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Medicos');

      const filePath = path.join(__dirname,'uploads','medicos.xlsx');
      xlsx.writeFile(wb, filePath);
      res.download(filePath);
    });
});

app.post('/upload-pacientes',requireLogin,requireRole(['admin','medico']), upload.single('excelFile'),(req, res) => {
    const workbook = xlsx.readFile(req.file.path);
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    data.forEach(p => {
      connection.query(
        'INSERT INTO pacientes (nombre, edad, frecuencia_cardiaca) VALUES (?, ?, ?)',
        [p.nombre, p.edad, p.frecuencia_cardiaca]
      );
    });

    res.redirect('/ver-pacientes');
});
app.get('/download-pacientes', requireLogin,requireRole(['admin','medico']), (req, res) => {
    connection.query('SELECT * FROM pacientes', (err, results) => {
      const ws = xlsx.utils.json_to_sheet(results);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Pacientes');

      const filePath = path.join(__dirname,'uploads','pacientes.xlsx');
      xlsx.writeFile(wb, filePath);
      res.download(filePath);
    });
});


// Ruta para obtener el tipo de usuario actual
app.get('/tipo-usuario', requireLogin, (req, res) => {
  res.json({
    tipo_usuario: req.session.user.tipo_usuario,
    nombre_usuario: req.session.user.nombre_usuario
  });
});


// Registro de usuario
app.post('/registro', async (req, res) => {
  const { username, password, codigo_acceso, from } = req.body;

  // 🔒 Seguridad: solo admin puede registrar desde panel
  if (from === 'admin') {
    if (!req.session.user || req.session.user.tipo_usuario !== 'admin') {
      return res.status(403).send('Acceso no autorizado');
    }
  }

  // 1️⃣ Verificar código de acceso
  const sqlCodigo = 'SELECT tipo_usuario FROM codigos_acceso WHERE codigo = ?';

  connection.query(sqlCodigo, [codigo_acceso], async (err, results) => {
    if (err) {
      console.error(err);
      return res.send(mensajeHTML('Error interno','No se pudo verificar el código.','danger')
);
    }

    if (results.length === 0) {
      return res.send(
        mensajeHTML(
          'Código inválido',
          'El código de acceso no existe.',
          'danger'
        )
      );
    }
    const tipo_usuario = results[0].tipo_usuario;

    try {
      const password_hash = await bcrypt.hash(password, 10);

      const sqlInsert = `
        INSERT INTO usuarios (nombre_usuario, password_hash, tipo_usuario)
        VALUES (?, ?, ?)
      `;

      connection.query(sqlInsert, [username, password_hash, tipo_usuario], err2 => {
        if (err2) {
          if (err2.code === 'ER_DUP_ENTRY') {
            return res.send(
              mensajeHTML(
                'Usuario duplicado',
                `El usuario <b>${username}</b> ya existe.`,
                'warning'
              )
            );
          }

          console.error(err2);
          return res.send(
            mensajeHTML(
              'Error',
              'No se pudo registrar el usuario.',
              'danger'
            )
          );
        }

        // ✅ Redirección final
        if (from === 'admin') {
          res.redirect('/gestionar-registros');
        } else {
          res.redirect('/login.html');
        }
      });

    } catch (error) {
      console.error(error);
      return res.send(
        mensajeHTML(
          'Error',
          'No se pudo procesar la contraseña.',
          'danger'
        )
      );
    }
  });
});


// Iniciar sesión
app.post('/login', (req, res) => {
  const { nombre_usuario, password } = req.body;

  const query = 'SELECT * FROM usuarios WHERE nombre_usuario = ?';
  connection.query(query, [nombre_usuario], (err, results) => {
    if (err) {
      console.error(err);
      return res.send(
        mensajeHTML('Error', 'Error al intentar iniciar sesión.', 'danger', '/login.html')
      );
    }

    if (results.length === 0) {
      return res.send(
        mensajeHTML('Usuario no encontrado', 'El usuario no existe.', 'warning', '/login.html')
      );
    }

    const user = results[0];
    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);

    if (!isPasswordValid) {
      return res.send(
        mensajeHTML('Contraseña incorrecta', 'La contraseña no es válida.', 'danger', '/login.html')
      );
    }

    // Guardar sesión
    req.session.user = {
      id: user.id,
      nombre_usuario: user.nombre_usuario,
      tipo_usuario: user.tipo_usuario
    };

    res.redirect('/index.html');
  });
});


// Cerrar sesión
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

// Ruta para que solo admin pueda ver todos los usuarios
app.get('/ver-usuarios', requireLogin, requireRole('admin'), (req, res) => {
    connection.query('SELECT * FROM usuarios', (err, results) => {
      if (err) {
        return res.send(
          mensajeHTML('Error', 'No se pudieron obtener los usuarios.', 'danger', '/')
        );
      }

      let filas = '';
      results.forEach(u => {
        filas += `
          <tr>
            <td>${u.nombre_usuario}</td>
            <td>
              <span class="badge bg-secondary text-uppercase">
                ${u.tipo_usuario}
              </span>
            </td>
          </tr>
        `;
      });

      const contenido = `
        <div class="container mt-4">

          <h2 class="text-center mb-4">
            <i class="bi bi-people"></i> Usuarios del sistema
          </h2>

          <div class="table-responsive">
            <table class="table table-bordered table-striped text-center">
              <thead class="table-dark">
                <tr>
                  <th>Nombre</th>
                  <th>Tipo de usuario</th>
                </tr>
              </thead>
              <tbody>
                ${filas}
              </tbody>
            </table>
          </div>

          <div class="text-center mt-3">
            <a href="/" class="btn btn-secondary">Volver</a>
          </div>

        </div>
      `;

      res.send(renderPage(req, 'Usuarios', contenido));
    });
});
// Iniciar el servidor
const port = process.env.PORT || 3000; // Puerto desde .env o valor por defecto

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});