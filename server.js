// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const autorRoutes = require('./src/routes/autorRoutes');
const livroRoutes = require('./src/routes/livroRoutes');
const membroRoutes = require('./src/routes/membroRoutes');
const emprestimoRoutes = require('./src/routes/emprestimosRoutes');

const app = express();
// A porta do servidor será lida do .env, ou usará 3000 como fallback
const PORT = process.env.PORT || 3000;

// Middleware para parsear o body de requisições JSON
app.use(express.json());

// Rotas da API
app.use('/api/autores', autorRoutes);
app.use('/api/livros', livroRoutes);
app.use('/api/membros', membroRoutes);
app.use('/api/emprestimos', emprestimoRoutes);

// Rota de teste
app.get('/', (req, res) => {
    res.send('API de Biblioteca rodando!');
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});