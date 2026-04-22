require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const sequelize = require('./database/db');
const { autenticar, autenticarAdmin } = require('./middleware/autenticacao');

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
const perfilRoutes = require('./routes/perfilRoutes');

const app = express();

// Middleware para JSON
app.use(express.json());

// --- ROTA DE AUTENTICAÇÃO (PÚBLICA) ---
// POST /login - Rota para gerar token JWT com Membro real
app.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Validação básica
        if (!email || !senha) {
            return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
        }

        // Buscar membro no banco de dados
        const membro = await Membro.findOne({ where: { email } });

        if (!membro) {
            return res.status(401).json({ erro: 'Credenciais inválidas' });
        }

        // Comparar senha com bcrypt
        const senhaValida = await bcrypt.compare(senha, membro.senha);

        if (!senhaValida) {
            return res.status(401).json({ erro: 'Credenciais inválidas' });
        }

        // Gerar token JWT com dados reais do membro
        const token = jwt.sign(
            { 
                id: membro.id,
                nome: membro.nome,
                email: membro.email,
                role: membro.role,
                iat: Math.floor(Date.now() / 1000)
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({ 
            token,
            membro: {
                id: membro.id,
                nome: membro.nome,
                email: membro.email,
                role: membro.role
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

// --- ROTA PARA CRIAR ADMIN (DEVE SER FEITA UMA ÚNICA VEZ) ---
// POST /criar-admin - Criar um membro admin
app.post('/criar-admin', async (req, res) => {
    try {
        const { nome, email, senha, endereco } = req.body;

        // Validação básica
        if (!nome || !email || !senha) {
            return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
        }

        // Verificar se o email já existe
        const membroExistente = await Membro.findOne({ where: { email } });
        if (membroExistente) {
            return res.status(400).json({ erro: 'Email já cadastrado' });
        }

        // Criar membro com role 'admin'
        const membro = await Membro.create({
            nome,
            email,
            senha, // A senha é automaticamente hasheada pelo hook beforeCreate
            endereco, // Opcional
            role: 'admin'
        });

        res.status(201).json({ 
            mensagem: 'Admin criado com sucesso',
            membro: {
                id: membro.id,
                nome: membro.nome,
                email: membro.email,
                endereco: membro.endereco,
                role: membro.role
            }
        });
    } catch (error) {
        console.error('Erro ao criar admin:', error);
        res.status(500).json({ erro: error.message || 'Erro no servidor' });
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
app.use(perfilRoutes);

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