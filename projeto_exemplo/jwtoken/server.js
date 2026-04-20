require('dotenv').config();

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const PORT = process.env.PORT;

// --- Banco de dados ---
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE,
  logging: false,
});

// --- Model Usuario ---
const Usuario = sequelize.define('Usuario', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  senha: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

// --- Middleware de autenticação ---
function autenticar(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

// --- Rotas ---

// POST /login — pública
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
  }

  const usuario = await Usuario.findOne({ where: { email } });

  if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({ token });
});

// GET /perfil — protegida
app.get('/perfil', autenticar, async (req, res) => {
  const usuario = await Usuario.findByPk(req.usuario.id, {
    attributes: ['id', 'nome', 'email'],
  });

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  res.json({ usuario });
});

// --- Inicialização ---
async function iniciar() {
  await sequelize.sync();

  // Seed: cria usuário de exemplo se não existir
  const existe = await Usuario.findOne({ where: { email: 'joao@email.com' } });
  if (!existe) {
    await Usuario.create({
      nome: 'João Silva',
      email: 'joao@email.com',
      senha: await bcrypt.hash('123456', 10),
    });
    console.log('Usuário de exemplo criado: joao@email.com / 123456');
  }

  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('  POST /login   — body: { "email": "...", "senha": "..." }');
    console.log('  GET  /perfil  — header: Authorization: Bearer <token>');
  });
}

iniciar();
