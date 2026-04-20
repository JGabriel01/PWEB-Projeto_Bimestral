require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const sequelize = require('./database/db');
const { autenticar } = require('./middleware/autenticacao');

// --- IMPORTAÇÃO DOS MODELOS ---
const Autor = require('./models/Autor');
const Livro = require('./models/Livro');
const Membro = require('./models/Membro');
const Emprestimo = require('./models/Emprestimo');

// --- IMPORTAÇÃO DAS ROTAS ---
const autorRoutes = require('./routes/autorRoutes');
const livroRoutes = require('./routes/livroRoutes');
const membroRoutes = require('./routes/membroRoutes');
const emprestimoRoutes = require('./routes/emprestimoRoutes');

const app = express();

// Middleware para JSON
app.use(express.json());

// --- ROTA DE AUTENTICAÇÃO (PÚBLICA) ---
// POST /login - Rota para gerar token JWT
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;

    // Validação básica
    if (!usuario || !senha) {
        return res.status(400).json({ erro: 'Usuário e senha são obrigatórios' });
    }

    // Validação simples (em produção, verificar no banco de dados)
    if (usuario === 'admin' && senha === 'admin123') {
        const token = jwt.sign(
            { usuario: usuario, iat: Math.floor(Date.now() / 1000) },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        res.json({ token });
    } else {
        res.status(401).json({ erro: 'Credenciais inválidas' });
    }
});

// --- CONFIGURAÇÃO DOS RELACIONAMENTOS (MODELO ER) ---

/**
 * Relacionamento N:M (Muitos-para-Muitos) entre Livro e Autor
 * O alias 'autores' define o nome da função .setAutores() usada nas rotas.
 */
Livro.belongsToMany(Autor, { 
    through: 'LivroAutores', 
    as: 'autores', 
    foreignKey: 'livroId' 
});
Autor.belongsToMany(Livro, { 
    through: 'LivroAutores', 
    as: 'livros', 
    foreignKey: 'autorId' 
});

/**
 * Relacionamento 1:N (Um-para-Muitos) entre Livro e Empréstimo
 * Um livro pode estar em vários empréstimos.
 */
Livro.hasMany(Emprestimo, { 
    foreignKey: 'livroId', 
    onDelete: 'RESTRICT' 
});
Emprestimo.belongsTo(Livro, { 
    foreignKey: 'livroId' 
});

/**
 * Relacionamento 1:N (Um-para-Muitos) entre Membro e Empréstimo
 * Um membro pode realizar vários empréstimos.
 */
Membro.hasMany(Emprestimo, { 
    foreignKey: 'membroId', 
    onDelete: 'RESTRICT' 
});
Emprestimo.belongsTo(Membro, { 
    foreignKey: 'membroId' 
});

// --- REGISTRO DAS ROTAS ---
app.use(autorRoutes);
app.use(livroRoutes);
app.use(membroRoutes);
app.use(emprestimoRoutes);

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;

(async () => {
    try {
        // Verifica conexão com o banco
        await sequelize.authenticate();
        console.log('Conexão com o banco de dados estabelecida com sucesso.');

        /**
         * Sincroniza os modelos com o banco de dados.
         * alter: true atualiza as tabelas existentes sem apagar os dados, 
         * ideal para ajustar chaves estrangeiras e a tabela LivroAutores.
         */
        await sequelize.sync({ alter: true });
        console.log('Modelos sincronizados com o banco de dados.');

        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Não foi possível conectar ao banco de dados:', error);
    }
})();